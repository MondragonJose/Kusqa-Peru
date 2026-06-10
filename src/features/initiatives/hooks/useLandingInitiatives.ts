import { useQuery } from "@tanstack/react-query";
import { initiativeKeys } from "@/lib/queryKeys";
import { initiativeResolver } from "@/services/initiativeResolver";
import type { Initiative } from "@/domain/initiative";

const STALE_MS = 60_000;
const GC_MS = 300_000;

export function useLandingInitiatives() {
  return useQuery<Initiative[]>({
    queryKey: initiativeKeys.all,
    queryFn: () => initiativeResolver.resolveAll(),
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });
}
