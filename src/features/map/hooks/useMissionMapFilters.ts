import { useState, useMemo, useCallback } from "react";
import type { Mission, MapCoords } from "@/types";
import type { MapFilterState } from "../types";
import { calculateHaversineDistance, isValidLatLng } from "../utils/projection";

const INITIAL_FILTER_STATE: MapFilterState = {
  region: "todas",
  category: "todas",
  difficulty: "todas",
  searchQuery: "",
  proximityRadiusKm: null,
};

export function useMissionMapFilters(missions: Mission[], userCoords?: MapCoords | null) {
  const [filters, setFilters] = useState<MapFilterState>(INITIAL_FILTER_STATE);

  const updateFilters = useCallback((updater: Partial<MapFilterState> | ((prev: MapFilterState) => MapFilterState)) => {
    setFilters((prev) => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTER_STATE);
  }, []);

  const filteredMissions = useMemo(() => {
    return missions.filter((mission) => {
      // 1. Region filter
      if (filters.region !== "todas" && mission.region !== filters.region) {
        return false;
      }

      // 2. Category filter
      if (filters.category !== "todas" && mission.category !== filters.category) {
        return false;
      }

      // 3. Difficulty filter
      if (filters.difficulty !== "todas" && mission.difficulty !== filters.difficulty) {
        return false;
      }

      // 4. Search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase().trim();
        const titleMatch = mission.title.toLowerCase().includes(query);
        const descMatch = mission.description.toLowerCase().includes(query);
        const districtMatch = mission.district.toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !districtMatch) {
          return false;
        }
      }

      // 5. Proximity filter (if user coordinates are valid and radius is set)
      if (filters.proximityRadiusKm && userCoords && isValidLatLng(userCoords.lat, userCoords.lng)) {
        if (!mission.coords || !isValidLatLng(mission.coords.lat, mission.coords.lng)) {
          return false;
        }
        const distance = calculateHaversineDistance(userCoords, mission.coords);
        if (distance > filters.proximityRadiusKm) {
          return false;
        }
      }

      return true;
    });
  }, [missions, filters, userCoords]);

  return {
    filters,
    updateFilters,
    resetFilters,
    filteredMissions,
  };
}
