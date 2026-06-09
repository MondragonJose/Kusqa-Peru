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
import { proposalLifecycleKeys } from "@/lib/queryKeys";
import {
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

export function useTerritorialHierarchy() {
  const { data: geometry } = useTerritorialGeometry();
  return useMemo(() => {
    if (!geometry) return [];
    return spatialRepository.buildHierarchy(geometry);
  }, [geometry]);
}
