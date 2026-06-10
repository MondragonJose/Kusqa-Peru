/**
 * React Query option factories — districts (Phase 3A) + conversion (Phase 3B).
 */

import {
  districtActivityKeys,
  districtFeedKeys,
  districtIntelligenceKeys,
  districtKeys,
  districtStatsKeys,
  proposalCoalitionKeys,
  proposalKeys,
  proposalLifecycleKeys,
  spatialKeys,
} from "@/lib/queryKeys";
import { districtRepository } from "@/services/districtRepository";
import { proposalConversionRepository } from "@/services/proposalConversionRepository";
import { spatialRepository } from "@/services/spatialRepository";

const DISTRICT_STALE_MS = 2 * 60 * 1000; // 2 min — district metadata rarely changes
const DISTRICT_STATS_STALE_MS = 60 * 1000; // 60s — counts change with activity
const DISTRICT_INTELLIGENCE_STALE_MS = 60 * 1000; // 60s — includes recent counts
const DISTRICT_ACTIVITY_STALE_MS = 30 * 1000; // 30s — activity feed is fresher
const DISTRICT_FEED_STALE_MS = 60 * 1000;
const LIFECYCLE_STALE_MS = 5 * 60 * 1000; // 5 min — append-only

export function districtBySlugQueryOptions(slug: string) {
  return {
    queryKey: districtKeys.bySlug(slug),
    queryFn: () => districtRepository.getDistrictBySlug(slug),
    staleTime: DISTRICT_STALE_MS,
    gcTime: 10 * 60 * 1000,
    enabled: slug.length > 0,
    retry: 1 as const,
  };
}

export function districtsListQueryOptions(region?: "costa" | "sierra" | "selva") {
  return {
    queryKey: districtKeys.all(region),
    queryFn: () => districtRepository.listDistricts(region),
    staleTime: DISTRICT_STALE_MS,
    gcTime: 10 * 60 * 1000,
    retry: 1 as const,
  };
}

export function districtStatsQueryOptions(districtId: string) {
  return {
    queryKey: districtStatsKeys.byId(districtId),
    queryFn: () => districtRepository.getDistrictStats(districtId),
    staleTime: DISTRICT_STATS_STALE_MS,
    gcTime: 5 * 60 * 1000,
    enabled: districtId.length > 0,
    retry: 1 as const,
  };
}

export function allDistrictsActivityQueryOptions() {
  return {
    queryKey: districtStatsKeys.all,
    queryFn: () => districtRepository.getAllDistrictStats(),
    staleTime: DISTRICT_STATS_STALE_MS,
    gcTime: 5 * 60 * 1000,
    retry: 1 as const,
  };
}

export function districtIntelligenceQueryOptions(districtId: string) {
  return {
    queryKey: districtIntelligenceKeys.byId(districtId),
    queryFn: () => districtRepository.getDistrictIntelligence(districtId),
    staleTime: DISTRICT_INTELLIGENCE_STALE_MS,
    gcTime: 5 * 60 * 1000,
    enabled: districtId.length > 0,
    retry: 1 as const,
  };
}

export function districtActivityQueryOptions(districtId: string, limit: number = 20) {
  return {
    queryKey: districtActivityKeys.byId(districtId, limit),
    queryFn: () => districtRepository.getDistrictActivity(districtId, limit),
    staleTime: DISTRICT_ACTIVITY_STALE_MS,
    gcTime: 5 * 60 * 1000,
    enabled: districtId.length > 0,
    retry: 1 as const,
  };
}

export function districtFeedQueryOptions(slug: string) {
  return {
    queryKey: districtFeedKeys.bySlug(slug),
    queryFn: () => districtRepository.getDistrictFeed(slug),
    staleTime: DISTRICT_FEED_STALE_MS,
    gcTime: 5 * 60 * 1000,
    enabled: slug.length > 0,
    retry: 1 as const,
  };
}

export function districtTopSupportersQueryOptions(districtId: string, limit: number = 10) {
  return {
    queryKey: [...districtStatsKeys.byId(districtId), "top-supporters", limit] as const,
    queryFn: () => districtRepository.getDistrictTopSupporters(districtId, limit),
    staleTime: DISTRICT_STATS_STALE_MS,
    gcTime: 5 * 60 * 1000,
    enabled: districtId.length > 0,
    retry: 1 as const,
  };
}

export function proposalLifecycleQueryOptions(proposalId: string) {
  return {
    queryKey: proposalLifecycleKeys.byProposal(proposalId),
    queryFn: () => proposalConversionRepository.listLifecycleEvents(proposalId, 20),
    staleTime: LIFECYCLE_STALE_MS,
    gcTime: 10 * 60 * 1000,
    enabled: proposalId.length > 0,
    retry: 1 as const,
  };
}

/** Invalidation helper for the conversion flow: refreshes everything that
 *  depends on a proposal's converted state. */
export function proposalConversionInvalidationKeys(proposalId: string) {
  return [
    proposalKeys.detail(proposalId),
    proposalCoalitionKeys.byProposal(proposalId),
    proposalLifecycleKeys.byProposal(proposalId),
  ] as const;
}

const SPATIAL_STALE_MS = 10 * 60 * 1000; // 10 min — geometry rarely changes

export function territorialGeometryQueryOptions() {
  return {
    queryKey: spatialKeys.geometry,
    queryFn: () => spatialRepository.getAllGeometry(),
    staleTime: SPATIAL_STALE_MS,
    gcTime: 30 * 60 * 1000,
    retry: 1 as const,
  };
}

export function regionMetadataQueryOptions() {
  return {
    queryKey: spatialKeys.regionMetadata,
    queryFn: () => spatialRepository.getAllRegionMetadata(),
    staleTime: SPATIAL_STALE_MS,
    gcTime: 30 * 60 * 1000,
    retry: 1 as const,
  };
}
