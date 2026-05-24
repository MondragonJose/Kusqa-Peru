/**
 * Mutation: join mission (mission_participants write path).
 * Uses services/missions.ts which correctly uses mission_participants table.
 */

import { resolveAuthenticatedUserId } from "@/features/auth/mutations/authMutationContext";
import {
  applyOptimisticJoin,
  createMissionMutation,
  getMissionFromCache,
} from "@/features/auth/mutations/missionMutationEngine";
import { joinMission as joinMissionService } from "@/services/missions";

type JoinUserMissionInput = {
  missionId: string;
};

export const useJoinUserMission = createMissionMutation<JoinUserMissionInput, boolean>({
  kind: "joinMission",
  mutationFn: async (queryClient, { missionId }) => {
    const userId = await resolveAuthenticatedUserId(queryClient);
    return joinMissionService(missionId, userId);
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
    if (mission) applyOptimisticJoin(queryClient, userId, mission);
  },
});
