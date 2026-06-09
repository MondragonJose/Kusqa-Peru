import type { Region } from "@/types";
import type { TerritorialImpactSummary } from "./territoryAggregations";
import type { AdjacencyMap } from "./spatialRelationships";

export type CivicPresence = {
  districtSlug: string;
  nearbyInitiativeCount: number;
  nearbyParticipantCount: number;
  nearbyCoalitionCount: number;
  lastNeighborhoodActivity: string | null;
  hasCoordinationSignal: boolean;
};

export type NearbyActivityWindow = {
  radiusKm: number;
  windowDays: number;
  initiativeCount: number;
  participantCount: number;
  recentProposalCount: number;
  recentMissionCount: number;
};

export type TerritorialPresence = {
  region: Region;
  activeDistrictCount: number;
  totalInitiativeCount: number;
  emergingClusterCount: number;
  continuityStatus: "fragmented" | "emerging" | "sustained";
};

export type TemporalContinuity = {
  hasSustainedActivity: boolean;
  totalActiveWeeks: number;
  gapWeeks: number;
  pattern: "continuous" | "intermittent" | "first_steps" | "resurging";
};

export type CoalitionProximity = {
  nearbyCoalitions: number;
  nearbyCollaborators: number;
  closestCoalitionDistance: "near" | "moderate" | "far" | "none";
};

export type NeighboringDistrictAwareness = {
  totalNeighbors: number;
  activeNeighbors: number;
  dormantNeighbors: number;
  neighborActivityRatio: number;
};

export function deriveCivicPresence(
  districtSlug: string,
  adjacencyMap: AdjacencyMap,
  activeSlugs: string[],
  neighborSummaries: Map<string, TerritorialImpactSummary>,
): CivicPresence {
  const neighbors = adjacencyMap.get(districtSlug) ?? [];
  let nearbyInitiativeCount = 0;
  let nearbyParticipantCount = 0;
  let nearbyCoalitionCount = 0;
  let lastActivity: string | null = null;

  for (const n of neighbors) {
    if (!activeSlugs.includes(n.slug)) continue;
    const s = neighborSummaries.get(n.slug);
    if (!s) continue;
    nearbyInitiativeCount += s.missionCount + s.proposalCount;
    nearbyParticipantCount += s.uniqueSupporterCount + s.acceptedCollaboratorCount;
    if (s.acceptedCollaboratorCount > 0) nearbyCoalitionCount++;
    if (s.lastActivityAt && (!lastActivity || s.lastActivityAt > lastActivity)) {
      lastActivity = s.lastActivityAt;
    }
  }

  return {
    districtSlug,
    nearbyInitiativeCount,
    nearbyParticipantCount,
    nearbyCoalitionCount,
    lastNeighborhoodActivity: lastActivity,
    hasCoordinationSignal: nearbyCoalitionCount > 0 && nearbyInitiativeCount > 1,
  };
}

export function computeNearbyActivityWindow(
  summaries: TerritorialImpactSummary[],
  radiusKm: number = 25,
  windowDays: number = 30,
): NearbyActivityWindow {
  const now = Date.now();
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
  let initiativeCount = 0;
  let participantCount = 0;
  let recentProposals = 0;
  let recentMissions = 0;

  for (const s of summaries) {
    initiativeCount += s.missionCount + s.proposalCount;
    participantCount += s.uniqueSupporterCount + s.acceptedCollaboratorCount;
    if (s.lastActivityAt && new Date(s.lastActivityAt).getTime() > cutoff) {
      recentProposals += s.activeProposalCount;
      recentMissions += s.missionCount - s.completedMissionCount;
    }
  }

  return {
    radiusKm,
    windowDays,
    initiativeCount,
    participantCount,
    recentProposalCount: recentProposals,
    recentMissionCount: recentMissions,
  };
}

