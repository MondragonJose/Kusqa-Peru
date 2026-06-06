/**
 * useUserProgress — territorial progress view from real Supabase data.
 * No mock fallback — returns default empty progress until real data loads.
 */

import { useQuery } from "@tanstack/react-query";
import { isLiveUserEnabled } from "@/lib/userFeature";
import {
  territoryProgressQueryOptions,
  userSessionQueryOptions,
} from "@/features/auth/queryOptions";
import type { UserTerritoryProgressView } from "@/types";

const EMPTY_PROGRESS: UserTerritoryProgressView = {
  userId: "",
  communityPoints: 0,
  totalMissionsCompleted: 0,
  lastActivityAt: new Date().toISOString(),
};

export function useUserProgress(): UserTerritoryProgressView {
  const liveUserEnabled = isLiveUserEnabled();

  const { data: userId } = useQuery(userSessionQueryOptions());

  const { data: progress } = useQuery({
    ...territoryProgressQueryOptions(userId ?? ""),
    placeholderData: EMPTY_PROGRESS,
  });

  return progress ?? EMPTY_PROGRESS;
}
