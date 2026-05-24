/**
 * User progress query service — read-only aggregation (repositories + domain).
 * Uses mission_participants table via services/missions.ts for user-mission relationships.
 */

import { userRepository } from "@/services/userRepository";
import { userProgressDomainService } from "@/services/userProgressDomainService";
import { getUserMissions } from "@/services/missions";
import type {
  ProfileMissionTimelineView,
  UserMission,
  UserTerritoryProgressView,
} from "@/types";

export const userProgressQueryService = {
  async getCompletedMissionsEnriched(userId: string): Promise<UserMission[]> {
    try {
      const missions = await getUserMissions(userId);
      // Filter for completed missions (status = 'completed' in mission_participants)
      // For now, return all as user missions since we need to enrich them
      return userProgressDomainService.enrichMissionsToUserMissions(missions);
    } catch (e) {
      console.warn("[KUSQA] mission_participants unavailable, returning empty completed missions");
      return [];
    }
  },

  async getUserMissionsEnriched(userId: string): Promise<UserMission[]> {
    try {
      const missions = await getUserMissions(userId);
      return userProgressDomainService.enrichMissionsToUserMissions(missions);
    } catch (e) {
      console.warn("[KUSQA] mission_participants unavailable, returning empty user missions");
      return [];
    }
  },

  async getProfileMissionTimeline(userId: string): Promise<ProfileMissionTimelineView> {
    const enriched = await this.getCompletedMissionsEnriched(userId);
    return userProgressDomainService.buildTimelineFromEnriched(enriched);
  },

  async getProfileMissionTimelineMock(): Promise<ProfileMissionTimelineView> {
    return userProgressDomainService.buildMockProfileTimeline();
  },

  async getTerritoryProgress(userId: string): Promise<UserTerritoryProgressView> {
    const progress = await userRepository.findProgressByUserId(userId);
    let completedCount = 0;

    try {
      const missions = await getUserMissions(userId);
      completedCount = missions.length;
    } catch (e) {
      console.warn("[KUSQA] mission_participants unavailable, counting 0 completed missions");
    }

    return {
      ...progress,
      totalMissionsCompleted: completedCount,
    };
  },

  getTerritoryProgressMock(): UserTerritoryProgressView {
    return userProgressDomainService.buildMockTerritoryProgress();
  },
};
