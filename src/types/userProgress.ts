/**
 * View models for user progress aggregation (service layer output).
 */

import type { Mission, Region, UserTerritoryProgress, UserMission } from "@/types";

export type ProfileMissionTimelineView = {
  missions: Mission[];
  userMissions: UserMission[];
  totalCompleted: number;
  activeRegions: Region[];
};

export type UserTerritoryProgressView = UserTerritoryProgress;
