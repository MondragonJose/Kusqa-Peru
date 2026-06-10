/**
 * Hooks for the district system (Phase 3A) + proposal conversion (Phase 3B).
 */

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { districtRepository } from "@/services/districtRepository";
import { spatialRepository } from "@/services/spatialRepository";
import { proposalConversionRepository } from "@/services/proposalConversionRepository";
import type {
  District,
  DistrictActivity,
  DistrictFeed,
  DistrictStats,
  DistrictTopSupporter,
} from "@/services/districtRepository";
import type { ProposalLifecycleEvent } from "@/services/proposalConversionRepository";
import type { DistrictGeometry, RegionMetadata, TerritoryNode } from "@/services/spatialRepository";
import type { TerritorialImpactSummary } from "@/domain/territoryAggregations";
import type { SpatialContext } from "@/domain/territorialIntelligence";
import { classifyDistrictActivity } from "@/domain/territoryAggregations";
import { buildAdjacencyMap, buildGeometryCoordMap, detectIsolation, findConvergenceZones, checkContiguity, computeTerritorialSpread } from "@/domain/spatialRelationships";
import { proposalLifecycleKeys } from "@/lib/queryKeys";
import {
  allDistrictsActivityQueryOptions,
  districtActivityQueryOptions,
  districtBySlugQueryOptions,
  districtFeedQueryOptions,
  districtIntelligenceQueryOptions,
  districtStatsQueryOptions,
  districtTopSupportersQueryOptions,
  districtsListQueryOptions,
  proposalConversionInvalidationKeys,
  proposalLifecycleQueryOptions,
  territorialGeometryQueryOptions,
  regionMetadataQueryOptions,
} from "../queryOptions";

export function useDistrict(slug: string) {
  return useQuery<District | null>({
    ...districtBySlugQueryOptions(slug),
  });
}

export function useDistricts(region?: "costa" | "sierra" | "selva") {
  return useQuery<District[]>({
    ...districtsListQueryOptions(region),
  });
}

export function useDistrictStats(districtId: string) {
  return useQuery<DistrictStats>({
    ...districtStatsQueryOptions(districtId),
  });
}

export function useDistrictIntelligence(districtId: string) {
  return useQuery<TerritorialImpactSummary>({
    ...districtIntelligenceQueryOptions(districtId),
  });
}

export function useDistrictActivity(districtId: string, limit: number = 20) {
  return useQuery<DistrictActivity[]>({
    ...districtActivityQueryOptions(districtId, limit),
  });
}

export function useDistrictFeed(slug: string) {
  return useQuery<DistrictFeed>({
    ...districtFeedQueryOptions(slug),
  });
}

export function useDistrictTopSupporters(districtId: string, limit: number = 10) {
  return useQuery<DistrictTopSupporter[]>({
    ...districtTopSupportersQueryOptions(districtId, limit),
  });
}

export function useProposalOriginByMissionId(missionId: string) {
  return useQuery<string | null>({
    queryKey: [...proposalLifecycleKeys.root, "mission-origin", missionId] as const,
    queryFn: () => proposalConversionRepository.findProposalByMissionId(missionId),
    staleTime: 10 * 60 * 1000,
    enabled: missionId.length > 0,
    retry: 1 as const,
  });
}

export function useProposalLifecycle(proposalId: string) {
  return useQuery<ProposalLifecycleEvent[]>({
    ...proposalLifecycleQueryOptions(proposalId),
  });
}

export function useConvertProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      proposalId: string;
      initialDate?: string | null;
      organizerNotes?: string | null;
    }) => {
      return proposalConversionRepository.convert(input);
    },
    onSuccess: (result, input) => {
      if (result.status === "success") {
        for (const key of proposalConversionInvalidationKeys(input.proposalId)) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
    },
  });
}

export function useReopenProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { proposalId: string; reason?: string | null }) => {
      return proposalConversionRepository.reopen(input);
    },
    onSuccess: (result, input) => {
      if (result.status === "success") {
        for (const key of proposalConversionInvalidationKeys(input.proposalId)) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
    },
  });
}

