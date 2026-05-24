/**
 * Mutation: create mission (catalog write path).
 */

import {
  applyOptimisticCreate,
  createMissionMutation,
} from "@/features/auth/mutations/missionMutationEngine";
import { missionRepository } from "@/services/missionRepository";
import type { Mission } from "@/types";

export const useCreateMission = createMissionMutation<Omit<Mission, "id">, Mission>({
  kind: "createMission",
  requiresAuth: false,
  mutationFn: (_queryClient, input) => missionRepository.create(input),
  writeContext: () => ({ missionIds: [] }),
  invalidate: (_input, output, userId) => ({
    missionIds: [output.id],
    userId,
  }),
  optimistic: (queryClient, input) => {
    applyOptimisticCreate(queryClient, {
      ...input,
      id: `optimistic-${Date.now()}`,
    });
  },
});
