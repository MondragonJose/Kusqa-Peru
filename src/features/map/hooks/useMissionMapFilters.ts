import { useState, useMemo, useCallback } from "react";
import type { InitiativeMapEntity } from "@/domain/initiativeMapEntity";
import { isMissionEntity, isProposalEntity } from "@/features/map/projections/mapEntityProjection";
import type { MapCoords, Region, MissionCategory, MissionDifficulty } from "@/types";
import type { MapFilterState } from "../types";
import { calculateHaversineDistance, isValidLatLng } from "../utils/projection";

const INITIAL_FILTER_STATE: MapFilterState = {
  region: "todas",
  district: "todas",
  category: "todas",
  difficulty: "todas",
  searchQuery: "",
  proximityRadiusKm: null,
};

const ENTITY_LIFECYCLE_PRIORITY: Record<string, number> = {
  active: 0,
  ending: 1,
  forming: 2,
  completed: 3,
  archived: 4,
};

function sortByEntityPriority(a: InitiativeMapEntity, b: InitiativeMapEntity): number {
  return (
    (ENTITY_LIFECYCLE_PRIORITY[a.lifecycle] ?? 99) - (ENTITY_LIFECYCLE_PRIORITY[b.lifecycle] ?? 99)
  );
}

export function useMissionMapFilters(
  entities: InitiativeMapEntity[],
  userCoords?: MapCoords | null,
) {
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

  const missions = entities.filter(isMissionEntity);

  const availableRegions = useMemo(() => {
    const regions = new Set<Region>();
    missions.forEach((m) => regions.add(m.region as Region));
    return Array.from(regions);
  }, [missions]);

  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    missions.forEach((m) => categories.add(m.category));
    return Array.from(categories);
  }, [missions]);

  const availableDifficulties = useMemo(() => {
    const difficulties = new Set<MissionDifficulty>();
    missions.forEach((m) => {
      if (m.difficulty) difficulties.add(m.difficulty as MissionDifficulty);
    });
    return Array.from(difficulties);
  }, [missions]);

  const availableDistricts = useMemo(() => {
    const districtCounts = new Map<string, number>();
    entities.forEach((e) => {
      const district = e.location?.district ?? e.region;
      const count = districtCounts.get(district) || 0;
      districtCounts.set(district, count + 1);
    });
    return Array.from(districtCounts.entries())
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count);
  }, [entities]);

  const filteredMissions = useMemo(() => {
    const result: InitiativeMapEntity[] = [];
    const hidden: Array<{ entity: InitiativeMapEntity; reason: string }> = [];

    entities.forEach((entity) => {
      let hiddenReason: string | null = null;

      if (filters.region !== "todas" && entity.region !== filters.region) {
        hiddenReason = `region filter`;
      }

      if (!hiddenReason && filters.district !== "todas") {
        const entityDistrict = entity.location?.district ?? entity.region;
        if (entityDistrict !== filters.district) {
          hiddenReason = `district filter`;
        }
      }

      if (!hiddenReason && filters.category !== "todas" && entity.category !== filters.category) {
        hiddenReason = `category filter`;
      }

      if (
        !hiddenReason &&
        filters.difficulty !== "todas" &&
        isMissionEntity(entity) &&
        entity.difficulty !== filters.difficulty
      ) {
        hiddenReason = `difficulty filter (entity.difficulty=${entity.difficulty}, filter=${filters.difficulty})`;
      }

      if (!hiddenReason && filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase().trim();
        const titleMatch = entity.title.toLowerCase().includes(query);
        const summaryMatch = entity.summary.toLowerCase().includes(query);
        const districtMatch = (entity.location?.district ?? entity.region)
          .toLowerCase()
          .includes(query);
        if (!titleMatch && !summaryMatch && !districtMatch) {
          hiddenReason = `search query`;
        }
      }

      if (
        !hiddenReason &&
        filters.proximityRadiusKm &&
        userCoords &&
        isValidLatLng(userCoords.lat, userCoords.lng)
      ) {
        const coords = entity.location?.coords;
        if (!coords || !isValidLatLng(coords.lat, coords.lng)) {
          hiddenReason = `missing or invalid coords`;
        } else {
          const distance = calculateHaversineDistance(userCoords, coords);
          if (distance > filters.proximityRadiusKm) {
            hiddenReason = `proximity filter`;
          }
        }
      }

      if (hiddenReason) {
        hidden.push({ entity, reason: hiddenReason });
      } else {
        result.push(entity);
      }
    });

    if (import.meta.env.DEV) {
      console.log(
        "[KUSQA MAP ENTITY TRACE] Map filters:",
        entities.length,
        "input →",
        result.length,
        "output (hidden:",
        hidden.length,
        ")",
      );
      console.log("[KUSQA MAP ENTITY TRACE] Active filters:", filters);
    }

    return result.sort(sortByEntityPriority);
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
