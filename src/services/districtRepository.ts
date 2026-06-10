/**
 * District repository — Phase 3A.
 *
 * Reads from the canonical `districts` table, the `district_stats` view, and
 * the SECURITY DEFINER RPCs added in migration 20260606030000.
 *
 * Strict contract:
 *   - All methods return shapes that match the domain layer (camelCase).
 *   - DB rows are validated with Zod before being returned to callers.
 *   - Non-critical reads (stats, activity, supporters) return ZEROED defaults
 *     on any error — the district page must always render, even if the
 *     aggregation view or RPC is missing.
 *   - The list/feed reads (missions, proposals) propagate errors so the
 *     caller can show an honest empty state with a retry button.
 */

import { supabase } from "@/lib/supabase";
import { z } from "zod";
import type { Mission } from "@/types";
import type { Proposal } from "./proposalContract";
import type { TerritorialImpactSummary } from "@/domain/territoryAggregations";
import { proposalRepository } from "./proposalRepository";
import { missionRepository } from "./missionRepository";

// ─── Public types ─────────────────────────────────────────────────────────

export type District = {
  id: string;
  slug: string;
  displayName: string;
  region: "costa" | "sierra" | "selva";
  department: string | null;
  latitude: number | null;
  longitude: number | null;
  narrative: string | null;
  sortOrder: number | null;
};

export type DistrictStats = {
  districtId: string;
  slug: string;
  displayName: string;
  region: "costa" | "sierra" | "selva";
  department: string | null;
  missionCount: number;
  upcomingMissionCount: number;
  completedMissionCount: number;
  proposalCount: number;
  activeProposalCount: number;
  uniqueSupporterCount: number;
  acceptedCollaboratorCount: number;
  lastActivityAt: string | null;
};

export type DistrictActivity = {
  id: string;
  activityType:
    | "join"
    | "join_idempotent"
    | "complete"
    | "complete_idempotent"
    | "xp_granted"
    | "rollback_critical"
    | "comment"
    | "support";
  entityType: "mission" | "proposal";
  entityId: string;
  occurredAt: string;
  actorUsername: string;
  actorFirstName: string;
  actorAvatarUrl: string | null;
  detail: string | null;
};

export type DistrictTopSupporter = {
  username: string;
  firstName: string;
  avatarUrl: string | null;
  supportCount: number;
};

export type DistrictFeed = {
  activeProposals: Proposal[];
  recentMissions: Mission[];
};

// ─── Zod schemas ──────────────────────────────────────────────────────────

const DISTRICT_SCHEMA = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  display_name: z.string(),
  region: z.enum(["costa", "sierra", "selva"]),
  department: z.string().nullable(),
  latitude: z.union([z.string(), z.number()]).nullable(),
  longitude: z.union([z.string(), z.number()]).nullable(),
  narrative: z.string().nullable(),
  sort_order: z.number().nullable(),
});

const DISTRICT_STATS_SCHEMA = z.object({
  district_id: z.string().uuid(),
  slug: z.string(),
  display_name: z.string(),
  region: z.enum(["costa", "sierra", "selva"]),
  department: z.string().nullable(),
  mission_count: z.number(),
  upcoming_mission_count: z.number(),
  completed_mission_count: z.number(),
  proposal_count: z.number(),
  active_proposal_count: z.number(),
  unique_supporter_count: z.number(),
  accepted_collaborator_count: z.number(),
  last_activity_at: z.string().nullable(),
});

const DISTRICT_ACTIVITY_SCHEMA = z.object({
  activity_id: z.string().uuid(),
  activity_type: z.string(),
  entity_type: z.enum(["mission", "proposal"]),
  entity_id: z.string().uuid(),
  occurred_at: z.string(),
  actor_username: z.string(),
  actor_first_name: z.string(),
  actor_avatar_url: z.string().nullable(),
  detail: z.string().nullable(),
});

const DISTRICT_TOP_SUPPORTER_SCHEMA = z.object({
  username: z.string(),
  first_name: z.string(),
  avatar_url: z.string().nullable(),
  support_count: z.union([z.number(), z.string()]),
});

// ─── Helpers ──────────────────────────────────────────────────────────────

function toDistrict(row: z.infer<typeof DISTRICT_SCHEMA>): District {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.display_name,
    region: row.region,
    department: row.department,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    narrative: row.narrative,
    sortOrder: row.sort_order,
  };
}

