/**
 * Mission repository — Supabase read access for missions.
 * Maps generated DB rows to domain Mission types.
 *
 * Phase 0: Data correctness — no hardcoded/fallback values.
 */

import { supabase } from "@/lib/supabase";
import type { Mission, MissionDifficulty } from "@/types";
import type { Database } from "@/types/supabase.generated";
import { inferRegionFromCoords } from "@/domain/territorial";
import { computeLifecycleInfo } from "@/domain/lifecycle";
import { haversineDistance, type GeoCoords } from "@/domain/geo";
import {
  CATEGORY_LABEL,
  CATEGORY_TO_DB,
  dbCategoryEmoji,
  type DbCategory,
} from "@/domain/categories";
import { z } from "zod";

type DbMission = Database["public"]["Tables"]["missions"]["Row"];

const MISSION_ID_SCHEMA = z.string().uuid();

const DB_MISSION_SCHEMA = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  district: z.string().min(1),
  district_id: z.string().uuid().nullable().optional(),
  category: z.enum(["environment", "infrastructure", "community", "education", "health"]),
  latitude: z.number(),
  longitude: z.number(),
  created_at: z.string(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  current_progress: z.number().nullable().optional(),
  max_participants: z.number().nullable().optional(),
  xp_reward: z.number().int().nonnegative().optional(),
  organizer_id: z.string().uuid().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  impact: z.string().nullable().optional(),
});

function assertValidMissionId(missionId: string): void {
  const result = MISSION_ID_SCHEMA.safeParse(missionId);
  if (!result.success) {
    throw new Error(`Invalid mission ID: ${missionId}`);
  }
}

function parseDbMissionRow(row: DbMission): DbMission {
  const result = DB_MISSION_SCHEMA.safeParse(row);
  if (!result.success) {
    throw new Error(`Invalid mission row: ${result.error.message}`);
  }
  return row;
}

function formatMissionDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-PE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

async function resolveOrganizerForMission(
  missionId: string,
): Promise<{ name: string; avatar: string } | null> {
  try {
    const { data, error } = await supabase.rpc("get_mission_organizer_preview", {
      p_mission_id: missionId,
    });
    if (error || !data) return null;
    const row = Array.isArray(data) ? data[0] : data;
    const r = row as { first_name?: string | null; username?: string | null; avatar_url?: string | null };
    const name = r.first_name ?? r.username;
    if (!name) return null;
    return { name, avatar: r.avatar_url ?? "" };
  } catch {
    return null;
  }
}

async function resolveMissionDate(
  missionId: string,
  startDate: string | null,
): Promise<string | null> {
  if (startDate) {
    return formatMissionDate(startDate);
  }

  try {
    const { data: event } = await supabase
      .from("proposal_lifecycle_events")
      .select("proposal_id")
      .eq("converted_mission_id", missionId)
      .eq("event_type", "mission_created")
      .maybeSingle();

    if (!event) return null;

    const { data: proposal } = await supabase
      .from("proposals")
      .select("proposed_date")
      .eq("id", (event as { proposal_id: string }).proposal_id)
      .maybeSingle();

    if (proposal?.proposed_date) {
      return formatMissionDate(proposal.proposed_date);
    }
  } catch {
    // silent fallback
  }

  return null;
}

function mapRowToMission(
  row: DbMission,
  organizer: { name: string; avatar: string } | null,
  date: string | null,
  referenceCoords?: GeoCoords | null,
): Mission {
  const coords = { lat: row.latitude, lng: row.longitude };
  const region = inferRegionFromCoords(coords);
  const participants = row.current_progress ?? 0;
  const spotsLeft = row.max_participants != null
    ? Math.max(0, row.max_participants - participants)
    : null;
  const category = row.category as DbCategory;
  const startDate =
    "start_date" in row ? ((row as Record<string, unknown>).start_date as string | null) : null;
  const endDate =
    "end_date" in row ? ((row as Record<string, unknown>).end_date as string | null) : null;
  const rawDifficulty =
    "difficulty" in row ? ((row as Record<string, unknown>).difficulty as string | null) : null;
  const difficulty = isValidDifficulty(rawDifficulty) ? rawDifficulty : null;
  // TODO: migrate to find_nearby_missions RPC when batch distance queries are needed.
  // PostGIS is available in production (migration 20260611000000).
  const distanceKm =
    referenceCoords && coords.lat != null && coords.lng != null
      ? Math.round(haversineDistance(referenceCoords, coords) * 10) / 10
      : null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    district: row.district,
    districtId: ((row as Record<string, unknown>).district_id as string | null) ?? null,
    region,
    category: CATEGORY_LABEL[category],
    xp: row.xp_reward ?? null,
    participants,
    spotsLeft,
    date,
    distanceKm,
    impact: null,
    difficulty,
    startDate,
    endDate,
    lifecycleInfo: computeLifecycleInfo(startDate, endDate),
    organizer,
    coords,
    emoji: dbCategoryEmoji(category),
  };
}

function isValidDifficulty(v: string | null): v is MissionDifficulty {
  if (!v) return false;
  return ["Suave", "Andina", "Cumbre"].includes(v);
}

