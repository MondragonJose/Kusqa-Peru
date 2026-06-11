import {
  createMissionMutation,
} from "@/features/auth/mutations/missionMutationEngine";
import { proposalRepository } from "@/services/proposalRepository";
import { emitInitiativeEvent } from "./emitInitiativeEvent";

type ArchiveInitiativeInput = {
  proposalId: string;
};

export const useArchiveInitiative = createMissionMutation<ArchiveInitiativeInput, void>({
  kind: "archiveInitiative",
  mutationFn: async (_queryClient, { proposalId }) => {
    const result = await proposalRepository.updateProposal(proposalId, { status: "rejected" });
    if (result.status === "error") throw new Error(result.error);
    emitInitiativeEvent({
      type: "ProposalLocked",
      proposalId,
      timestamp: new Date().toISOString(),
    });
  },
  writeContext: ({ proposalId }) => ({
    proposalIds: [proposalId],
  }),
  invalidate: ({ proposalId }) => ({
    proposalIds: [proposalId],
  }),
});
