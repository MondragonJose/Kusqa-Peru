/**
 * Territorial Domain Logic
 *
 * Pure functions for territorial inference and region detection.
 * SVG coordinate lookups are data-driven when geometry is provided,
 * falling back to hardcoded values for backward compatibility.
 */

import type { MapCoords, Mission, Region } from "@/types";

/**
 * SVG coordinates for known districts within the 240×360 Peru silhouette viewBox.
 * Phase 12: these are now seeded in the districts table. This hardcoded fallback
 * is kept for backward compatibility when spatial data is not loaded.
 */
const DISTRICT_SVG_COORDS: Record<string, { x: number; y: number }> = {
  barranco: { x: 75, y: 105 },
  miraflores: { x: 77, y: 103 },
  sjl: { x: 80, y: 108 },
  trujillo: { x: 60, y: 75 },
  "cusco-dist": { x: 125, y: 165 },
  chinchero: { x: 130, y: 158 },
  urubamba: { x: 135, y: 155 },
  "puno-dist": { x: 120, y: 245 },
  "iquitos-dist": { x: 160, y: 65 },
};

const REGION_SVG_CENTER: Record<Region, { x: number; y: number }> = {
  costa: { x: 85, y: 100 },
  sierra: { x: 125, y: 180 },
  selva: { x: 145, y: 275 },
};

export type ActivatedDistrict = {
  name: string;
  region: Region;
  missionCount: number;
  svgX: number;
  svgY: number;
};

export type Footprint = {
  visitedRegions: Region[];
  exploredRegions: Region[];
  activeDistricts: ActivatedDistrict[];
  totalMissions: number;
};

/**
 * Resolve SVG coordinates for a district from either a geometry lookup or
 * hardcoded fallback. Accepts an optional map of slug→svg coords for
 * data-driven resolution.
 */
type SvgCoordMap = Record<string, { x: number; y: number }>;

export function resolveSvgCoords(
  district: string,
  region: Region,
  geometrySvgCoords?: SvgCoordMap | null,
): { x: number; y: number } {
  // Prefer data-driven geometry if available
  if (geometrySvgCoords) {
    const key = district.toLowerCase().trim();
    const known = geometrySvgCoords[key];
    if (known) return known;
    const partial = Object.entries(geometrySvgCoords).find(
      ([k]) => key.includes(k) || k.includes(key),
    );
    if (partial) return partial[1];
    return REGION_SVG_CENTER[region];
  }

  // Fallback to hardcoded SVG coords
  const key = district.toLowerCase().trim();
  const known = DISTRICT_SVG_COORDS[key];
  if (known) return known;
  const partial = Object.entries(DISTRICT_SVG_COORDS).find(
    ([k]) => key.includes(k) || k.includes(key),
  );
  if (partial) return partial[1];
  return REGION_SVG_CENTER[region];
}

/** Aggregate mission timeline into a Footprint — pure, memoizable. */
export function computeFootprint(
  missions: Mission[],
  geometrySvgCoords?: SvgCoordMap | null,
): Footprint {
  const districtMap = new Map<string, { count: number; region: Region }>();
  const regionCount = new Map<Region, number>();

  for (const m of missions) {
    const d = m.district || "unknown";
    const cur = districtMap.get(d);
    districtMap.set(d, { count: (cur?.count ?? 0) + 1, region: m.region });
    regionCount.set(m.region, (regionCount.get(m.region) ?? 0) + 1);
  }

  const activeDistricts: ActivatedDistrict[] = [];
  for (const [name, data] of districtMap) {
    const coords = resolveSvgCoords(name, data.region, geometrySvgCoords);
    activeDistricts.push({
      name,
      region: data.region,
      missionCount: data.count,
      svgX: coords.x,
      svgY: coords.y,
    });
  }

  activeDistricts.sort((a, b) => a.region.localeCompare(b.region));

  const visitedRegions: Region[] = [];
  const exploredRegions: Region[] = [];
  for (const [region, count] of regionCount) {
    visitedRegions.push(region);
    if (count >= 3) exploredRegions.push(region);
  }

  visitedRegions.sort((a, b) => a.localeCompare(b));
  exploredRegions.sort((a, b) => a.localeCompare(b));

  return {
    visitedRegions,
    exploredRegions,
    activeDistricts,
    totalMissions: missions.length,
  };
}

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
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
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
    coords.lat >= MIN_LAT && coords.lat <= MAX_LAT && coords.lng >= MIN_LNG && coords.lng <= MAX_LNG
  );
}
