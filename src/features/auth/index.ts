export {
  useCurrentUser,
  useCurrentUserState,
  useIsAuthenticated,
  useUserXpProgress,
  type AuthUserStatus,
  type AuthUserState,
} from "./hooks/useCurrentUser";
export { useCurrentUserId } from "./hooks/useCurrentUserId";
export { useOAuthLogin } from "./hooks/useOAuthLogin";
export { useLogout } from "./hooks/useLogout";
export { useUserProgress } from "./hooks/useUserProgress";
// user_missions table may not exist — disable exports
// export {
//   useUserMissions,
//   useUserCompletedMissions,
//   useProfileCompletedMissions,
//   useProfileMissionTimeline,
// } from "./hooks/useUserMissions";
export {
  useCompleteUserMission,
  useCreateMission,
  useJoinUserMission,
} from "./hooks/useUserMissionMutations";

// Auth snapshot accessor (async, for route guards)
export { getAuthSnapshot } from "./getAuthSnapshot";

// Auth state machine exports
export {
  deriveAuthState,
  isAuthenticated as isAuthStateAuthenticated,
  isInitializing as isAuthStateInitializing,
  isUnauthenticated as isAuthStateUnauthenticated,
  type AuthState,
  type AuthStateSnapshot,
} from "./authStateMachine";

// Auth provider and hooks
export { AuthProvider, useAuth, useAuthState } from "./AuthProvider";
export { useMutationCoordinator, useMissionWriteRunner } from "./hooks/useMutationCoordinator";
export {
  useMissionMutationKindStatus,
  useUnifiedMissionMutationStatus,
} from "./hooks/useMissionMutationStatus";
export {
  runMissionWrite,
  reconcileCache,
  scheduleMissionCacheInvalidation,
  flushMissionCacheInvalidation,
  createMissionMutation,
  applyOptimistic,
  getMissionFromCache,
  applyOptimisticCreate,
  applyOptimisticJoin,
  applyOptimisticComplete,
} from "./mutations/missionMutationEngine";
export {
  invalidateAfterMissionCompleted,
  invalidateAfterMissionCreated,
  invalidateAfterMissionJoined,
  invalidateMissionCaches,
  invalidateMissionCreation,
  invalidateUserProgressQueries,
} from "./invalidateUserProgress";
export {
  missionCatalogQueryOptions,
  missionDetailQueryOptions,
  profileTimelineQueryOptions,
  territoryProgressQueryOptions,
  userMissionsCompletedEnrichedQueryOptions,
  userSessionQueryOptions,
} from "./queryOptions";
