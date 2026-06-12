import { useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalKeys, missionKeys } from "@/lib/queryKeys";
import { initiativeContinuationRepository } from "@/services/initiativeContinuationRepository";
import { resolveAuthenticatedUserId } from "@/features/auth/mutations/authMutationContext";
import { isLivingTerritoryEnabled } from "@/lib/operationalFeature";

type ContinueInitiativeInput = {
  initiativeId: string;
  /** 'proposal' | 'mission' — which entity type the initiative id refers to. */
  kind: "proposal" | "mission";
};

export function useContinueInitiative() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ContinueInitiativeInput) => {
      if (!isLivingTerritoryEnabled()) {
        throw new Error("Funcionalidad no disponible.");
      }
      const userId = await resolveAuthenticatedUserId(queryClient);
      const result = await initiativeContinuationRepository.continue(
        input.initiativeId,
        userId,
      );
      if (result.status === "error") {
        throw new Error(result.error);
      }
      return { ...result.data, userId };
    },
    onSuccess: (_data, input) => {
      // Invalidate the relevant query caches
      if (input.kind === "proposal") {
        queryClient.invalidateQueries({ queryKey: proposalKeys.all() });
        queryClient.invalidateQueries({ queryKey: proposalKeys.detail(input.initiativeId) });
      } else {
        queryClient.invalidateQueries({ queryKey: missionKeys.all });
        queryClient.invalidateQueries({ queryKey: missionKeys.detail(input.initiativeId) });
      }
    },
  });
}
