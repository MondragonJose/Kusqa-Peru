/**
 * React Query hooks for user ↔ mission participation (query options only).
 * No mock paths — all queries derive from Supabase-backed services.
 */

import { useQuery } from "@tanstack/react-query";
import { isLiveUserEnabled } from "@/lib/userFeature";
import {
  profileTimelineQueryOptions,
  userMissionsAllQueryOptions,
  userMissionsCompletedEnrichedQueryOptions,
  userSessionQueryOptions,
} from "@/features/auth/queryOptions";

type UseUserMissionsOptions = {
  enabled?: boolean;
};

export function useUserMissions(userId: string, options?: UseUserMissionsOptions) {
  const liveUserEnabled = isLiveUserEnabled();
  const enabled = (options?.enabled ?? true) && liveUserEnabled && userId.length > 0;

  return useQuery({
    ...userMissionsAllQueryOptions(userId),
    enabled,
  });
}

export function useUserCompletedMissions(userId: string, options?: UseUserMissionsOptions) {
  const liveUserEnabled = isLiveUserEnabled();
  const enabled = (options?.enabled ?? true) && liveUserEnabled && userId.length > 0;

  return useQuery({
    ...userMissionsCompletedEnrichedQueryOptions(userId),
    enabled,
  });
}

export function useProfileMissionTimeline() {
  const liveUserEnabled = isLiveUserEnabled();
  const { data: userId } = useQuery(userSessionQueryOptions());

  return useQuery(profileTimelineQueryOptions(userId ?? ""));
}
