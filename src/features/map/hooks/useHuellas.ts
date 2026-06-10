import { useQuery } from "@tanstack/react-query";
import { traceRepository, type BBox } from "@/services/traceRepository";
import { deriveCivicTrace } from "@/domain/civicTrace";
import type { CivicTrace } from "@/domain/civicTrace";

const STALE_MS = 60_000;
const GC_MS = 300_000;

export function useHuellas(bbox?: BBox) {
  return useQuery<CivicTrace[]>({
    queryKey: bbox ? ["huellas", bbox] : ["huellas"],
    queryFn: async () => {
      const inputs = await traceRepository.findTraces(bbox);
      return inputs.reduce<CivicTrace[]>((acc, input) => {
        const trace = deriveCivicTrace(input);
        if (trace) acc.push(trace);
        return acc;
      }, []);
    },
    staleTime: STALE_MS,
    gcTime: GC_MS,
  });
}
