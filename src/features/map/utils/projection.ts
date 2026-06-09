import type { MapCoords } from "@/types";
import { PERU_BOUNDING_BOX } from "../constants/mapConstants";

export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    lat >= PERU_BOUNDING_BOX.minLat &&
    lat <= PERU_BOUNDING_BOX.maxLat &&
    lng >= PERU_BOUNDING_BOX.minLng &&
    lng <= PERU_BOUNDING_BOX.maxLng
  );
}

export { calculateDistance as calculateHaversineDistance } from "@/domain/territorial";
