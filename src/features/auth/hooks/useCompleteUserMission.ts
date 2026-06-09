/**
 * Mutation: submit mission evidence (canonical completion flow).
 *
 * The old direct completion (completeMission) is deprecated.
 * This hook uses submitEvidence — evidence enters pending state,
 * verification finalizes the mission completion.
 */

import {
  createMissionMutation,
  getMissionFromCache,
} from "@/features/auth/mutations/missionMutationEngine";
import { submitEvidence } from "@/services/missions";
import type { EvidenceType } from "@/types";

type SubmitMissionEvidenceInput = {
  missionId: string;
  type: EvidenceType;
  description?: string;
  caption?: string;
  file?: File;
};

export const useSubmitMissionEvidence = createMissionMutation<SubmitMissionEvidenceInput, boolean>({
  kind: "submitEvidence",
  mutationFn: async (_queryClient, { missionId, type, description, caption, file }) => {
    await submitEvidence({ missionId, type, description, caption, file });
    return true;
  },
  writeContext: ({ missionId }) => ({
    missionIds: [missionId],
  }),
  invalidate: ({ missionId }, _output, _userId) => ({
    missionIds: [missionId],
  }),
  optimistic: (_queryClient, _input, _userId) => {
    // No optimistic evidence patch — evidence feed is invalidated on success
    // The user missions cache shows "awaiting_verification" after refetch
  },
});
