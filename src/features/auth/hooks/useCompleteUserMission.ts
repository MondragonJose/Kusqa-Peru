/**

 * Mutation: complete user mission + optimistic XP / timeline update.

 * Server XP is authoritative (missions.xp_reward); optimistic uses catalog cache only.

 */



import { resolveAuthenticatedUserId } from "@/features/auth/mutations/authMutationContext";

import {

  applyOptimisticComplete,

  createMissionMutation,

  getMissionFromCache,

} from "@/features/auth/mutations/missionMutationEngine";

import { completeMission as completeMissionService } from "@/services/missions";



type CompleteUserMissionInput = {

  missionId: string;

};



export const useCompleteUserMission = createMissionMutation<

  CompleteUserMissionInput,

  boolean

>({

  kind: "completeMission",

  mutationFn: async (queryClient, { missionId }) => {

    const userId = await resolveAuthenticatedUserId(queryClient);

    return completeMissionService(missionId, userId);

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

    if (mission) applyOptimisticComplete(queryClient, userId, mission, mission.xp);

  },

});


