/**
 * Mission repository — Supabase read access for missions.
 * Maps generated DB rows to domain Mission types.
 */

import { supabase } from "@/lib/supabase";
import type { Mission, MissionCategory, MissionDifficulty } from "@/types";
import type { Database } from "@/types/supabase.generated";
import { inferRegionFromCoords } from "@/domain/territorial";
import { computeLifecycleInfo } from "@/domain/lifecycle";
import { z } from "zod";

type DbMission = Database["public"]["Tables"]["missions"]["Row"];
type DbCategory = Database["public"]["Enums"]["mission_category"];

const MISSION_ID_SCHEMA = z.string().uuid();

const DB_MISSION_SCHEMA = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  district: z.string().min(1),
  category: z.enum(["environment", "infrastructure", "community", "education", "health"]),
  latitude: z.number(),
  longitude: z.number(),
  created_at: z.string(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  current_progress: z.number().nullable().optional(),
  max_participants: z.number().nullable().optional(),
  xp_reward: z.number().int().nonnegative().optional(),
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

const CATEGORY_LABEL: Record<DbCategory, MissionCategory> = {
  environment: "Medio ambiente",
  infrastructure: "Tecnología",
  community: "Comunidad",
  education: "Educación",
  health: "Salud",
};

const CATEGORY_TO_DB: Record<MissionCategory, DbCategory> = {
  "Medio ambiente": "environment",
  Tecnología: "infrastructure",
  Comunidad: "community",
  Educación: "education",
  Salud: "health",
  "Arte & cultura": "community",
};

const CATEGORY_EMOJI: Record<DbCategory, string> = {
  environment: "🌱",
  infrastructure: "🏗️",
  community: "🤝",
  education: "📚",
  health: "❤️",
};

const DEFAULT_XP = 320;
const DEFAULT_DIFFICULTY: MissionDifficulty = "Suave";

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

function mapRowToMission(row: DbMission): Mission {
  const coords = { lat: row.latitude, lng: row.longitude };
  const region = inferRegionFromCoords(coords);
  const participants = row.current_progress ?? 0;
  const capacity = row.max_participants ?? 10;
  const spotsLeft = Math.max(0, capacity - participants);
  const startDate =
    "start_date" in row ? ((row as Record<string, unknown>).start_date as string | null) : null;
  const endDate =
    "end_date" in row ? ((row as Record<string, unknown>).end_date as string | null) : null;

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    district: row.district,
    region,
    category: CATEGORY_LABEL[row.category],
    xp: row.xp_reward ?? DEFAULT_XP,
    participants,
    spotsLeft,
    date: formatMissionDate(row.created_at),
    distanceKm: 0,
    impact: row.description.slice(0, 80),
    difficulty: DEFAULT_DIFFICULTY,
    startDate,
    endDate,
    lifecycleInfo: computeLifecycleInfo(startDate, endDate),
    organizer: {
      name: "Comunidad KUSQA",
      avatar: "🦙",
    },
    coords,
    emoji: CATEGORY_EMOJI[row.category],
  };
}

export const missionRepository = {
  async findAll(): Promise<Mission[]> {
    const { data, error } = await supabase
      .from("missions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch missions: ${error.message}`);
    }

    const missions = (data ?? []).map((row) => mapRowToMission(parseDbMissionRow(row)));

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

  async findById(missionId: string): Promise<Mission | null> {
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

    return mapRowToMission(parseDbMissionRow(data));
  },

  async findAllByIds(missionIds: string[]): Promise<Mission[]> {
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
      const found = new Set(rows.map((row) => row.id));
      const missing = uniqueIds.filter((id) => !found.has(id));
      throw new Error(`Missions not found: ${missing.join(", ")}`);
    }

    return rows.map((row) => mapRowToMission(parseDbMissionRow(row)));
  },

  async create(data: Omit<Mission, "id">): Promise<Mission> {
    const category = CATEGORY_TO_DB[data.category] ?? "community";
    const participants = data.participants ?? 0;
    const capacity = Math.max(participants + (data.spotsLeft ?? 0), participants, 1);

    const { data: inserted, error } = await supabase
      .from("missions")
      .insert({
        title: data.title,
        description: data.description,
        district: data.district,
        latitude: data.coords.lat,
        longitude: data.coords.lng,
        category,
        max_participants: capacity,
        current_progress: participants,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create mission: ${error.message}`);
    }

    if (!inserted) {
      throw new Error("Failed to create mission: empty response");
    }

    return mapRowToMission(parseDbMissionRow(inserted));
  },
};
