import {
  createMissionMutation,
} from "@/features/auth/mutations/missionMutationEngine";
import { proposalConversionRepository } from "@/services/proposalConversionRepository";
import { emitInitiativeEvent } from "./emitInitiativeEvent";

type ConvertInitiativeInput = {
  proposalId: string;
  initialDate?: string | null;
  organizerNotes?: string | null;
};

export const useConvertInitiative = createMissionMutation<ConvertInitiativeInput, string>({
  kind: "convertInitiative",
  mutationFn: async (_queryClient, input) => {
    const result = await proposalConversionRepository.convert({
      proposalId: input.proposalId,
      initialDate: input.initialDate,
      organizerNotes: input.organizerNotes,
    });
    if (result.status === "error") throw new Error(result.error);
    emitInitiativeEvent({
      type: "ProposalConvertedToMission",
      proposalId: input.proposalId,
      missionId: result.data,
      timestamp: new Date().toISOString(),
    });
    return result.data;
  },
  writeContext: (input) => ({
    proposalIds: [input.proposalId],
  }),
  invalidate: (input) => ({
    proposalIds: [input.proposalId],
  }),
});
