/**
 * Territorial Domain Logic
 * 
 * Pure functions for territorial inference and region detection.
 * Consolidated from multiple sources to provide single source of truth.
 */

import type { MapCoords, Region } from "@/types";

/**
 * Infer region from district name using keyword matching.
 * 
 * Strategy:
 * - Check for sierra keywords: cusco, puno, chinchero, andes, sierra
 * - Check for selva keywords: iquitos, loreto, amazon, selva
 * - Default to costa
 */
export function inferRegionFromDistrict(district: string | null): Region {
  if (!district) return "costa";
  const normalized = district.toLowerCase();
  
  if (
    normalized.includes("cusco") ||
    normalized.includes("puno") ||
    normalized.includes("chinchero") ||
    normalized.includes("andes") ||
    normalized.includes("sierra")
  ) {
    return "sierra";
  }
  
  if (
    normalized.includes("iquitos") ||
    normalized.includes("loreto") ||
    normalized.includes("amazon") ||
    normalized.includes("selva")
  ) {
    return "selva";
  }
  
  return "costa";
}

/**
 * Infer region from geographic coordinates.
 * 
 * Strategy:
 * - lng < -76.5: costa (west coast)
 * - lat > -6.0: selva (northern amazon)
 * - default: sierra (andes)
 */
export function inferRegionFromCoords(coords: MapCoords): Region {
  if (coords.lng < -76.5) {
    return "costa"; // Costa oeste
  }
  if (coords.lat > -6.0) {
    return "selva"; // Selva norte/oriente
  }
  return "sierra"; // Andes / Sierra centro y sur
}

/**
 * Unified region inference from either coordinates or district.
 * 
 * Strategy:
 * - If coords provided, use coordinate-based inference
 * - If district provided, use district-based inference
 * - If both provided, prefer coordinates (more precise)
 * - If neither provided, default to costa
 */
export function inferRegion(coords?: MapCoords, district?: string): Region {
  if (coords) {
    return inferRegionFromCoords(coords);
  }
  if (district) {
    return inferRegionFromDistrict(district);
  }
  return "costa";
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 * 
 * Note: This is a wrapper around the map projection utility.
 * In the future, this could be moved here for pure domain logic.
 */
export function calculateDistance(from: MapCoords, to: MapCoords): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Check if coordinates are within Peru's bounding box.
 * 
 * Strategy:
 * - Simple lat/lng validation for Peru's approximate bounds
 */
export function isWithinPeruBounds(coords: MapCoords): boolean {
  // Approximate Peru bounds
  const MIN_LAT = -18.0;
  const MAX_LAT = -0.0;
  const MIN_LNG = -81.0;
  const MAX_LNG = -68.0;
  
  return (
    coords.lat >= MIN_LAT &&
    coords.lat <= MAX_LAT &&
    coords.lng >= MIN_LNG &&
    coords.lng <= MAX_LNG
  );
}
