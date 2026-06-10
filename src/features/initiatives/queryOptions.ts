import { initiativeKeys } from "@/lib/queryKeys";
import { isInitiativeReadModelEnabled } from "@/lib/operationalFeature";
import { initiativeResolver } from "@/services/initiativeResolver";

const STALE_MS = 60_000;
const GC_MS = 300_000;

export function initiativeCatalogQueryOptions() {
  const enabled = isInitiativeReadModelEnabled();
  return {
    queryKey: initiativeKeys.all,
    queryFn: () => initiativeResolver.resolveAll(),
    staleTime: STALE_MS,
    gcTime: GC_MS,
    enabled,
  };
}

export function initiativeDetailQueryOptions(id: string) {
  const enabled = isInitiativeReadModelEnabled() && id.length > 0;
  return {
    queryKey: initiativeKeys.detail(id),
    queryFn: () => initiativeResolver.resolveById(id),
    staleTime: STALE_MS,
    gcTime: GC_MS,
    enabled,
    retry: false as const,
  };
}