// Re-export the repository types for convenience.
export type { District, DistrictStats, DistrictActivity } from "@/services/districtRepository";
export type { ProposalLifecycleEvent } from "@/services/proposalConversionRepository";
export type { DistrictGeometry, RegionMetadata, TerritoryNode } from "@/services/spatialRepository";
export { districtRepository };

export function useTerritorialGeometry() {
  return useQuery<DistrictGeometry[]>({
    ...territorialGeometryQueryOptions(),
  });
}

export function useRegionMetadata() {
  return useQuery<RegionMetadata[]>({
    ...regionMetadataQueryOptions(),
  });
}

export function useAllDistrictsActivity() {
  return useQuery<DistrictStats[]>({
    ...allDistrictsActivityQueryOptions(),
  });
}

export function useSpatialContext(slug: string): {
  spatialContext: SpatialContext | null;
  isLoading: boolean;
} {
  const { data: geometry, isLoading: geoLoading } = useTerritorialGeometry();
  const { data: allStats, isLoading: statsLoading } = useAllDistrictsActivity();

  const spatialContext = useMemo<SpatialContext | null>(() => {
    if (!geometry || geometry.length === 0 || !allStats) return null;

    const adjacencyMap = buildAdjacencyMap(geometry);
    const coordMap = buildGeometryCoordMap(geometry);

    // Build slug → stats lookup
    const statsBySlug = new Map<string, TerritorialImpactSummary>();
    for (const s of allStats) {
      statsBySlug.set(s.slug.toLowerCase(), {
        missionCount: s.missionCount,
        completedMissionCount: s.completedMissionCount,
        proposalCount: s.proposalCount,
        activeProposalCount: s.activeProposalCount,
        uniqueSupporterCount: s.uniqueSupporterCount,
        acceptedCollaboratorCount: s.acceptedCollaboratorCount,
        lastActivityAt: s.lastActivityAt,
      });
    }

    // Classify each district
    const activeSlugs: string[] = [];
    const dormantSlugs: string[] = [];
    for (const geo of geometry) {
      const summary = statsBySlug.get(geo.slug.toLowerCase());
      if (!summary) {
        dormantSlugs.push(geo.slug);
        continue;
      }
      const activityClass = classifyDistrictActivity(summary);
      if (activityClass === "active" || activityClass === "established") {
        activeSlugs.push(geo.slug);
      } else {
        dormantSlugs.push(geo.slug);
      }
    }

    const neighbors = adjacencyMap.get(slug) ?? [];
    const activeNeighborCount = neighbors.filter((n) => activeSlugs.includes(n.slug)).length;
    const isIsolated = detectIsolation(slug, activeSlugs, adjacencyMap);
    const zones = findConvergenceZones(activeSlugs, adjacencyMap);
    const contiguityStatus = activeSlugs.length > 1
      ? checkContiguity(activeSlugs, adjacencyMap)
      : undefined;
    const spreadLevel = activeSlugs.length > 1
      ? computeTerritorialSpread(activeSlugs, coordMap).level
      : undefined;

    const currentZone = zones.find((z) => z.includes(slug));
    const convergenceZoneSize = currentZone?.length;

    const isDormant = dormantSlugs.includes(slug);
    const hasReactivationPotential = isDormant && activeNeighborCount > 0;

    return {
      districtSlug: slug,
      adjacencyMap,
      activeSlugs,
      dormantSlugs,
      contiguityStatus,
      spreadLevel,
      isIsolated,
      convergenceZoneSize,
      hasReactivationPotential,
      neighborCount: neighbors.length,
      activeNeighborCount,
    };
  }, [geometry, allStats, slug]);

  return {
    spatialContext,
    isLoading: geoLoading || statsLoading,
  };
}

export function useTerritorialHierarchy() {
  const { data: geometry } = useTerritorialGeometry();
  return useMemo(() => {
    if (!geometry) return [];
    return spatialRepository.buildHierarchy(geometry);
  }, [geometry]);
}
