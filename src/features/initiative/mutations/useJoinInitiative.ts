import {
  applyOptimisticJoin,
  createMissionMutation,
  getMissionFromCache,
} from "@/features/auth/mutations/missionMutationEngine";
import { resolveAuthenticatedUserId } from "@/features/auth/mutations/authMutationContext";
import { joinMission as joinMissionService } from "@/services/participationService";
import { emitInitiativeEvent } from "./emitInitiativeEvent";

type JoinInitiativeInput = {
  missionId: string;
};

export const useJoinInitiative = createMissionMutation<JoinInitiativeInput, boolean>({
  kind: "joinInitiative",
  mutationFn: async (queryClient, { missionId }) => {
    const userId = await resolveAuthenticatedUserId(queryClient);
    const result = await joinMissionService(missionId);
    emitInitiativeEvent({
      type: "MissionJoined",
      missionId,
      userId,
      timestamp: new Date().toISOString(),
    });
    return result;
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