export function deriveTerritorialPresence(
  region: Region,
  summaries: TerritorialImpactSummary[],
  activeSlugs: string[],
  adjacencyMap: AdjacencyMap,
): TerritorialPresence {
  const activeCount = activeSlugs.length;
  const totalInitiatives = summaries.reduce((a, s) => a + s.missionCount + s.proposalCount, 0);
  const visited = new Set<string>();
  let clusters = 0;

  for (const slug of activeSlugs) {
    if (visited.has(slug)) continue;
    const queue = [slug];
    visited.add(slug);
    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adjacencyMap.get(current) ?? [];
      for (const n of neighbors) {
        if (!visited.has(n.slug) && activeSlugs.includes(n.slug)) {
          visited.add(n.slug);
          queue.push(n.slug);
        }
      }
    }
    clusters++;
  }

  const continuityStatus: TerritorialPresence["continuityStatus"] =
    clusters <= 1 && activeCount >= 2
      ? "sustained"
      : clusters <= 2
        ? "emerging"
        : "fragmented";

  return {
    region,
    activeDistrictCount: activeCount,
    totalInitiativeCount: totalInitiatives,
    emergingClusterCount: clusters,
    continuityStatus,
  };
}

export function computeTemporalContinuity(summary: TerritorialImpactSummary): TemporalContinuity {
  if (!summary.lastActivityAt && summary.missionCount === 0 && summary.proposalCount === 0) {
    return { hasSustainedActivity: false, totalActiveWeeks: 0, gapWeeks: 0, pattern: "first_steps" };
  }

  const lastActivity = summary.lastActivityAt ? new Date(summary.lastActivityAt).getTime() : Date.now();
  const now = Date.now();
  const daysSinceLastActivity = (now - lastActivity) / (1000 * 60 * 60 * 24);
  const totalActive = summary.missionCount + summary.proposalCount;

  const gapWeeks = Math.max(0, Math.floor((daysSinceLastActivity - 7) / 7));
  const totalActiveWeeks = Math.min(totalActive * 2, 52);

  let pattern: TemporalContinuity["pattern"];
  if (totalActive === 0) {
    pattern = "first_steps";
  } else if (daysSinceLastActivity > 60) {
    pattern = "resurging";
  } else if (gapWeeks > 4) {
    pattern = "intermittent";
  } else if (totalActive >= 3 && daysSinceLastActivity < 30) {
    pattern = "continuous";
  } else {
    pattern = "intermittent";
  }

  return {
    hasSustainedActivity: totalActive >= 3 && daysSinceLastActivity < 60,
    totalActiveWeeks,
    gapWeeks,
    pattern,
  };
}

export function computeCoalitionProximityInfo(
  neighbors: { slug: string; distanceKm: number }[],
  neighborSummaries: TerritorialImpactSummary[],
): CoalitionProximity {
  let nearbyCoalitions = 0;
  let nearbyCollaborators = 0;
  let minDistance = Infinity;

  for (const n of neighbors) {
    const s = neighborSummaries.find((ns: TerritorialImpactSummary) => ns.acceptedCollaboratorCount > 0);
    if (!s) continue;
    if (s.acceptedCollaboratorCount > 0) {
      nearbyCoalitions++;
      nearbyCollaborators += s.acceptedCollaboratorCount;
      if (n.distanceKm < minDistance) minDistance = n.distanceKm;
    }
  }

  const closestDistance: CoalitionProximity["closestCoalitionDistance"] =
    nearbyCoalitions === 0
      ? "none"
      : minDistance <= 10
        ? "near"
        : minDistance <= 30
          ? "moderate"
          : "far";

  return { nearbyCoalitions, nearbyCollaborators, closestCoalitionDistance: closestDistance };
}

export function deriveNeighboringAwareness(
  adjacencyMap: AdjacencyMap,
  districtSlug: string,
  activeSlugs: string[],
): NeighboringDistrictAwareness {
  const neighbors = adjacencyMap.get(districtSlug) ?? [];
  const totalNeighbors = neighbors.length;
  const activeNeighbors = neighbors.filter((n) => activeSlugs.includes(n.slug)).length;
  const dormantNeighbors = totalNeighbors - activeNeighbors;
  const neighborActivityRatio = totalNeighbors > 0 ? activeNeighbors / totalNeighbors : 0;

  return { totalNeighbors, activeNeighbors, dormantNeighbors, neighborActivityRatio };
}
