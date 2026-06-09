/**
 * Mission Selection Domain Logic
 *
 * Pure functions for selecting and ordering missions/proposals.
 * Extracted from UI layer to improve testability and separation of concerns.
 */

import type { CivicEntity } from "@/types/entity";
import type { Region } from "@/types";

/**
 * Select featured missions with territorial diversity priority.
 *
 * Strategy:
 * - If missions span multiple regions: take one from each region, then fill
 * - If all missions in one region: distribute by category for internal diversity
 * - Always return max 3 missions
 */
export function selectFeaturedMissions(entities: CivicEntity[]): CivicEntity[] {
  if (entities.length === 0) return [];

  const byRegion: Record<string, CivicEntity[]> = {};
  entities.forEach((m) => {
    if (!byRegion[m.region]) byRegion[m.region] = [];
    byRegion[m.region].push(m);
  });

  const regionCount = Object.keys(byRegion).length;

  // If missions are spread across multiple regions: take one from each, then fill
  if (regionCount >= 2) {
    const selected: CivicEntity[] = [];
    ["sierra", "costa", "selva"].forEach((region) => {
      const pool = byRegion[region];
      if (pool && pool.length > 0) selected.push(pool[0]);
    });
    const remaining = entities.filter((m) => !selected.includes(m));
    selected.push(...remaining.slice(0, 3 - selected.length));
    return selected.slice(0, 3);
  }

  // If all missions are in one region: distribute by category/district for internal diversity
  const singleRegion = Object.keys(byRegion)[0] as Region;
  const pool = byRegion[singleRegion];

  if (pool.length <= 3) {
    return pool.slice(0, 3);
  }

  // Group by category to pick diverse missions
  const byCategory: Record<string, CivicEntity[]> = {};
  pool.forEach((m) => {
    if (!byCategory[m.category]) byCategory[m.category] = [];
    byCategory[m.category].push(m);
  });

  const categories = Object.keys(byCategory);
  const selected: CivicEntity[] = [];

  // Take one from each category until we have 3
  for (const cat of categories) {
    if (selected.length >= 3) break;
    selected.push(byCategory[cat][0]);
  }

  // Fill remaining slots with any missions not yet selected
  const remaining = pool.filter((m) => !selected.includes(m));
  selected.push(...remaining.slice(0, 3 - selected.length));

  return selected.slice(0, 3);
}

/**
 * Select nearby missions based on user's region.
 *
 * Strategy:
 * - If user has a region: filter to that region
 * - If no user region: return first 2 missions as fallback
 * - Always return max 2 missions
 */
export function selectNearbyMissions(entities: CivicEntity[], userRegion?: Region): CivicEntity[] {
  const nearbyRaw = userRegion
    ? entities.filter((m) => m.region === userRegion)
    : entities.slice(0, 2);
  return nearbyRaw.length > 0 ? nearbyRaw : entities.slice(0, 2);
}

/**
 * Select feed items with adaptive proposal visibility.
 *
 * Strategy:
 * - Show up to 3 entities (mix of missions and proposals)
 * - Simple slice for now, can be enhanced with scoring later
 */
export function selectFeedItems(entities: CivicEntity[]): CivicEntity[] {
  const missionCount = Math.min(entities.length, 3);
  return entities.slice(0, missionCount);
}

/**
 * Build territory metadata for a given region.
 *
 * Strategy:
 * - Filter entities by region
 * - Calculate category distribution
 * - Determine lead category
 * - Return territory metadata with preview mission
 */
export function buildTerritory(
  entities: CivicEntity[],
  region: Region,
  id: string,
  name: string,
  fallbackQuote: string,
  fallbackCategory: string,
  emoji: string,
) {
  const pool = entities.filter((m) => m.region === region);
  const counts: Record<string, number> = {};
  pool.forEach((m) => {
    counts[m.category] = (counts[m.category] || 0) + 1;
  });
  const leadCategory =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || fallbackCategory;
  const preview = pool[0] ?? null;
  return {
    id,
    name,
    region,
    activeMissionsCount: pool.length,
    leadCategory,
    preview,
    imageEmoji: emoji,
    quote: fallbackQuote,
    link: "/app/mapa",
  };
}

/**
 * Calculate aggregate stats from entities.
 */
export function calculateEntityStats(entities: CivicEntity[]) {
  const activeDistricts = new Set(entities.map((m) => m.district)).size;
  const totalParticipants = entities.reduce(
    (acc, m) => acc + (m.entityType === "mission" ? m.participants : 0),
    0,
  );
  const totalHoursRaw = Math.round(totalParticipants * 3.5);
  const totalHoursLabel =
    totalHoursRaw >= 1000 ? `${(totalHoursRaw / 1000).toFixed(1)}K` : `${totalHoursRaw}`;

  return {
    activeDistricts,
    totalParticipants,
    totalHoursRaw,
    totalHoursLabel,
  };
}
