/**
 * Unified mission resolution — UUID-only Supabase-backed domain Mission.
 *
 * Resolution order:
 *   1. missions table (pre-seeded gamified missions)
 *   2. proposals table fallback (user-created proposals adapted to Mission shape)
 *
 * This ensures that UUIDs originating from proposals table work correctly
 * in routes like /app/mision/$missionId without "Mission not found" errors.
 *
 * Phase 4C: `adaptProposalToMission` was a near-duplicate of
 * entityAdapter.proposalToEntity (same emoji map, same defaults, same
 * lossy drop of proposal-only fields). We now delegate to the adapter
 * — single source of truth for the Proposal → Mission shape, no
 * diverged emoji maps, and the districtId passthrough is preserved.
 */

import type { Mission } from "@/types";
import { missionRepository } from "@/services/missionRepository";
import { proposalRepository } from "@/services/proposalRepository";
import { proposalToEntity } from "@/services/entityAdapter";
import { computeLifecycleInfo } from "@/domain/lifecycle";
import { z } from "zod";

const MISSION_UUID_SCHEMA = z.string().uuid();

function assertUuidMissionId(missionId: string): void {
  const result = MISSION_UUID_SCHEMA.safeParse(missionId);
  if (!result.success) {
    throw new Error("Invalid mission identifier: UUID required");
  }
}

/**
 * Adapt a Proposal to Mission shape. Delegates to the canonical
 * proposalToEntity adapter so the emoji map and field defaults stay
 * in one place. If the proposal lacks coordinates, returns a
 * sentinel Mission (lat/lng = 0) so the route can still render a
 * fallback; this preserves the previous behavior of missionResolver.
 */
function adaptProposalToMission(p: {
  id: string;
  title: string;
  description: string | null;
  district: string;
  districtId?: string | null;
  region: Mission["region"];
  category: string;
  teamSize: number;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
}): Mission {
  const entity = proposalToEntity({
    id: p.id,
    userId: "",
    title: p.title,
    description: p.description,
    category: p.category,
    district: p.district,
    districtId: p.districtId ?? null,
    region: p.region,
    teamSize: p.teamSize,
    images: [],
    status: "pending",
    latitude: p.latitude,
    longitude: p.longitude,
    proposedDate: null,
    summary: null,
    why: null,
    locationLabel: null,
    createdAt: p.createdAt,
    updatedAt: p.createdAt,
  });
  if (entity) {
    return entity as Mission;
  }
  // Proposal lacked coordinates: build a sentinel Mission so the
  // route can render a fallback. Uses the same defaults the adapter
  // would have produced.
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? p.title,
    district: p.district,
    districtId: p.districtId ?? null,
    region: p.region,
    category: p.category as Mission["category"],
    xp: 0,
    participants: 0,
    spotsLeft: p.teamSize,
    date: p.createdAt,
    distanceKm: 0,
    impact: p.description ?? p.title,
    difficulty: "Suave",
    organizer: { name: "Propuesta ciudadana", avatar: "🏛️" },
    coords: { lat: 0, lng: 0 },
    emoji: "📌",
    startDate: null,
    endDate: null,
    lifecycleInfo: computeLifecycleInfo(null, null),
  };
}

async function resolveMission(missionId: string): Promise<Mission> {
  const id = missionId.trim();
  if (!id) {
    throw new Error("Mission ID is required");
  }

  assertUuidMissionId(id);

  // Step 1: try missions table
  const mission = await missionRepository.findById(id);
  if (mission) return mission;

  // Step 2: fallback to proposals table
  const proposalResult = await proposalRepository.getProposalById(id);
  if (proposalResult) return adaptProposalToMission(proposalResult);

  throw new Error(`Mission not found: ${id}`);
}

async function resolveAllMissions(): Promise<Mission[]> {
  return missionRepository.findAll();
}

function isUuid(missionId: string): boolean {
  return MISSION_UUID_SCHEMA.safeParse(missionId.trim()).success;
}

export const missionResolver = {
  resolve: resolveMission,
  resolveAll: resolveAllMissions,
  isUuid,
};
