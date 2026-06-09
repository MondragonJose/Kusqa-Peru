/**
 * Mutation: create mission (catalog write path).
 */

import {
  applyOptimisticCreate,
  createMissionMutation,
} from "@/features/auth/mutations/missionMutationEngine";
import { missionRepository } from "@/services/missionRepository";
import { consumeRateLimit, getRateLimitResetMs } from "@/lib/rateLimiter";
import type { Mission } from "@/types";

export const useCreateMission = createMissionMutation<Omit<Mission, "id">, Mission>({
  kind: "createMission",
  requiresAuth: true,
  mutationFn: (_queryClient, input) => {
    if (!consumeRateLimit("createMission")) {
      const resetMs = getRateLimitResetMs("createMission");
      throw new Error(`Demasiadas misiones. Intenta de nuevo en ${Math.ceil(resetMs / 1000)}s.`);
    }
    return missionRepository.create(input);
  },
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
