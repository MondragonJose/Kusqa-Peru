import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { proposalRepository } from "@/services/proposalRepository";
import { proposalKeys, proposalSupportKeys } from "@/lib/queryKeys";
import { userRepository } from "@/services/userRepository";
import { toast } from "sonner";
import { consumeRateLimit } from "@/lib/rateLimiter";
import { proposalSupportCountQueryOptions } from "../queryOptions";
import { isUnifiedWritesEnabled } from "@/features/initiative/mutations/initiativeMutationTypes";
import { runMissionWrite } from "@/features/auth/mutations/missionMutationEngine";

export function useSupportedProposalIds() {
  return useQuery({
    queryKey: proposalSupportKeys.byUser("current"),
    queryFn: async () => {
      const userId = await userRepository.getAuthenticatedUserId();
      if (!userId) return [];
      return proposalRepository.getSupportedProposalIds(userId);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useSupportCount(proposalId: string) {
  return useQuery({
    ...proposalSupportCountQueryOptions(proposalId),
  });
}

export function useSupportProposal() {
  const queryClient = useQueryClient();
  const { data: supportedIds = [] } = useSupportedProposalIds();
  const unifiedEnabled = isUnifiedWritesEnabled();

  const supportMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      if (unifiedEnabled) {
        await runMissionWrite(queryClient, {
          kind: "supportInitiative",
          writeContext: { proposalIds: [proposalId] },
          steps: [() => proposalRepository.supportProposal(proposalId)],
          invalidate: { proposalIds: [proposalId] },
        });
        return;
      }
      const result = await proposalRepository.supportProposal(proposalId);
      if (result.status === "error") throw new Error(result.error);
    },
    onMutate: async (proposalId: string) => {
      await queryClient.cancelQueries({ queryKey: proposalSupportKeys.byUser("current") });
      await queryClient.cancelQueries({ queryKey: proposalSupportKeys.count(proposalId) });
      await queryClient.cancelQueries({
        queryKey: proposalSupportKeys.supportersPreview(proposalId, 10),
      });

      const previous = queryClient.getQueryData<string[]>(proposalSupportKeys.byUser("current"));

      queryClient.setQueryData<string[]>(proposalSupportKeys.byUser("current"), (old) =>
        old ? [...old, proposalId] : [proposalId],
      );

      queryClient.setQueryData<number>(proposalSupportKeys.count(proposalId), (old) =>
        old != null ? old + 1 : undefined,
      );

      return { previous };
    },
    onError: (_err, proposalId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(proposalSupportKeys.byUser("current"), context.previous);
      }
      queryClient.invalidateQueries({ queryKey: proposalSupportKeys.count(proposalId) });
      toast.error("No se pudo apoyar la iniciativa. Intenta de nuevo.");
    },
    onSuccess: (_, proposalId) => {
      queryClient.invalidateQueries({ queryKey: proposalSupportKeys.count(proposalId) });
      queryClient.invalidateQueries({
        queryKey: proposalSupportKeys.supportersPreview(proposalId, 10),
      });
      toast.success("¡Gracias por apoyar esta iniciativa!", {
        description: "Tu apoyo ayuda a movilizar la comunidad",
      });
    },
    onSettled: (_, __, proposalId) => {
      queryClient.invalidateQueries({ queryKey: proposalSupportKeys.byUser("current") });
      queryClient.invalidateQueries({ queryKey: proposalSupportKeys.count(proposalId) });
      queryClient.invalidateQueries({
        queryKey: proposalSupportKeys.supportersPreview(proposalId, 10),
      });
      queryClient.invalidateQueries({ queryKey: proposalKeys.detail(proposalId) });
    },
  });

  const supportProposal = async ({ proposalId }: { proposalId: string }) => {
    if (supportMutation.isPending) return;
    if (supportedIds.includes(proposalId)) {
      toast.info("Ya apoyaste esta iniciativa");
      return;
    }
    if (!consumeRateLimit("toggleSupport")) {
      toast.error("Demasiadas acciones. Espera un momento antes de apoyar más iniciativas.");
      return;
    }
    supportMutation.mutate(proposalId);
  };

  const isSupported = (proposalId: string) => supportedIds.includes(proposalId);

  return {
    supportProposal,
    isSupported,
    isSupporting: supportMutation.isPending,
  };
}
