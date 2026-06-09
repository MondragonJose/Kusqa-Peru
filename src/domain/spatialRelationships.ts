import type { DistrictGeometry } from "@/services/spatialRepository";
import { calculateDistance } from "@/domain/territorial";
import type { MapCoords } from "@/types";

export type SpatialAdjacency = {
  slug: string;
  name: string;
  distanceKm: number;
};

export type AdjacencyMap = Map<string, SpatialAdjacency[]>;

export type SpreadLevel = "compact" | "moderate" | "dispersed";

export type ContinuityStatus = "contiguous" | "fragmented" | "isolated";

export type ConvergenceZone = string[];

const NEIGHBOR_THRESHOLD_KM = 25;
const COMPACT_THRESHOLD_KM = 30;
const DISPERSED_THRESHOLD_KM = 80;

function toCoords(g: DistrictGeometry): MapCoords | null {
  if (g.latitude == null || g.longitude == null) return null;
  return { lat: g.latitude, lng: g.longitude };
}

export function buildAdjacencyMap(
  geometries: DistrictGeometry[],
  thresholdKm: number = NEIGHBOR_THRESHOLD_KM,
): AdjacencyMap {
  const map: AdjacencyMap = new Map();
  const coords = new Map<string, MapCoords>();

  for (const g of geometries) {
    const c = toCoords(g);
    if (c) coords.set(g.slug, c);
  }

  for (const [slug, c1] of coords) {
    const neighbors: SpatialAdjacency[] = [];
    for (const [otherSlug, c2] of coords) {
      if (slug === otherSlug) continue;
      const dist = calculateDistance(c1, c2);
      if (dist <= thresholdKm) {
        neighbors.push({
          slug: otherSlug,
          name: geometries.find((g) => g.slug === otherSlug)?.displayName ?? otherSlug,
          distanceKm: Math.round(dist * 10) / 10,
        });
      }
    }
    neighbors.sort((a, b) => a.distanceKm - b.distanceKm);
    map.set(slug, neighbors);
  }

  return map;
}

export function buildGeometryCoordMap(
  geometries: DistrictGeometry[],
): Map<string, MapCoords> {
  const map = new Map<string, MapCoords>();
  for (const g of geometries) {
    const c = toCoords(g);
    if (c) map.set(g.slug, c);
  }
  return map;
}

export function computeTerritorialSpread(
  slugs: string[],
  coordMap: Map<string, MapCoords>,
): { spreadKm: number; level: SpreadLevel } {
  if (slugs.length < 2) return { spreadKm: 0, level: "compact" };

  let maxDist = 0;
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const c1 = coordMap.get(slugs[i]);
      const c2 = coordMap.get(slugs[j]);
      if (!c1 || !c2) continue;
      const dist = calculateDistance(c1, c2);
      if (dist > maxDist) maxDist = dist;
    }
  }

  const level: SpreadLevel =
    maxDist <= COMPACT_THRESHOLD_KM
      ? "compact"
      : maxDist <= DISPERSED_THRESHOLD_KM
        ? "moderate"
        : "dispersed";

  return { spreadKm: Math.round(maxDist * 10) / 10, level };
}

export function checkContiguity(
  slugs: string[],
  adjacencyMap: AdjacencyMap,
): ContinuityStatus {
  if (slugs.length <= 1) return "isolated";

  const visited = new Set<string>();
  const queue = [slugs[0]];
  visited.add(slugs[0]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacencyMap.get(current) ?? [];
    for (const n of neighbors) {
      if (!visited.has(n.slug) && slugs.includes(n.slug)) {
        visited.add(n.slug);
        queue.push(n.slug);
      }
    }
  }

  const connected = visited.size;
  if (connected === slugs.length) return "contiguous";
  if (connected >= 2) return "fragmented";
  return "isolated";
}

export function detectCorridor(
  slugs: string[],
  adjacencyMap: AdjacencyMap,
): { isCorridor: boolean; chainLength: number } {
  if (slugs.length < 3) return { isCorridor: false, chainLength: 0 };

  const visited = new Set<string>();
  let longestChain = 0;

  for (const slug of slugs) {
    if (visited.has(slug)) continue;

    const component: string[] = [];
    const queue = [slug];
    visited.add(slug);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      const neighbors = adjacencyMap.get(current) ?? [];
      for (const n of neighbors) {
        if (!visited.has(n.slug) && slugs.includes(n.slug)) {
          visited.add(n.slug);
          queue.push(n.slug);
        }
      }
    }

    if (component.length > longestChain) longestChain = component.length;
  }

  return { isCorridor: longestChain >= 3, chainLength: longestChain };
}

export function detectIsolation(
  slug: string,
  activeSlugs: string[],
  adjacencyMap: AdjacencyMap,
): boolean {
  const neighbors = adjacencyMap.get(slug) ?? [];
  return !neighbors.some((n) => activeSlugs.includes(n.slug));
}

export function findConvergenceZones(
  activeSlugs: string[],
  adjacencyMap: AdjacencyMap,
): ConvergenceZone[] {
  const unvisited = new Set(activeSlugs);
  const zones: ConvergenceZone[] = [];

  for (const slug of activeSlugs) {
    if (!unvisited.has(slug)) continue;

    const zone: string[] = [];
    const queue = [slug];
    unvisited.delete(slug);

    while (queue.length > 0) {
      const current = queue.shift()!;
      zone.push(current);
      const neighbors = adjacencyMap.get(current) ?? [];
      for (const n of neighbors) {
        if (unvisited.has(n.slug)) {
          unvisited.delete(n.slug);
          queue.push(n.slug);
        }
      }
    }

    if (zone.length > 0) zones.push(zone);
  }

  return zones;
}
