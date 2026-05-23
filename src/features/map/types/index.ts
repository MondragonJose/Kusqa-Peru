import type { MapCoords, Region, MissionCategory, MissionDifficulty } from "@/types";

export type GeolocationErrorType = 
  | "PERMISSION_DENIED"
  | "POSITION_UNAVAILABLE"
  | "TIMEOUT"
  | "UNKNOWN_ERROR";

export type UserLocationState = {
  coords: MapCoords | null;
  loading: boolean;
  error: GeolocationErrorType | null;
  errorMessage: string | null;
};

export type MapFilterState = {
  region: Region | "todas";
  category: MissionCategory | "todas";
  difficulty: MissionDifficulty | "todas";
  searchQuery: string;
  proximityRadiusKm: number | null;
};

/** PlaceSuggestion: moved here from services/googleMaps.ts for architectural correctness */
export type PlaceSuggestion = {
  description: string;
  district: string;
  region: Region;
  coords: MapCoords;
};

