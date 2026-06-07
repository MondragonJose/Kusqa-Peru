/**
 * Public profile hooks — Phase 4A.
 *
 * Two parallel hooks:
 *   - usePublicProfile(userId)        — public-safe profile projection (RPC)
 *   - usePublicProfileActivity(userId) — civic_events timeline (RPC)
 *
 * Both are read-only and never fail loudly: an empty render is always
 * preferred over an error toast, because the user-profile surface is
 * a "look, don't touch" surface.
 */

import { useQuery } from "@tanstack/react-query";
import { publicProfileRepository } from "@/services/publicProfileRepository";
import { civicEventsRepository } from "@/services/civicEventsRepository";
import { civicEventKeys, publicProfileKeys } from "@/lib/queryKeys";

const PUBLIC_PROFILE_STALE_MS = 5 * 60 * 1000; // 5 min — counters move slowly
const ACTIVITY_STALE_MS = 60 * 1000; // 60s — fresh-ish timeline

export function usePublicProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: publicProfileKeys.byId(userId ?? ""),
    queryFn: () => (userId ? publicProfileRepository.findByUserId(userId) : Promise.resolve(null)),
    staleTime: PUBLIC_PROFILE_STALE_MS,
    gcTime: 10 * 60 * 1000,
    enabled: !!userId,
    retry: 1,
  });
}

export function usePublicProfileActivity(userId: string | null | undefined, limit: number = 20) {
  return useQuery({
    queryKey: civicEventKeys.forUser(userId ?? "", limit),
    queryFn: () =>
      userId ? civicEventsRepository.listForProfile(userId, limit) : Promise.resolve([]),
    staleTime: ACTIVITY_STALE_MS,
    gcTime: 5 * 60 * 1000,
    enabled: !!userId,
    retry: 1,
  });
}
