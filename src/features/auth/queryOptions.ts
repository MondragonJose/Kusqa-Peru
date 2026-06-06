/**
 * React Query option factories — cache policy + queryFn wiring only.
 * No mock fallbacks — all queries derive from Supabase-backed services.
 */

import {
  MISSION_CATALOG_GC_MS,
  MISSION_CATALOG_STALE_MS,
  USER_MISSIONS_GC_MS,
  USER_MISSIONS_STALE_MS,
  USER_PROGRESS_VIEW_GC_MS,
  USER_PROGRESS_VIEW_STALE_MS,
  USER_SESSION_GC_MS,
  USER_SESSION_STALE_MS,
} from "@/lib/queryCache";
import { missionKeys, userKeys, userMissionKeys, userProgressKeys } from "@/lib/queryKeys";
import { isLiveUserEnabled } from "@/lib/userFeature";
import { missionResolver } from "@/services/missionResolver";
import { userProgressQueryService } from "@/services/userProgressQueryService";
import { userRepository } from "@/services/userRepository";

export function missionCatalogQueryOptions() {
  return {
    queryKey: missionKeys.all,
    queryFn: () => missionResolver.resolveAll(),
    staleTime: MISSION_CATALOG_STALE_MS,
    gcTime: MISSION_CATALOG_GC_MS,
  };
}

export function missionDetailQueryOptions(missionId: string) {
  return {
    queryKey: missionKeys.detail(missionId),
    queryFn: () => missionResolver.resolve(missionId),
    staleTime: MISSION_CATALOG_STALE_MS,
    gcTime: MISSION_CATALOG_GC_MS,
    enabled: missionId.length > 0,
    retry: false as const,
  };
}

export function userSessionQueryOptions() {
  return {
    queryKey: userKeys.session,
    queryFn: () => userRepository.getAuthenticatedUserId(),
    staleTime: USER_SESSION_STALE_MS,
    gcTime: USER_SESSION_GC_MS,
    enabled: isLiveUserEnabled(),
  };
}

export function userCurrentQueryOptions() {
  return {
    queryKey: userKeys.current,
    queryFn: () => userRepository.getCurrentUser(),
    staleTime: USER_SESSION_STALE_MS,
    gcTime: USER_SESSION_GC_MS,
    enabled: isLiveUserEnabled(),
    retry: false as const,
  };
}

export function userMissionsAllQueryOptions(userId: string) {
  return {
    queryKey: userMissionKeys.all(userId),
    queryFn: () => userProgressQueryService.getUserMissionsEnriched(userId),
    staleTime: USER_MISSIONS_STALE_MS,
    gcTime: USER_MISSIONS_GC_MS,
    enabled: userId.length > 0,
    retry: false as const,
  };
}

/** Canonical cache entry for completed + enriched user missions (profile + lists). */
export function userMissionsCompletedEnrichedQueryOptions(userId: string) {
  return {
    queryKey: userMissionKeys.completed(userId),
    queryFn: () => userProgressQueryService.getCompletedMissionsEnriched(userId),
    staleTime: USER_MISSIONS_STALE_MS,
    gcTime: USER_MISSIONS_GC_MS,
    enabled: userId.length > 0,
    retry: false as const,
  };
}

export function profileTimelineQueryOptions(userId: string) {
  return {
    queryKey: userProgressKeys.territory(userId),
    queryFn: () => userProgressQueryService.getProfileMissionTimeline(userId),
    staleTime: USER_PROGRESS_VIEW_STALE_MS,
    gcTime: USER_PROGRESS_VIEW_GC_MS,
    enabled: userId.length > 0,
  };
}

export function territoryProgressQueryOptions(userId: string) {
  return {
    queryKey: userProgressKeys.territory(userId),
    queryFn: () => userProgressQueryService.getTerritoryProgress(userId),
    staleTime: USER_PROGRESS_VIEW_STALE_MS,
    gcTime: USER_PROGRESS_VIEW_GC_MS,
    enabled: userId.length > 0,
  };
}
