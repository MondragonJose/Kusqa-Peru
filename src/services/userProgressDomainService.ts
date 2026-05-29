/**
 * User progress domain — pure business logic (no React Query, no Supabase).
 * No mock paths — all data derives from real mission_participants-backed queries.
 */

import type {
  Mission,
  ProfileMissionTimelineView,
  Region,
  UserMission,
} from "@/types";

export function buildTimelineView(missions: Mission[]): ProfileMissionTimelineView {
  return {
    missions,
    userMissions: [],
    totalCompleted: missions.length,
    activeRegions: [...new Set(missions.map((mission) => mission.region))],
  };
}

export function buildTimelineFromEnriched(enriched: UserMission[]): ProfileMissionTimelineView {
  const missions = enriched.map((entry) => entry.mission);
  const completed = enriched.filter((um) => um.status === "completed").length;
  return {
    missions,
    userMissions: enriched,
    totalCompleted: completed,
    activeRegions: [...new Set(missions.map((mission) => mission.region))],
  };
}

export const userProgressDomainService = {
  buildTimelineView,
  buildTimelineFromEnriched,
};
