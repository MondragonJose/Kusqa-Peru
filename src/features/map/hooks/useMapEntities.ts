import { useQuery } from "@tanstack/react-query";
import { initiativeResolver } from "@/services/initiativeResolver";
import type { InitiativeMapEntity } from "@/domain/initiativeMapEntity";

const STALE_MS = 60_000;
const GC_MS = 300_000;

const MAP_ENTITIES_KEY = ["map-entities"] as const;

export function useMapEntities() {
  return useQuery<InitiativeMapEntity[]>({
    queryKey: MAP_ENTITIES_KEY,
    queryFn: () => initiativeResolver.resolveMapEntities(),
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });
}
