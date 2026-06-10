import type { TerritorialImpactSummary } from "./territoryAggregations";
import type { AdjacencyMap } from "./spatialRelationships";

export type RelatedTerritorialActivity = {
  activityCount: number;
  neighboringSlugs: string[];
  recentActivity: boolean;
  coordinationSignal: boolean;
};

export type AdjacentCoalitionEmergence = {
  emergingCoalitions: number;
  coalitionSlugs: string[];
  hasAdjacentCoalitions: boolean;
};

export type NeighboringMissionContinuity = {
  hasContinuity: boolean;
  contiguousMissions: number;
  corridorForming: boolean;
};

export function findRelatedTerritorialActivity(
  districtSlug: string,
  summaries: TerritorialImpactSummary[],
  adjacencyMap: AdjacencyMap,
): RelatedTerritorialActivity {
  const neighbors = adjacencyMap.get(districtSlug) ?? [];
  const neighboringSlugs: string[] = [];
  let activityCount = 0;
  let recentActivity = false;
  let coordinationSignal = false;

  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  for (const n of neighbors) {
    const summary = summaries.find((s: TerritorialImpactSummary) => s.lastActivityAt);
    if (!summary || !summary.lastActivityAt) continue;
    activityCount += summary.missionCount + summary.proposalCount;
    neighboringSlugs.push(n.slug);
    const age = now - new Date(summary.lastActivityAt).getTime();
    if (age < thirtyDays) recentActivity = true;
    if (summary.acceptedCollaboratorCount > 0 && summary.uniqueSupporterCount > 0) {
      coordinationSignal = true;
    }
  }

  return { activityCount, neighboringSlugs, recentActivity, coordinationSignal };
}

export function detectAdjacentCoalitionEmergence(
  districtSlug: string,
  adjacencyMap: AdjacencyMap,
  summaries: Map<string, TerritorialImpactSummary>,
): AdjacentCoalitionEmergence {
  const neighbors = adjacencyMap.get(districtSlug) ?? [];
  const coalitionSlugs: string[] = [];

  for (const n of neighbors) {
    const s = summaries.get(n.slug);
    if (s && s.acceptedCollaboratorCount > 0 && s.proposalCount > 0) {
      coalitionSlugs.push(n.slug);
    }
  }

  return {
    emergingCoalitions: coalitionSlugs.length,
    coalitionSlugs,
    hasAdjacentCoalitions: coalitionSlugs.length > 0,
  };
}

export function checkNeighboringMissionContinuity(
  entities: { location?: { district?: string | null } | null }[],
  adjacencyMap: AdjacencyMap,
  districtSlug: string,
): NeighboringMissionContinuity {
  const neighbors = adjacencyMap.get(districtSlug) ?? [];
  const neighborSlugs = new Set(neighbors.map((n) => n.slug));
  const missions = entities.filter(
    (e) => e.location?.district && neighborSlugs.has(slugFromDistrictName(e.location.district)),
  );

  const contiguousMissions = missions.length;
  const hasContinuity = contiguousMissions >= 2;
  const corridorForming = contiguousMissions >= 3;

  return { hasContinuity, contiguousMissions, corridorForming };
}

function slugFromDistrictName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
