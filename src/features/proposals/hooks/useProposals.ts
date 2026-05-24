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
import type { CreateProposalDTO, UpdateProposalDTO, ProposalResult } from "@/services/proposalRepository";
import { allProposalsQueryOptions, proposalDetailQueryOptions, userProposalsQueryOptions } from "../queryOptions";
import { proposalKeys } from "@/lib/queryKeys";
import type { ProposalRegion, ProposalStatus } from "@/services/proposalContract";
import { userRepository } from "@/services/userRepository";
import { betaEvents } from "@/lib/telemetry/betaLogger";

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

export function useCurrentUserProposals() {
  return useQuery({
    queryKey: proposalKeys.userProposals("current"),
    queryFn: async () => {
      const userId = await userRepository.getAuthenticatedUserId();
      if (!userId) return [];
      return proposalRepository.getProposalsByUserId(userId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

export function useCreateProposal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateProposalDTO): Promise<ProposalResult> => {
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