function toDistrictStats(row: z.infer<typeof DISTRICT_STATS_SCHEMA>): DistrictStats {
  return {
    districtId: row.district_id,
    slug: row.slug,
    displayName: row.display_name,
    region: row.region,
    department: row.department,
    missionCount: row.mission_count,
    upcomingMissionCount: row.upcoming_mission_count,
    completedMissionCount: row.completed_mission_count,
    proposalCount: row.proposal_count,
    activeProposalCount: row.active_proposal_count,
    uniqueSupporterCount: row.unique_supporter_count,
    acceptedCollaboratorCount: row.accepted_collaborator_count,
    lastActivityAt: row.last_activity_at,
  };
}

function toDistrictActivity(row: z.infer<typeof DISTRICT_ACTIVITY_SCHEMA>): DistrictActivity {
  return {
    id: row.activity_id,
    activityType: row.activity_type as DistrictActivity["activityType"],
    entityType: row.entity_type,
    entityId: row.entity_id,
    occurredAt: row.occurred_at,
    actorUsername: row.actor_username,
    actorFirstName: row.actor_first_name,
    actorAvatarUrl: row.actor_avatar_url,
    detail: row.detail,
  };
}

function zeroedStats(
  districtId: string,
  slug: string,
  displayName: string,
  region: DistrictStats["region"],
  department: string | null,
): DistrictStats {
  return {
    districtId,
    slug,
    displayName,
    region,
    department,
    missionCount: 0,
    upcomingMissionCount: 0,
    completedMissionCount: 0,
    proposalCount: 0,
    activeProposalCount: 0,
    uniqueSupporterCount: 0,
    acceptedCollaboratorCount: 0,
    lastActivityAt: null,
  };
}

// ─── Repository ──────────────────────────────────────────────────────────