export const missionRepository = {
  async findAll(pg?: {
    limit?: number;
    offset?: number;
    referenceCoords?: GeoCoords;
  }): Promise<Mission[]> {
    const limit = pg?.limit ?? 100;
    const offset = pg?.offset ?? 0;
    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch missions: ${error.message}`);
    }

    const rows = (data ?? []).map(parseDbMissionRow);
    const missions = await resolveMissions(rows, pg?.referenceCoords);

    if (import.meta.env.DEV) {
      console.log(
        "[KUSQA MISSION TRACE] missionRepository.findAll: Retrieved",
        missions.length,
        "missions from Supabase",
      );
      missions.forEach((m) => {
        console.log("[KUSQA MISSION TRACE] Mission:", {
          id: m.id,
          title: m.title,
          region: m.region,
          category: m.category,
          coords: m.coords,
          district: m.district,
          participants: m.participants,
        });
      });
    }

    return missions;
  },

  async findById(missionId: string, referenceCoords?: GeoCoords): Promise<Mission | null> {
    assertValidMissionId(missionId);

    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .eq("id", missionId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch mission: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const rows = [parseDbMissionRow(data)];
    const missions = await resolveMissions(rows, referenceCoords);
    return missions[0] ?? null;
  },

  async findAllByIds(missionIds: string[], referenceCoords?: GeoCoords): Promise<Mission[]> {
    const uniqueIds = [...new Set(missionIds)];
    if (uniqueIds.length === 0) {
      return [];
    }

    uniqueIds.forEach(assertValidMissionId);

    const { data, error } = await supabase.from("missions").select("*").in("id", uniqueIds);

    if (error) {
      throw new Error(`Failed to fetch missions by ids: ${error.message}`);
    }

    const rows = data ?? [];
    if (rows.length !== uniqueIds.length) {
      const found = new Set(rows.map((row: DbMission) => row.id));
      const missing = uniqueIds.filter((id) => !found.has(id));
      throw new Error(`Missions not found: ${missing.join(", ")}`);
    }

    const parsed = rows.map(parseDbMissionRow);
    return resolveMissions(parsed, referenceCoords);
  },

  /**
   * Find missions by district. Prefers district_id FK when available,
   * falls back to text-based ILIKE for backward compatibility with
   * legacy rows that have NULL district_id.
   */
  async findByDistrict(
    displayName: string,
    slug: string,
    districtId?: string | null,
    pg?: { limit?: number; offset?: number; referenceCoords?: GeoCoords },
  ): Promise<Mission[]> {
    const limit = pg?.limit ?? 20;
    const offset = pg?.offset ?? 0;

    // When we have a district UUID, prefer FK-based query (indexed)
    if (districtId) {
      const { data, error } = await supabase
        .from("missions")
        .select("*")
        .eq("district_id", districtId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        if (import.meta.env.DEV) {
          console.error("[KUSQA MISSION TRACE] findByDistrict error:", error);
        }
        return [];
      }

      const rows = (data ?? []).map(parseDbMissionRow);
      return resolveMissions(rows, pg?.referenceCoords);
    }

    // Fallback to text-based ILIKE for legacy rows
    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .or(`district.ilike.${displayName},district.ilike.${slug}`)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA MISSION TRACE] findByDistrict error:", error);
      }
      return [];
    }

    const rows = (data ?? []).map(parseDbMissionRow);
    return resolveMissions(rows, pg?.referenceCoords);
  },

  async create(data: Omit<Mission, "id">): Promise<Mission> {
    const category = CATEGORY_TO_DB[data.category] ?? "community";
    const participants = data.participants ?? 0;
    const capacity = Math.max(participants + (data.spotsLeft ?? 0), participants, 1);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: inserted, error } = await supabase
      .from("missions")
      .insert({
        organizer_id: user?.id,
        title: data.title,
        description: data.description,
        district: data.district,
        district_id: data.districtId ?? null,
        latitude: data.coords.lat,
        longitude: data.coords.lng,
        category,
        max_participants: capacity,
        current_progress: participants,
        start_date: data.startDate ?? null,
        end_date: data.endDate ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create mission: ${error.message}`);
    }

    if (!inserted) {
      throw new Error("Failed to create mission: empty response");
    }

    const rows = [parseDbMissionRow(inserted)];
    const missions = await resolveMissions(rows);
    return missions[0];
  },
};

// ─── Batch resolution helpers ──────────────────────────────────────────────

async function resolveMissions(rows: DbMission[], referenceCoords?: GeoCoords): Promise<Mission[]> {
  if (rows.length === 0) return [];

  const entries = await Promise.all(
    rows.map(async (row) => {
      const [organizer, date] = await Promise.all([
        resolveOrganizerForMission(row.id),
        resolveMissionDate(row.id, row.start_date ?? null),
      ]);
      return { row, organizer, date };
    }),
  );

  return entries.map(({ row, organizer, date }) =>
    mapRowToMission(row, organizer, date, referenceCoords),
  );
}
