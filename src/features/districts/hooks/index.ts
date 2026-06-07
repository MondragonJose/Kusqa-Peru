/**
 * Hooks for the district system (Phase 3A) + proposal conversion (Phase 3B).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { districtRepository } from "@/services/districtRepository";
import { proposalConversionRepository } from "@/services/proposalConversionRepository";
import type {
  District,
  DistrictActivity,
  DistrictFeed,
  DistrictStats,
  DistrictTopSupporter,
} from "@/services/districtRepository";
import type { ProposalLifecycleEvent } from "@/services/proposalConversionRepository";
import {
  districtActivityQueryOptions,
  districtBySlugQueryOptions,
  districtFeedQueryOptions,
  districtStatsQueryOptions,
  districtTopSupportersQueryOptions,
  districtsListQueryOptions,
  proposalConversionInvalidationKeys,
  proposalLifecycleQueryOptions,
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
export { districtRepository };
