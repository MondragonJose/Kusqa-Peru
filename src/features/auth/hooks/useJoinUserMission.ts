/**
 * Mutation: join mission (mission_participants write path).
 * Uses participationService which correctly uses mission_participants table.
 */

import {
  applyOptimisticJoin,
  createMissionMutation,
  getMissionFromCache,
} from "@/features/auth/mutations/missionMutationEngine";
import { joinMission as joinMissionService } from "@/services/participationService";

type JoinUserMissionInput = {
  missionId: string;
};

export const useJoinUserMission = createMissionMutation<JoinUserMissionInput, boolean>({
  kind: "joinMission",
  mutationFn: async (_queryClient, { missionId }) => {
    return joinMissionService(missionId);
  },
  writeContext: ({ missionId }) => ({
    missionIds: [missionId],
  }),
  invalidate: ({ missionId }, _output, _userId) => ({
    missionIds: [missionId],
  }),
  optimistic: (queryClient, { missionId }, userId) => {
    if (!userId) return;
    const mission = getMissionFromCache(queryClient, missionId);
    if (mission) applyOptimisticJoin(queryClient, userId, mission);
  },
});
