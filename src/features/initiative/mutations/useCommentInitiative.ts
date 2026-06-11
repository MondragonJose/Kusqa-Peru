import {
  createMissionMutation,
} from "@/features/auth/mutations/missionMutationEngine";
import { proposalCommentRepository } from "@/services/proposalCommentRepository";
import { emitInitiativeEvent } from "./emitInitiativeEvent";
import type { CreateCommentDTO } from "@/services/proposalContract";

export const useCommentInitiative = createMissionMutation<CreateCommentDTO, void>({
  kind: "commentInitiative",
  mutationFn: async (_queryClient, dto) => {
    const result = await proposalCommentRepository.create(dto);
    if (result.status === "error") throw new Error(result.error);
    emitInitiativeEvent({
      type: "ProposalCommentAdded",
      proposalId: dto.proposalId,
      commentId: result.data.id,
      actorId: "",
      timestamp: new Date().toISOString(),
    });
  },
  writeContext: (dto) => ({
    proposalIds: [dto.proposalId],
  }),
  invalidate: (dto) => ({
    proposalIds: [dto.proposalId],
  }),
});
