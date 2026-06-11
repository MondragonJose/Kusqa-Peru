import {
  createMissionMutation,
  getMissionFromCache,
} from "@/features/auth/mutations/missionMutationEngine";
import { resolveAuthenticatedUserId } from "@/features/auth/mutations/authMutationContext";
import { submitEvidence } from "@/services/evidenceService";
import { emitInitiativeEvent } from "./emitInitiativeEvent";
import type { EvidenceType } from "@/types";

type CompleteInitiativeInput = {
  missionId: string;
  type: EvidenceType;
  description?: string;
  caption?: string;
  file?: File;
};

export const useCompleteInitiative = createMissionMutation<CompleteInitiativeInput, boolean>({
  kind: "completeInitiative",
  mutationFn: async (queryClient, { missionId, type, description, caption, file }) => {
    const userId = await resolveAuthenticatedUserId(queryClient);
    await submitEvidence({ missionId, type, description, caption, file });
    emitInitiativeEvent({
      type: "EvidenceSubmitted",
      evidenceId: "",
      missionId,
      userId,
      actorId: userId,
      timestamp: new Date().toISOString(),
    });
    return true;
  },
  writeContext: ({ missionId }) => ({
    missionIds: [missionId],
  }),
  invalidate: ({ missionId }, _output, _userId) => ({
    missionIds: [missionId],
  }),
});
