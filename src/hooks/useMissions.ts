import { useQuery } from "@tanstack/react-query";
import {
  missionCatalogQueryOptions,
  missionDetailQueryOptions,
} from "@/features/auth/queryOptions";

export { missionKeys } from "@/lib/queryKeys";

type UseMissionOptions = {
  enabled?: boolean;
};

export function useMissions() {
  const query = useQuery(missionCatalogQueryOptions());

  if (import.meta.env.DEV && query.data) {
    console.log(
      "[KUSQA MISSION TRACE] useMissions: Retrieved",
      query.data.length,
      "missions from cache/network",
    );
  }

  return query;
}

export function useMission(missionId: string, options?: UseMissionOptions) {
  const enabled = (options?.enabled ?? true) && missionId.length > 0;

  return useQuery({
    ...missionDetailQueryOptions(missionId),
    enabled,
  });
}
