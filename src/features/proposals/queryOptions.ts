/**
 * React Query option factories — proposals cache policy + queryFn wiring only
 */

import { proposalKeys, proposalSupportKeys } from "@/lib/queryKeys";
import { proposalRepository } from "@/services/proposalRepository";
import type { ProposalRegion, ProposalStatus } from "@/services/proposalContract";

// Cache times (en milisegundos)
const PROPOSALS_STALE_MS = 5 * 60 * 1000; // 5 minutos
const PROPOSALS_GC_MS = 10 * 60 * 1000; // 10 minutos
const SUPPORTERS_PREVIEW_STALE_MS = 60 * 1000; // 1 minuto — supporter list changes more often

export function proposalDetailQueryOptions(proposalId: string) {
  return {
    queryKey: proposalKeys.detail(proposalId),
    queryFn: () => proposalRepository.getProposalById(proposalId),
    staleTime: PROPOSALS_STALE_MS,
    gcTime: PROPOSALS_GC_MS,
    enabled: proposalId.length > 0,
    retry: false as const,
  };
}

export function userProposalsQueryOptions(userId: string) {
  return {
    queryKey: proposalKeys.userProposals(userId),
    queryFn: () => proposalRepository.getProposalsByUserId(userId),
    staleTime: PROPOSALS_STALE_MS,
    gcTime: PROPOSALS_GC_MS,
    enabled: userId.length > 0,
    retry: false as const,
  };
}

export function allProposalsQueryOptions(filters?: {
  region?: ProposalRegion;
  status?: ProposalStatus;
  district?: string;
}) {
  return {
    queryKey: proposalKeys.all(filters),
    queryFn: () => proposalRepository.getAllProposals(filters),
    staleTime: PROPOSALS_STALE_MS,
    gcTime: PROPOSALS_GC_MS,
    retry: false as const,
  };
}

export function proposalSupportCountQueryOptions(proposalId: string) {
  return {
    queryKey: proposalSupportKeys.count(proposalId),
    queryFn: () => proposalRepository.getSupportCount(proposalId),
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
    enabled: proposalId.length > 0,
    retry: 1 as const,
  };
}

export function proposalSupportersPreviewQueryOptions(proposalId: string, limit: number = 5) {
  return {
    queryKey: proposalSupportKeys.supportersPreview(proposalId, limit),
    queryFn: () => proposalRepository.getSupportersPreview(proposalId, limit),
    staleTime: SUPPORTERS_PREVIEW_STALE_MS,
    gcTime: 5 * 60 * 1000,
    enabled: proposalId.length > 0,
    retry: 1 as const,
  };
}
