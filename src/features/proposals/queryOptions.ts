/**
 * React Query option factories — proposals cache policy + queryFn wiring only
 */

import {
  proposalCoalitionKeys,
  proposalCollaboratorKeys,
  proposalCommentKeys,
  proposalKeys,
  proposalSupportKeys,
} from "@/lib/queryKeys";
import { proposalRepository } from "@/services/proposalRepository";
import { proposalCollaboratorRepository } from "@/services/proposalCollaboratorRepository";
import { proposalCommentRepository } from "@/services/proposalCommentRepository";
import type { ProposalRegion, ProposalStatus } from "@/services/proposalContract";
import { userRepository } from "@/services/userRepository";

// Cache times (en milisegundos)
const PROPOSALS_STALE_MS = 5 * 60 * 1000; // 5 minutos
const PROPOSALS_GC_MS = 10 * 60 * 1000; // 10 minutos
const SUPPORTERS_PREVIEW_STALE_MS = 60 * 1000; // 1 minuto — supporter list changes more often
const COALITION_STATS_STALE_MS = 30 * 1000; // 30s — counts change frequently
const COMMENTS_STALE_MS = 60 * 1000; // 60s — civic thread
const COLLABORATORS_STALE_MS = 60 * 1000; // 60s

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

// ─── Phase 2A: coalition + comments ───────────────────────────────────────

export function proposalCoalitionStatsQueryOptions(proposalId: string) {
  return {
    queryKey: proposalCoalitionKeys.stats(proposalId),
    queryFn: () => proposalRepository.getSupportStats(proposalId),
    staleTime: COALITION_STATS_STALE_MS,
    gcTime: 5 * 60 * 1000,
    enabled: proposalId.length > 0,
    retry: 1 as const,
  };
}

export function proposalCoalitionQueryOptions(proposalId: string) {
  return {
    queryKey: proposalCoalitionKeys.byProposal(proposalId),
    queryFn: () => proposalRepository.getProposalCoalition(proposalId),
    staleTime: COALITION_STATS_STALE_MS,
    gcTime: 5 * 60 * 1000,
    enabled: proposalId.length > 0,
    retry: 1 as const,
  };
}

export function proposalCollaboratorsQueryOptions(proposalId: string) {
  return {
    queryKey: proposalCollaboratorKeys.accepted(proposalId),
    queryFn: () => proposalCollaboratorRepository.listAccepted(proposalId),
    staleTime: COLLABORATORS_STALE_MS,
    gcTime: 5 * 60 * 1000,
    enabled: proposalId.length > 0,
    retry: 1 as const,
  };
}

export function proposalPendingInvitationsQueryOptions() {
  return {
    queryKey: proposalCollaboratorKeys.pendingForUser("current"),
    queryFn: async () => {
      const userId = await userRepository.getAuthenticatedUserId();
      if (!userId) return [];
      return proposalCollaboratorRepository.listPendingForUser(userId);
    },
    staleTime: COLLABORATORS_STALE_MS,
    gcTime: 5 * 60 * 1000,
    retry: 1 as const,
  };
}

export function proposalCommentsQueryOptions(
  proposalId: string,
  options: { page?: number; pageSize?: number } = {},
) {
  const page = options.page ?? 0;
  const pageSize = options.pageSize ?? 20;
  return {
    queryKey: proposalCommentKeys.list(proposalId, page),
    queryFn: async () => {
      const userId = await userRepository.getAuthenticatedUserId();
      return proposalCommentRepository.list(proposalId, {
        page,
        pageSize,
        currentUserId: userId,
      });
    },
    staleTime: COMMENTS_STALE_MS,
    gcTime: 5 * 60 * 1000,
    enabled: proposalId.length > 0,
    retry: 1 as const,
  };
}
