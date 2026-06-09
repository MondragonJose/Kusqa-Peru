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
 * Phase 10D: adapted proposal-to-mission path always uses the sentinel
 * shape directly instead of going through proposalToEntity (which now
 * returns a native ProposalEntity with no Mission fields).
 */

import type { Mission } from "@/types";
import { missionRepository } from "@/services/missionRepository";
import { proposalRepository } from "@/services/proposalRepository";
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
 * Build a fallback Mission from a Proposal row.
 * Used by the mission detail page when a proposal ID is resolved.
 * The actual proposal can still be fetched independently by the page.
 */
function proposalToFallbackMission(p: {
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
    coords: { lat: p.latitude ?? 0, lng: p.longitude ?? 0 },
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
  if (proposalResult) return proposalToFallbackMission(proposalResult);

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
