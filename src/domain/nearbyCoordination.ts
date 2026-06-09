import type { CivicEntity } from "@/types/entity";
import type { Proposal } from "@/services/proposalContract";
import type { TerritorialImpactSummary } from "./territoryAggregations";
import type { AdjacencyMap } from "./spatialRelationships";
import { calculateDistance } from "./territorial";
import type { MapCoords } from "@/types";

export type NearbyInitiatives = {
  districtSlug: string;
  nearbyMissions: CivicEntity[];
  nearbyProposals: CivicEntity[];
  totalNearby: number;
  radiusKm: number;
};

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

export type ProposalProximity = {
  nearbyProposalIds: string[];
  proximityCount: number;
  clusterLabel: string | null;
};

export function findNearbyInitiatives(
  districtSlug: string,
  entities: CivicEntity[],
  adjacencyMap: AdjacencyMap,
  radiusKm: number = 25,
): NearbyInitiatives {
  const neighbors = adjacencyMap.get(districtSlug) ?? [];
  const neighborSlugs = new Set(neighbors.map((n) => n.slug));
  const nearbyMissions: CivicEntity[] = [];
  const nearbyProposals: CivicEntity[] = [];

  for (const e of entities) {
    if (!e.district) continue;
    const entitySlug = slugFromDistrictName(e.district);
    if (neighborSlugs.has(entitySlug)) {
      if (e.entityType === "mission") {
        nearbyMissions.push(e);
      } else {
        nearbyProposals.push(e);
      }
    }
  }

  return {
    districtSlug,
    nearbyMissions,
    nearbyProposals,
    totalNearby: nearbyMissions.length + nearbyProposals.length,
    radiusKm,
  };
}

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
  entities: CivicEntity[],
  adjacencyMap: AdjacencyMap,
  districtSlug: string,
): NeighboringMissionContinuity {
  const neighbors = adjacencyMap.get(districtSlug) ?? [];
  const neighborSlugs = new Set(neighbors.map((n) => n.slug));
  const missions = entities.filter(
    (e) => e.district && neighborSlugs.has(slugFromDistrictName(e.district)),
  );

  const contiguousMissions = missions.length;
  const hasContinuity = contiguousMissions >= 2;
  const corridorForming = contiguousMissions >= 3;

  return { hasContinuity, contiguousMissions, corridorForming };
}

export function computeProposalProximityRelationships(
  proposals: Proposal[],
  geometry: { slug: string; latitude: number; longitude: number }[],
  radiusKm: number = 30,
): Map<string, ProposalProximity> {
  const result = new Map<string, ProposalProximity>();

  const coordMap = new Map<string, { lat: number; lng: number }>();
  for (const g of geometry) {
    coordMap.set(g.slug, { lat: g.latitude, lng: g.longitude });
  }

  for (const p of proposals) {
    if (!p.latitude || !p.longitude) continue;
    const pCoords: MapCoords = { lat: p.latitude, lng: p.longitude };
    const nearbyIds: string[] = [];

    for (const other of proposals) {
      if (other.id === p.id || !other.latitude || !other.longitude) continue;
      const otherCoords: MapCoords = { lat: other.latitude, lng: other.longitude };
      const dist = calculateDistance(pCoords, otherCoords);
      if (dist <= radiusKm) {
        nearbyIds.push(other.id);
      }
    }

    const clusterLabel = nearbyIds.length >= 3 ? "núcleo de propuestas" : nearbyIds.length >= 1 ? "propuestas cercanas" : null;

    result.set(p.id, {
      nearbyProposalIds: nearbyIds,
      proximityCount: nearbyIds.length,
      clusterLabel,
    });
  }

  return result;
}

function slugFromDistrictName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
