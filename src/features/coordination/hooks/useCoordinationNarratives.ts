import { useMemo } from "react";
import { useTerritorialGeometry } from "@/features/districts/hooks";
import { buildAdjacencyMap } from "@/domain/spatialRelationships";
import {
  deriveCivicPresence,
  computeTemporalContinuity,
  deriveNeighboringAwareness,
  computeCoalitionProximityInfo,
} from "@/domain/civicPresence";
import {
  findRelatedTerritorialActivity,
  detectAdjacentCoalitionEmergence,
  checkNeighboringMissionContinuity,
} from "@/domain/nearbyCoordination";
import { deriveCoordinationNarratives } from "@/domain/coordinationNarratives";
import type { CoordinationNarrative } from "@/domain/coordinationNarratives";
import type { AdjacencyMap } from "@/domain/spatialRelationships";
import type { Initiative } from "@/domain/initiative";

export function useCoordinationNarratives(
  districtSlug: string,
  districtId?: string,
  summary?: {
    missionCount: number;
    proposalCount: number;
    completedMissionCount: number;
    activeProposalCount: number;
    uniqueSupporterCount: number;
    acceptedCollaboratorCount: number;
    lastActivityAt: string | null;
    recentProposalCount?: number;
    recentCompletionCount?: number;
  } | null,
  initiatives?: Initiative[],
): CoordinationNarrative[] {
  const { data: geometry } = useTerritorialGeometry();

  return useMemo(() => {
    if (!geometry || geometry.length === 0) return [];
    if (!summary || !districtId) return [];

    const adjacencyMap: AdjacencyMap = buildAdjacencyMap(geometry);
    const neighbors = adjacencyMap.get(districtSlug) ?? [];
    const allSlugs = geometry.map((g) => g.slug);
    const neighborSummaries = new Map<string, typeof summary>();

    // Build minimal summaries for neighbors (just mark them as "active" if they exist)
    for (const n of neighbors) {
      neighborSummaries.set(n.slug, {
        missionCount: 1,
        proposalCount: 1,
        completedMissionCount: 0,
        activeProposalCount: 1,
        uniqueSupporterCount: 1,
        acceptedCollaboratorCount: 0,
        lastActivityAt: summary.lastActivityAt,
        recentProposalCount: 0,
        recentCompletionCount: 0,
      });
    }

    const activeSlugs = districtSlug ? [districtSlug] : [];
    const presence = deriveCivicPresence(
      districtSlug,
      adjacencyMap,
      activeSlugs,
      neighborSummaries as Map<string, any>,
    );
    const continuity = computeTemporalContinuity(summary);
    const awareness = deriveNeighboringAwareness(adjacencyMap, districtSlug, activeSlugs);
    const related = findRelatedTerritorialActivity(
      districtSlug,
      Array.from(neighborSummaries.values()),
      adjacencyMap,
    );
    const proximity = computeCoalitionProximityInfo(
      neighbors,
      Array.from(neighborSummaries.values()),
    );
    const emergence = detectAdjacentCoalitionEmergence(
      districtSlug,
      adjacencyMap,
      neighborSummaries as Map<string, any>,
    );
    const missionContinuity = checkNeighboringMissionContinuity(
      initiatives ?? [],
      adjacencyMap,
      districtSlug,
    );

    return deriveCoordinationNarratives(
      related,
      proximity,
      continuity,
      awareness,
      emergence,
      missionContinuity,
    );
  }, [geometry, districtSlug, districtId, summary, initiatives]);
}
