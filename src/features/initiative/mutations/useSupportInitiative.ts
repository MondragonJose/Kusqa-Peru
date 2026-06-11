import {
  createMissionMutation,
} from "@/features/auth/mutations/missionMutationEngine";
import { proposalRepository } from "@/services/proposalRepository";
import { emitInitiativeEvent } from "./emitInitiativeEvent";

export const useSupportInitiative = createMissionMutation<string, void>({
  kind: "supportInitiative",
  mutationFn: async (_queryClient, proposalId) => {
    const result = await proposalRepository.supportProposal(proposalId);
    if (result.status === "error") throw new Error(result.error);
    emitInitiativeEvent({
      type: "ProposalSupported",
      proposalId,
      supporterId: "",
      timestamp: new Date().toISOString(),
    });
  },
  writeContext: (proposalId) => ({
    proposalIds: [proposalId],
  }),
  invalidate: (proposalId) => ({
    proposalIds: [proposalId],
  }),
});
