import { useQuery } from "@tanstack/react-query";
import {
  initiativeCatalogQueryOptions,
  initiativeDetailQueryOptions,
} from "@/features/initiatives/queryOptions";

export function useInitiatives() {
  return useQuery(initiativeCatalogQueryOptions());
}

export function useInitiative(id: string) {
  return useQuery(initiativeDetailQueryOptions(id));
}
