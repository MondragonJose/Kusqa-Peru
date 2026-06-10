/**
 * User progress query service — read-only aggregation (repositories + domain).
 * Uses mission_participants table via participationService for user-mission relationships.
 * No mock fallbacks — all data derives from real participation.
 */

import { userRepository } from "@/services/userRepository";
import { userProgressDomainService } from "@/services/userProgressDomainService";
import { getUserMissions } from "@/services/participationService";
import type { ProfileMissionTimelineView, UserMission, UserTerritoryProgressView } from "@/types";

export const userProgressQueryService = {
  async getUserMissionsEnriched(userId: string): Promise<UserMission[]> {
    try {
      return await getUserMissions(userId);
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[KUSQA] mission_participants unavailable, returning empty user missions");
      return [];
    }
  },

  async getCompletedMissionsEnriched(userId: string): Promise<UserMission[]> {
    try {
      const userMissions = await getUserMissions(userId);
      return userMissions.filter((um) => um.status === "completed");
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[KUSQA] mission_participants unavailable, returning empty completed missions");
      return [];
    }
  },

  async getProfileMissionTimeline(userId: string): Promise<ProfileMissionTimelineView> {
    const userMissions = await getUserMissions(userId);
    return userProgressDomainService.buildTimelineFromEnriched(userMissions);
  },

  async getTerritoryProgress(userId: string): Promise<UserTerritoryProgressView> {
    const progress = await userRepository.findProgressByUserId(userId);
    let completedCount = 0;

    try {
      const userMissions = await getUserMissions(userId);
      completedCount = userMissions.filter((um) => um.status === "completed").length;
    } catch (e) {
      if (import.meta.env.DEV) console.warn("[KUSQA] mission_participants unavailable, counting 0 completed missions");
    }

    return {
      ...progress,
      totalMissionsCompleted: completedCount,
    };
  },
};
