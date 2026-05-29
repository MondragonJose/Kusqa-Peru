import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { proposalRepository } from "@/services/proposalRepository";
import { proposalSupportKeys } from "@/lib/queryKeys";
import { userRepository } from "@/services/userRepository";
import { toast } from "sonner";

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

export function useSupportProposal() {
  const queryClient = useQueryClient();
  const { data: supportedIds = [] } = useSupportedProposalIds();

  const supportMutation = useMutation({
    mutationFn: (proposalId: string) => proposalRepository.supportProposal(proposalId),
    onMutate: async (proposalId: string) => {
      await queryClient.cancelQueries({ queryKey: proposalSupportKeys.byUser("current") });
      const previous = queryClient.getQueryData<string[]>(proposalSupportKeys.byUser("current"));
      queryClient.setQueryData<string[]>(proposalSupportKeys.byUser("current"), (old) =>
        old ? [...old, proposalId] : [proposalId]
      );
      return { previous };
    },
    onError: (_err, _proposalId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(proposalSupportKeys.byUser("current"), context.previous);
      }
      toast.error("No se pudo apoyar la iniciativa. Intenta de nuevo.");
    },
    onSuccess: () => {
      toast.success("¡Gracias por apoyar esta iniciativa!", {
        description: "Tu apoyo ayuda a movilizar la comunidad",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: proposalSupportKeys.byUser("current") });
    },
  });

  const supportProposal = async ({ proposalId }: { proposalId: string }) => {
    if (supportMutation.isPending) return;
    if (supportedIds.includes(proposalId)) {
      toast.info("Ya apoyaste esta iniciativa");
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
