/**

 * React Query invalidation for user progress + mission participation.

 * Lives outside services (services must not depend on React Query).

 */

import type { QueryClient } from "@tanstack/react-query";

import {
  flushMissionCacheInvalidation,
  scheduleMissionCacheInvalidation,
} from "@/features/auth/mutations/missionMutationEngine";

function toRequest(options: {
  userId?: string;

  missionId?: string;
}): { userId?: string; missionIds?: string[] } {
  return {
    userId: options.userId,

    missionIds: options.missionId ? [options.missionId] : undefined,
  };
}

/** Coalesced invalidation — safe to call multiple times per tick. */

export function invalidateMissionCaches(
  queryClient: QueryClient,

  options: { userId?: string; missionId?: string } = {},
): Promise<void> {
  scheduleMissionCacheInvalidation(queryClient, toRequest(options));

  return flushMissionCacheInvalidation(queryClient);
}

export function invalidateUserProgressQueries(
  queryClient: QueryClient,

  userId?: string,
): Promise<void> {
  return invalidateMissionCaches(queryClient, { userId });
}

export function invalidateAfterMissionCompleted(
  queryClient: QueryClient,

  options: { userId: string; missionId: string },
): Promise<void> {
  return invalidateMissionCaches(queryClient, options);
}

export function invalidateAfterMissionJoined(
  queryClient: QueryClient,

  options: { userId: string; missionId: string },
): Promise<void> {
  return invalidateMissionCaches(queryClient, options);
}

export function invalidateAfterMissionCreated(
  queryClient: QueryClient,

  options: { missionId: string; userId?: string },
): Promise<void> {
  return invalidateMissionCaches(queryClient, {
    userId: options.userId,

    missionId: options.missionId,
  });
}

/** Alias for mission creation invalidation (catalog + optional user scope). */

export const invalidateMissionCreation = invalidateAfterMissionCreated;
