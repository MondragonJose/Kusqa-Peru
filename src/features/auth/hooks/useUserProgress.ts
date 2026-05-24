/**
 * useUserProgress — territorial progress view (query options only).
 */

import { useQuery } from "@tanstack/react-query";
import { isLiveUserEnabled } from "@/lib/userFeature";
import { territoryProgressQueryOptions, userSessionQueryOptions } from "@/features/auth/queryOptions";
import { userProgressQueryService } from "@/services/userProgressQueryService";
import type { UserTerritoryProgressView } from "@/types";

const MOCK_TERRITORY_PROGRESS: UserTerritoryProgressView =
  userProgressQueryService.getTerritoryProgressMock();

/**
 * Returns civic territory progress (mock and live share the same shape).
 */
export function useUserProgress(): UserTerritoryProgressView {
  const liveUserEnabled = isLiveUserEnabled();
  const scope = liveUserEnabled ? "live" : "mock";

  const { data: userId } = useQuery(userSessionQueryOptions());

  const { data: progress } = useQuery({
    ...territoryProgressQueryOptions(liveUserEnabled ? userId ?? "pending" : "mock", userId ?? undefined),
    placeholderData: MOCK_TERRITORY_PROGRESS,
  });

  return progress ?? MOCK_TERRITORY_PROGRESS;
}