export const districtRepository = {
  /**
   * Look up a district by URL slug. Returns null if not found (the route
   * should show a "Distrito no encontrado" empty state, NOT a fake entry).
   */
  async getDistrictBySlug(slug: string): Promise<District | null> {
    const { data, error } = await supabase
      .from("districts")
      .select(
        "id, slug, display_name, region, department, latitude, longitude, narrative, sort_order",
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA DISTRICT TRACE] getDistrictBySlug error:", error);
      }
      return null;
    }
    if (!data) return null;
    const parsed = DISTRICT_SCHEMA.safeParse(data);
    if (!parsed.success) return null;
    return toDistrict(parsed.data);
  },

  /**
   * Read the district_stats view for a given district.
   * Returns zeroed defaults on any error — the UI must always render.
   */
  async getDistrictStats(districtId: string): Promise<DistrictStats> {
    const { data, error } = await supabase
      .from("district_stats")
      .select("*")
      .eq("district_id", districtId)
      .maybeSingle();

    if (error) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA DISTRICT TRACE] getDistrictStats error:", error);
      }
      return zeroedStats(districtId, "", "Distrito", "costa", null);
    }
    if (!data) {
      return zeroedStats(districtId, "", "Distrito", "costa", null);
    }
    const parsed = DISTRICT_STATS_SCHEMA.safeParse(data);
    if (!parsed.success) {
      return zeroedStats(districtId, "", "Distrito", "costa", null);
    }
    return toDistrictStats(parsed.data);
  },

  /**
   * Read district_stats for ALL districts. Used by SpatialContext to
   * classify each district as active/dormant for neighborhood-awareness.
   * Lightweight: ~13 columns, ~200 rows.
   */
  async getAllDistrictStats(): Promise<DistrictStats[]> {
    const { data, error } = await supabase
      .from("district_stats")
      .select("*");

    if (error) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA DISTRICT TRACE] getAllDistrictStats error:", error);
      }
      return [];
    }
    return (data ?? [])
      .map((row: unknown) => {
        const parsed = DISTRICT_STATS_SCHEMA.safeParse(row);
        return parsed.success ? toDistrictStats(parsed.data) : null;
      })
      .filter((d: DistrictStats | null): d is DistrictStats => d !== null);
  },

  /**
   * Return a TerritorialImpactSummary with recent proposal/completion counts.
   * This is the primary input for territorial intelligence (vitality, narrative).
   * Merges district_stats with two lightweight recent-count queries.
   */
  async getDistrictIntelligence(districtId: string): Promise<TerritorialImpactSummary> {
    const [stats, recentProposalCount, recentCompletionCount] = await Promise.all([
      this.getDistrictStats(districtId),
      this.getRecentProposalCount(districtId),
      this.getRecentCompletionCount(districtId),
    ]);

    return {
      missionCount: stats.missionCount,
      completedMissionCount: stats.completedMissionCount,
      proposalCount: stats.proposalCount,
      activeProposalCount: stats.activeProposalCount,
      uniqueSupporterCount: stats.uniqueSupporterCount,
      acceptedCollaboratorCount: stats.acceptedCollaboratorCount,
      lastActivityAt: stats.lastActivityAt,
      recentProposalCount,
      recentCompletionCount,
    };
  },

  /**
   * Count proposals created within the last 30 days in the given district.
   * Lightweight — uses `head: true` (count only, no rows).
   */
  async getRecentProposalCount(districtId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from("proposals")
      .select("*", { count: "exact", head: true })
      .eq("district_id", districtId)
      .gte("created_at", thirtyDaysAgo);
    if (error || count === null) return 0;
    return count;
  },

  /**
   * Count mission-participant completions within the last 30 days.
   * Uses a join filter through the mission FK relationship.
   */
  async getRecentCompletionCount(districtId: string): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase
      .from("mission_participants")
      .select("*", { count: "exact", head: true })
      .gte("completed_at", thirtyDaysAgo)
      .neq("completed_at", null)
      .filter("mission.district_id", "eq", districtId);
    if (error || count === null) return 0;
    return count;
  },

  /**
   * Get the combined district feed: active proposals + recent missions.
   * Uses district_id FK for both proposals and missions.
   */
  async getDistrictFeed(districtSlug: string): Promise<DistrictFeed> {
    const district = await this.getDistrictBySlug(districtSlug);
    if (!district) {
      return { activeProposals: [], recentMissions: [] };
    }

    const [proposals, missions] = await Promise.all([
      proposalRepository.getAllProposals(
        { districtId: district.id },
        { limit: 20, offset: 0 },
      ),
      missionRepository.findByDistrict(district.displayName, district.slug, district.id, { limit: 10, offset: 0 }),
    ]);

    return {
      activeProposals: proposals.filter((p) => p.status === "pending" || p.status === "active"),
      recentMissions: missions,
    };
  },

  /**
   * Recent activity for the district via the SECURITY DEFINER RPC.
   * Returns an empty array on error — the activity feed is a nice-to-have.
   */
  async getDistrictActivity(districtId: string, limit: number = 20): Promise<DistrictActivity[]> {
    try {
      const { data, error } = await supabase.rpc("get_district_recent_activity", {
        p_district_id: districtId,
        p_limit: limit,
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error("[KUSQA DISTRICT TRACE] getDistrictActivity error:", error);
        }
        return [];
      }
      if (!Array.isArray(data)) return [];

      return data
        .map((row: unknown) => {
          const parsed = DISTRICT_ACTIVITY_SCHEMA.safeParse(row);
          return parsed.success ? toDistrictActivity(parsed.data) : null;
        })
        .filter((a): a is DistrictActivity => a !== null);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA DISTRICT TRACE] getDistrictActivity unexpected:", e);
      }
      return [];
    }
  },

  /**
   * Top supporters across all proposals in the district.
   * Returns an empty array on error.
   */
  async getDistrictTopSupporters(
    districtId: string,
    limit: number = 10,
  ): Promise<DistrictTopSupporter[]> {
    try {
      const { data, error } = await supabase.rpc("get_district_top_supporters", {
        p_district_id: districtId,
        p_limit: limit,
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error("[KUSQA DISTRICT TRACE] getDistrictTopSupporters error:", error);
        }
        return [];
      }
      if (!Array.isArray(data)) return [];

      return data
        .map((row: unknown) => {
          const parsed = DISTRICT_TOP_SUPPORTER_SCHEMA.safeParse(row);
          if (!parsed.success) return null;
          return {
            username: parsed.data.username,
            firstName: parsed.data.first_name,
            avatarUrl: parsed.data.avatar_url,
            supportCount: Number(parsed.data.support_count),
          };
        })
        .filter((s): s is DistrictTopSupporter => s !== null);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA DISTRICT TRACE] getDistrictTopSupporters unexpected:", e);
      }
      return [];
    }
  },

  /**
   * List all districts, optionally filtered by region.
   * Used by the map's "availableDistricts" replacement.
   */
  async listDistricts(region?: "costa" | "sierra" | "selva"): Promise<District[]> {
    let query = supabase
      .from("districts")
      .select(
        "id, slug, display_name, region, department, latitude, longitude, narrative, sort_order",
      )
      .order("region", { ascending: true })
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("display_name", { ascending: true });

    if (region) {
      query = query.eq("region", region);
    }

    const { data, error } = await query;

    if (error) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA DISTRICT TRACE] listDistricts error:", error);
      }
      return [];
    }
    return (data ?? [])
      .map((row: unknown) => {
        const parsed = DISTRICT_SCHEMA.safeParse(row);
        return parsed.success ? toDistrict(parsed.data) : null;
      })
      .filter((d: District | null): d is District => d !== null);
  },
};
