import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { districtRepository } from "@/services/districtRepository";
import { districtsListQueryOptions } from "@/features/districts/queryOptions";
import { districtActivityToTerritorial } from "@/domain/territorialEvent";
import { buildDistrictMemory } from "@/services/districtMemoryResolver";
import { isLivingTerritoryEnabled } from "@/lib/operationalFeature";
import type { Initiative } from "@/domain/initiative";
import type { DistrictMemory } from "@/domain/territorialMemory";
import type { District } from "@/services/districtRepository";

type LandingMemory = {
  district: District;
  memory: DistrictMemory;
};

export function useLandingMemory(initiatives: Initiative[]): LandingMemory | null {
  const flagOn = isLivingTerritoryEnabled();

  const { data: districts = [] } = useQuery({
    ...districtsListQueryOptions(),
    enabled: flagOn,
    staleTime: 300_000,
    gcTime: 600_000,
  });

  const mostActiveDistrict = useMemo<District | null>(() => {
    if (!flagOn || districts.length === 0) return null;

    const counts = new Map<string, number>();
    for (const init of initiatives) {
      const districtName = init.location?.district;
      const district = districts.find(
        (d) => d.displayName === districtName || d.slug === districtName,
      );
      if (district) {
        counts.set(district.id, (counts.get(district.id) ?? 0) + 1);
      }
    }

    if (counts.size === 0) {
      return districts[0] ?? null;
    }

    const topId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return districts.find((d) => d.id === topId) ?? null;
  }, [flagOn, districts, initiatives]);

  const { data: activity = [] } = useQuery({
    queryKey: ["landing-district-activity", mostActiveDistrict?.id],
    queryFn: () =>
      mostActiveDistrict
        ? districtRepository.getDistrictActivity(mostActiveDistrict.id, 50)
        : [],
    enabled: flagOn && mostActiveDistrict != null,
    staleTime: 60_000,
    gcTime: 300_000,
  });

  return useMemo<LandingMemory | null>(() => {
    if (!flagOn || !mostActiveDistrict) return null;

    const events = activity.map((a) =>
      districtActivityToTerritorial(a, mostActiveDistrict.id, mostActiveDistrict.region),
    );

    const districtInitiatives = initiatives.filter((init) => {
      const name = init.location?.district;
      return (
        name === mostActiveDistrict.displayName || name === mostActiveDistrict.slug
      );
    });

    const memory = buildDistrictMemory(events, districtInitiatives);
    if (!memory) return null;

    return { district: mostActiveDistrict, memory };
  }, [flagOn, mostActiveDistrict, activity, initiatives]);
}
