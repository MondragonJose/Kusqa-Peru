/**
 * Unified mission resolution — UUID-only Supabase-backed domain Mission.
 *
 * Resolution order:
 *   1. missions table (pre-seeded gamified missions)
 *   2. proposals table fallback (user-created proposals adapted to Mission shape)
 *
 * This ensures that UUIDs originating from proposals table work correctly
 * in routes like /app/mision/$missionId without "Mission not found" errors.
 */

// LEGACY SLUG SUPPORT REMOVED IN PHASE 3

import type { Mission, MissionCategory, MissionDifficulty } from "@/types";
import { missionRepository } from "@/services/missionRepository";
import { proposalRepository } from "@/services/proposalRepository";
import type { Proposal } from "@/services/proposalContract";
import { computeLifecycleInfo } from "@/domain/lifecycle";
import { z } from "zod";

const MISSION_UUID_SCHEMA = z.string().uuid();

const PROPOSAL_CATEGORY_EMOJI: Record<string, string> = {
  "Medio ambiente": "🌱",
  Educación: "📚",
  "Arte & cultura": "🎨",
  Comunidad: "🤝",
  Salud: "❤️",
  Tecnología: "🏗️",
};

function adaptProposalToMission(p: Proposal): Mission {
  return {
    id: p.id,
    title: p.title,
    description: p.description ?? p.title,
    district: p.district,
    region: p.region,
    category: p.category as MissionCategory,
    xp: 0,
    participants: 0,
    spotsLeft: p.teamSize,
    date: p.createdAt,
    distanceKm: 0,
    impact: p.description ?? p.title,
    difficulty: "Suave" as MissionDifficulty,
    organizer: { name: "Propuesta ciudadana", avatar: "🏛️" },
    coords: {
      lat: p.latitude ?? 0,
      lng: p.longitude ?? 0,
    },
    emoji: PROPOSAL_CATEGORY_EMOJI[p.category] ?? "📌",
    startDate: null,
    endDate: null,
    lifecycleInfo: computeLifecycleInfo(null, null),
  };
}

function assertUuidMissionId(missionId: string): void {
  const result = MISSION_UUID_SCHEMA.safeParse(missionId);
  if (!result.success) {
    throw new Error("Invalid mission identifier: UUID required");
  }
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
  const missions = await missionRepository.findAll();
  return missions;
}

function isUuid(missionId: string): boolean {
  return MISSION_UUID_SCHEMA.safeParse(missionId.trim()).success;
}

export const missionResolver = {
  resolve: resolveMission,
  resolveAll: resolveAllMissions,
  isUuid,
};
