/**
 * View models for user progress aggregation (service layer output).
 */

import type { Mission, Region, UserTerritoryProgress } from "@/types";

export type ProfileMissionTimelineView = {
  missions: Mission[];
  totalCompleted: number;
  activeRegions: Region[];
};

export type UserTerritoryProgressView = UserTerritoryProgress;
