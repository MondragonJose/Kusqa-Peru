/**
 * Mutation: submit mission evidence (canonical completion flow).
 *
 * The old direct completion (completeMission) is deprecated.
 * This hook uses submitEvidence — evidence enters pending state,
 * verification finalizes the mission completion.
 */

import { resolveAuthenticatedUserId } from "@/features/auth/mutations/authMutationContext";
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

export const useSubmitMissionEvidence = createMissionMutation<
  SubmitMissionEvidenceInput,
  boolean
>({
  kind: "submitEvidence",
  mutationFn: async (queryClient, { missionId, type, description, caption, file }) => {
    const userId = await resolveAuthenticatedUserId(queryClient);
    await submitEvidence({ userId, missionId, type, description, caption, file });
    return true;
  },
  writeContext: ({ missionId }, userId) => ({
    userId,
    missionIds: [missionId],
  }),
  invalidate: ({ missionId }, _output, userId) => ({
    userId,
    missionIds: [missionId],
  }),
  optimistic: (queryClient, { missionId }, userId) => {
    if (!userId) return;
    const mission = getMissionFromCache(queryClient, missionId);
    // No optimistic evidence patch — evidence feed is invalidated on success
    // The user missions cache shows "awaiting_verification" after refetch
  },
});
