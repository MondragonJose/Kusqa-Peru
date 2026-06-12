/**
 * useInstitution — Phase 3A.
 *
 * Read-only React Query hook over the get_public_institution RPC.
 * Never fails loudly: an empty state is preferred over an error toast.
 */

import { useQuery } from "@tanstack/react-query";
import { institutionRepository } from "@/services/institutionRepository";
import { institutionKeys } from "@/lib/queryKeys";

const INSTITUTION_STALE_MS = 10 * 60 * 1000;

export function useInstitution(slug: string | undefined) {
  return useQuery({
    queryKey: institutionKeys.bySlug(slug ?? ""),
    queryFn: () => (slug ? institutionRepository.findBySlug(slug) : Promise.resolve(null)),
    staleTime: INSTITUTION_STALE_MS,
    gcTime: 30 * 60 * 1000,
    enabled: !!slug,
    retry: 1,
  });
}
