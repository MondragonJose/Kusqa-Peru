/**
 * User progress domain — pure business logic (no React Query, no Supabase).
 */

import { CURRENT_USER } from "@/data/mockData";
import { missionRepository } from "@/services/missionRepository";
import { missionResolver } from "@/services/missionResolver";
import type { UserMissionRow } from "@/services/userMissionRepository";
import type {
  Mission,
  ProfileMissionTimelineView,
  Region,
  UserMission,
  UserTerritoryProgressView,
} from "@/types";

export const PROFILE_TIMELINE_MOCK_LIMIT = 3;
export const MOCK_USER_ID = "mock-user";

export function buildTimelineView(missions: Mission[]): ProfileMissionTimelineView {
  return {
    missions,
    totalCompleted: missions.length,
    activeRegions: [...new Set(missions.map((mission) => mission.region))],
  };
}

export function buildTimelineFromEnriched(enriched: UserMission[]): ProfileMissionTimelineView {
  return buildTimelineView(enriched.map((entry) => entry.mission));
}

export async function enrichRowsToUserMissions(rows: UserMissionRow[]): Promise<UserMission[]> {
  if (rows.length === 0) {
    return [];
  }

  const missionIds = [...new Set(rows.map((row) => row.missionId))];
  const missions = await missionRepository.findAllByIds(missionIds);
  const missionById = new Map(missions.map((mission) => [mission.id, mission]));

  return rows.map((row) => {
    const mission = missionById.get(row.missionId);
    if (!mission) {
      throw new Error(`Mission not found: ${row.missionId}`);
    }

    return {
      id: row.id,
      userId: row.userId,
      missionId: row.missionId,
      status: row.status,
      completedAt: row.completedAt,
      xpEarned: row.xpEarned,
      mission,
    };
  });
}

/**
 * Converts Mission[] to UserMission[] for user progress tracking.
 * Used when fetching from mission_participants which returns Mission objects directly.
 */
export function enrichMissionsToUserMissions(missions: Mission[]): UserMission[] {
  return missions.map((mission) => ({
    id: `${mission.id}-${Date.now()}`, // Generate temporary ID
    userId: "current", // Will be replaced by actual userId in context
    missionId: mission.id,
    status: "in_progress" as const,
    completedAt: null,
    xpEarned: null,
    mission,
  }));
}

export async function buildMockProfileTimeline(): Promise<ProfileMissionTimelineView> {
  const catalog = await missionResolver.resolveAll();
  const missions = catalog.slice(0, PROFILE_TIMELINE_MOCK_LIMIT);
  return {
    missions,
    totalCompleted: CURRENT_USER.missionsDone ?? missions.length,
    activeRegions: [...new Set(missions.map((mission) => mission.region))] as Region[],
  };
}

export function buildMockTerritoryProgress(): UserTerritoryProgressView {
  return {
    userId: MOCK_USER_ID,
    communityPoints: CURRENT_USER.peopleImpacted ?? 0,
    totalMissionsCompleted: CURRENT_USER.missionsDone ?? 0,
    lastActivityAt: new Date().toISOString(),
  };
}

export const userProgressDomainService = {
  buildTimelineView,
  buildTimelineFromEnriched,
  enrichRowsToUserMissions,
  enrichMissionsToUserMissions,
  buildMockProfileTimeline,
  buildMockTerritoryProgress,
};
