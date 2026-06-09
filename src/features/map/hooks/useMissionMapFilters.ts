import { useState, useMemo, useCallback } from "react";
import type { Mission, MapCoords, Region, MissionCategory, MissionDifficulty } from "@/types";
import type { MapFilterState } from "../types";
import type { CivicEntity } from "@/types/entity";
import { isMission } from "@/types/entity";
import { calculateHaversineDistance, isValidLatLng } from "../utils/projection";
import { sortByLifecyclePriority } from "@/domain/lifecycle";

const INITIAL_FILTER_STATE: MapFilterState = {
  region: "todas",
  district: "todas",
  category: "todas",
  difficulty: "todas",
  searchQuery: "",
  proximityRadiusKm: null,
};

export function useMissionMapFilters(entities: CivicEntity[], userCoords?: MapCoords | null) {
  const [filters, setFilters] = useState<MapFilterState>(INITIAL_FILTER_STATE);

  const updateFilters = useCallback(
    (updater: Partial<MapFilterState> | ((prev: MapFilterState) => MapFilterState)) => {
      setFilters((prev) => {
        const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
        return next;
      });
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTER_STATE);
  }, []);

  // Only missions have difficulty/category enums — skip proposals for filter options
  const missions = entities.filter(isMission);

  const availableRegions = useMemo(() => {
    const regions = new Set<Region>();
    missions.forEach((m) => regions.add(m.region));
    return Array.from(regions);
  }, [missions]);

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    missions.forEach((m) => categories.add(m.category));
    return Array.from(categories);
  }, [missions]);

  const availableDifficulties = useMemo(() => {
    const difficulties = new Set<MissionDifficulty>();
    missions.forEach((m) => difficulties.add(m.difficulty));
    return Array.from(difficulties);
  }, [missions]);

  const availableDistricts = useMemo(() => {
    const districtCounts = new Map<string, number>();
    entities.forEach((m) => {
      const count = districtCounts.get(m.district) || 0;
      districtCounts.set(m.district, count + 1);
    });
    return Array.from(districtCounts.entries())
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count);
  }, [entities]);

  const filteredMissions = useMemo(() => {
    const result: CivicEntity[] = [];
    const hidden: Array<{ entity: CivicEntity; reason: string }> = [];

    entities.forEach((mission) => {
      let hiddenReason: string | null = null;

      // 1. Region filter
      if (filters.region !== "todas" && mission.region !== filters.region) {
        hiddenReason = `region filter (mission.region=${mission.region}, filter=${filters.region})`;
      }

      // 2. District filter
      if (!hiddenReason && filters.district !== "todas" && mission.district !== filters.district) {
        hiddenReason = `district filter (mission.district=${mission.district}, filter=${filters.district})`;
      }

      // 3. Category filter
      if (!hiddenReason && filters.category !== "todas" && mission.category !== filters.category) {
        hiddenReason = `category filter (mission.category=${mission.category}, filter=${filters.category})`;
      }

      // 4. Difficulty filter — only missions have difficulty
      if (
        !hiddenReason &&
        filters.difficulty !== "todas" &&
        isMission(mission) &&
        mission.difficulty !== filters.difficulty
      ) {
        hiddenReason = `difficulty filter (mission.difficulty=${mission.difficulty}, filter=${filters.difficulty})`;
      }

      // 5. Search query
      if (!hiddenReason && filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase().trim();
        const titleMatch = mission.title.toLowerCase().includes(query);
        const descMatch = mission.description?.toLowerCase().includes(query) ?? false;
        const districtMatch = mission.district.toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !districtMatch) {
          hiddenReason = `search query (query="${filters.searchQuery}")`;
        }
      }

      // 6. Proximity filter (if user coordinates are valid and radius is set)
      if (
        !hiddenReason &&
        filters.proximityRadiusKm &&
        userCoords &&
        isValidLatLng(userCoords.lat, userCoords.lng)
      ) {
        if (!mission.coords || !isValidLatLng(mission.coords.lat, mission.coords.lng)) {
          hiddenReason = `missing or invalid coords`;
        } else {
          const distance = calculateHaversineDistance(userCoords, mission.coords);
          if (distance > filters.proximityRadiusKm) {
            hiddenReason = `proximity filter (distance=${distance.toFixed(2)}km, radius=${filters.proximityRadiusKm}km)`;
          }
        }
      }

      if (hiddenReason) {
        hidden.push({ entity: mission, reason: hiddenReason });
      } else {
        result.push(mission);
      }
    });

    if (import.meta.env.DEV) {
      console.log(
        "[KUSQA ENTITY TRACE] Map filters:",
        entities.length,
        "input →",
        result.length,
        "output (hidden:",
        hidden.length,
        ")",
      );
      console.log("[KUSQA ENTITY TRACE] Active filters:", filters);
      if (hidden.length > 0) {
        console.log("[KUSQA ENTITY TRACE] Hidden entities:");
        hidden.forEach(({ entity, reason }) => {
          console.log("[KUSQA ENTITY TRACE] Hidden:", {
            id: entity.id,
            title: entity.title,
            region: entity.region,
            category: entity.category,
            entityType: entity.entityType,
            hiddenReason: reason,
          });
        });
      }
    }

    return result.sort(sortByLifecyclePriority);
  }, [entities, filters, userCoords]);

  return {
    filters,
    updateFilters,
    resetFilters,
    filteredMissions,
    availableRegions,
    availableCategories,
    availableDifficulties,
    availableDistricts,
  };
}
