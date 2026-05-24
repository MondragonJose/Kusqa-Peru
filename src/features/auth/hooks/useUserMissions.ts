/**
 * React Query hooks for user ↔ mission participation (query options only).
 */

import { useQuery } from "@tanstack/react-query";
import { isLiveUserEnabled } from "@/lib/userFeature";
import {
  profileTimelineQueryOptions,
  userMissionsAllQueryOptions,
  userMissionsCompletedEnrichedQueryOptions,
  userSessionQueryOptions,
} from "@/features/auth/queryOptions";
import type { Mission } from "@/types";

type UseUserMissionsOptions = {
  enabled?: boolean;
};

export function useUserMissions(userId: string, options?: UseUserMissionsOptions) {
  const liveUserEnabled = isLiveUserEnabled();
  const enabled =
    (options?.enabled ?? true) && liveUserEnabled && userId.length > 0;

  return useQuery({
    ...userMissionsAllQueryOptions(userId),
    enabled,
  });
}

export function useUserCompletedMissions(userId: string, options?: UseUserMissionsOptions) {
  const liveUserEnabled = isLiveUserEnabled();
  const enabled =
    (options?.enabled ?? true) && liveUserEnabled && userId.length > 0;

  return useQuery({
    ...userMissionsCompletedEnrichedQueryOptions(userId),
    enabled,
  });
}

export function useProfileMissionTimeline() {
  const liveUserEnabled = isLiveUserEnabled();

  const { data: userId } = useQuery(userSessionQueryOptions());

  return useQuery(
    profileTimelineQueryOptions(liveUserEnabled ? userId ?? "pending" : "mock", userId ?? undefined)
  );
}

/** @deprecated Prefer useProfileMissionTimeline().data?.missions in UI when possible. */
export function useProfileCompletedMissions(): Mission[] {
  const { data: timeline } = useProfileMissionTimeline();
  return timeline?.missions ?? [];
}
