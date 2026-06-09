/**
 * Hooks para proposals — simple orchestrators.
 *
 * Contract:
 *   - Hooks NEVER transform data structurally
 *   - Hooks NEVER resolve user_id (repository does)
 *   - createProposal returns ProposalResult (deterministic, no throws)
 *   - Cache invalidation is the only side-effect hooks manage
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { proposalRepository } from "@/services/proposalRepository";
import type {
  CreateProposalDTO,
  UpdateProposalDTO,
  ProposalResult,
} from "@/services/proposalRepository";
import {
  allProposalsQueryOptions,
  proposalDetailQueryOptions,
  proposalSupportersPreviewQueryOptions,
  userProposalsQueryOptions,
  proposalCoalitionStatsQueryOptions,
  proposalCoalitionQueryOptions,
  proposalCollaboratorsQueryOptions,
  proposalPendingInvitationsQueryOptions,
  proposalCommentsQueryOptions,
  proposalCommentCountQueryOptions,
} from "../queryOptions";
import {
  proposalCoalitionKeys,
  proposalCollaboratorKeys,
  proposalCommentKeys,
  proposalKeys,
} from "@/lib/queryKeys";
import type {
  CreateCollaboratorInvitationDTO,
  CreateCommentDTO,
  EditCommentDTO,
  ProposalCollaborator,
  ProposalComment,
  ProposalRegion,
  ProposalStatus,
  RespondToInvitationDTO,
} from "@/services/proposalContract";
import { proposalCollaboratorRepository } from "@/services/proposalCollaboratorRepository";
import { proposalCommentRepository } from "@/services/proposalCommentRepository";
import { userRepository } from "@/services/userRepository";
import { betaEvents } from "@/lib/telemetry/betaLogger";
import { consumeRateLimit, getRateLimitResetMs } from "@/lib/rateLimiter";

export function useAllProposals(filters?: {
  region?: ProposalRegion;
  status?: ProposalStatus;
  district?: string;
}) {
  return useQuery({
    ...allProposalsQueryOptions(filters),
  });
}

export function useProposal(proposalId: string) {
  return useQuery({
    ...proposalDetailQueryOptions(proposalId),
  });
}

export function useUserProposals(userId?: string) {
  return useQuery({
    ...userProposalsQueryOptions(userId || ""),
    enabled: !!userId,
  });
}

export function useCurrentUserProposals(pg?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: [...proposalKeys.userProposals("current"), pg ?? {}] as const,
    queryFn: async () => {
      const userId = await userRepository.getAuthenticatedUserId();
      if (!userId) return [];
      return proposalRepository.getProposalsByUserId(userId, pg);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useSupportersPreview(proposalId: string, limit: number = 5) {
  return useQuery({
    ...proposalSupportersPreviewQueryOptions(proposalId, limit),
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateProposalDTO): Promise<ProposalResult> => {
      if (!consumeRateLimit("createProposal")) {
        const resetMs = getRateLimitResetMs("createProposal");
        throw new Error(`Demasiadas propuestas. Intenta de nuevo en ${Math.ceil(resetMs / 1000)}s.`);
      }
      betaEvents.proposalCreateStart();
      if (import.meta.env.DEV) {
        console.log("[KUSQA PROPOSAL TRACE] Hook → repository.createProposal");
      }
      return proposalRepository.createProposal(dto);
    },
    onSuccess: (result: ProposalResult) => {
      if (result.status === "success" || result.status === "partial_success") {
        betaEvents.proposalCreateSuccess(result.data.id);
        if (import.meta.env.DEV) {
          console.log("[KUSQA PROPOSAL TRACE] Cache invalidated after create, id:", result.data.id);
        }
        queryClient.invalidateQueries({ queryKey: proposalKeys.all() });
        queryClient.invalidateQueries({ queryKey: proposalKeys.userProposals("current") });
      } else if (result.status === "error") {
        betaEvents.proposalCreateError(result.error || "unknown");
      }
    },
    onError: (error) => {
      betaEvents.proposalCreateError(error instanceof Error ? error.message : "unknown");
    },
  });
}

export function useUpdateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateProposalDTO }): Promise<ProposalResult> =>
      proposalRepository.updateProposal(id, dto),
    onSuccess: (result: ProposalResult) => {
      if (result.status === "success" || result.status === "partial_success") {
        if (import.meta.env.DEV) {
          console.log("[KUSQA PROPOSAL TRACE] Cache invalidated after update, id:", result.data.id);
        }
        queryClient.invalidateQueries({ queryKey: proposalKeys.detail(result.data.id) });
        queryClient.invalidateQueries({ queryKey: proposalKeys.all() });
        queryClient.invalidateQueries({ queryKey: proposalKeys.userProposals("current") });
      }
    },
  });
}

export function useDeleteProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => proposalRepository.deleteProposal(id),
    onSuccess: (result, id: string) => {
      if (result.status === "success") {
        if (import.meta.env.DEV) {
          console.log("[KUSQA PROPOSAL TRACE] Cache invalidated after delete");
        }
        queryClient.invalidateQueries({ queryKey: proposalKeys.all() });
        queryClient.invalidateQueries({ queryKey: proposalKeys.detail(id) });
      }
    },
  });
}

// ─── Phase 2A: coalition hooks ────────────────────────────────────────────

export function useProposalCoalitionStats(proposalId: string) {
  return useQuery({
    ...proposalCoalitionStatsQueryOptions(proposalId),
  });
}

export function useProposalCoalition(proposalId: string) {
  return useQuery({
    ...proposalCoalitionQueryOptions(proposalId),
  });
}

export function useProposalCollaborators(proposalId: string) {
  return useQuery({
    ...proposalCollaboratorsQueryOptions(proposalId),
  });
}

export function usePendingInvitations() {
  return useQuery({
    ...proposalPendingInvitationsQueryOptions(),
  });
}

export function useProposalComments(
  proposalId: string,
  options: { page?: number; pageSize?: number } = {},
) {
  return useQuery({
    ...proposalCommentsQueryOptions(proposalId, options),
  });
}

export function useCommentCount(proposalId: string) {
  return useQuery({
    ...proposalCommentCountQueryOptions(proposalId),
  });
}

export function useInviteCollaborator() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCollaboratorInvitationDTO): Promise<ProposalResult<ProposalCollaborator>> =>
      proposalCollaboratorRepository.invite(dto),
    onSuccess: (result, dto) => {
      if (result.status === "success") {
        queryClient.invalidateQueries({
          queryKey: proposalCollaboratorKeys.accepted(dto.proposalId),
        });
        queryClient.invalidateQueries({
          queryKey: proposalCollaboratorKeys.pendingForUser(result.data.userId),
        });
        queryClient.invalidateQueries({
          queryKey: proposalCoalitionKeys.byProposal(dto.proposalId),
        });
        queryClient.invalidateQueries({
          queryKey: proposalCoalitionKeys.stats(dto.proposalId),
        });
      }
    },
  });
}

export function useRespondToInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      dto: RespondToInvitationDTO,
    ): Promise<ProposalResult<ProposalCollaborator>> => {
      const currentUserId = await userRepository.getAuthenticatedUserId();
      if (!currentUserId) {
        return { status: "error", error: "Necesitas iniciar sesión." };
      }
      return proposalCollaboratorRepository.respond({ ...dto, currentUserId });
    },
    onSuccess: (result) => {
      if (result.status === "success") {
        const proposalId = result.data.proposalId;
        queryClient.invalidateQueries({
          queryKey: proposalCollaboratorKeys.accepted(proposalId),
        });
        queryClient.invalidateQueries({
          queryKey: proposalCollaboratorKeys.pendingForUser("current"),
        });
        queryClient.invalidateQueries({
          queryKey: proposalCoalitionKeys.byProposal(proposalId),
        });
        queryClient.invalidateQueries({
          queryKey: proposalCoalitionKeys.stats(proposalId),
        });
      }
    },
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateCommentDTO): Promise<ProposalResult<ProposalComment>> => {
      if (!consumeRateLimit("createComment")) {
        const resetMs = getRateLimitResetMs("createComment");
        throw new Error(`Demasiados comentarios. Intenta de nuevo en ${Math.ceil(resetMs / 1000)}s.`);
      }
      return proposalCommentRepository.create(dto);
    },
    onMutate: async (dto: CreateCommentDTO) => {
      await queryClient.cancelQueries({ queryKey: proposalCommentKeys.listAll(dto.proposalId) });
    },
    onSuccess: (result, dto) => {
      if (result.status === "success") {
        queryClient.invalidateQueries({
          queryKey: proposalCommentKeys.listAll(dto.proposalId),
        });
        queryClient.invalidateQueries({
          queryKey: proposalCommentKeys.count(dto.proposalId),
        });
      }
    },
  });
}

export function useEditComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: EditCommentDTO): Promise<ProposalResult<ProposalComment>> => {
      const currentUserId = await userRepository.getAuthenticatedUserId();
      if (!currentUserId) {
        return { status: "error", error: "Necesitas iniciar sesión para editar." };
      }
      return proposalCommentRepository.edit({ ...dto, currentUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proposalCommentKeys.root });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string): Promise<ProposalResult<true>> => {
      const currentUserId = await userRepository.getAuthenticatedUserId();
      if (!currentUserId) {
        return { status: "error", error: "Necesitas iniciar sesión para eliminar." };
      }
      return proposalCommentRepository.softDelete(commentId, currentUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: proposalCommentKeys.root });
    },
  });
}
