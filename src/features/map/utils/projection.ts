import type { MapCoords } from "@/types";
import { PERU_BOUNDING_BOX } from "../constants/mapConstants";

/**
 * Validates whether geographic coordinates reside within Peru's bounding box boundaries.
 */
export function isValidLatLng(lat: number, lng: number): boolean {
  return (
    lat >= PERU_BOUNDING_BOX.minLat &&
    lat <= PERU_BOUNDING_BOX.maxLat &&
    lng >= PERU_BOUNDING_BOX.minLng &&
    lng <= PERU_BOUNDING_BOX.maxLng
  );
}

/**
 * Calculates physical distance in kilometers between two GPS coordinates using the Haversine formula.
 */
export function calculateHaversineDistance(
  coords1: MapCoords,
  coords2: MapCoords
): number {
  const earthRadiusKm = 6371;

  const dLat = degreesToRadians(coords2.lat - coords1.lat);
  const dLng = degreesToRadians(coords2.lng - coords1.lng);

  const lat1Rad = degreesToRadians(coords1.lat);
  const lat2Rad = degreesToRadians(coords2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) *
      Math.sin(dLng / 2) *
      Math.cos(lat1Rad) *
      Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
