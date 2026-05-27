/**
 * useCurrentUser — Auth boundary for domain User.
 * Live: Supabase Auth + profiles (+ user_progress for stats).
 * NO fallbacks to mock - returns null if no authenticated user.
 * 
 * Phase 2: Extended return with explicit auth state (backward compatible).
 */

import { useQuery } from "@tanstack/react-query";
import { LEVELS } from "@/constants/gamification";
import { userCurrentQueryOptions, userSessionQueryOptions } from "@/features/auth/queryOptions";
import type { User } from "@/types";
import { useUserProgress } from "./useUserProgress";
import { useAuth } from "../AuthProvider";

/**
 * Explicit auth state type (aligns with authStateMachine).
 */
export type AuthUserStatus = "initializing" | "authenticated" | "unauthenticated" | "error";

export interface AuthUserState {
  user: User | null;
  status: AuthUserStatus;
  isAuthenticated: boolean;
  isReady: boolean;
  error?: Error;
}

/**
 * Returns the current user for UI (null if not authenticated).
 * 
 * Phase 2: Maintains backward compatibility (returns User | null).
 * For explicit auth state, use useCurrentUserState().
 */
export function useCurrentUser(): User | null {
  const { data: user } = useQuery({
    ...userCurrentQueryOptions(),
    retry: false,
  });

  return user ?? null;
}

/**
 * Returns explicit auth state (aligns with authStateMachine).
 * 
 * Phase 2: New hook for explicit state without breaking existing consumers.
 * Consumers can migrate gradually from useCurrentUser() to this.
 * 
 * Usage:
 *   const { user, status, isAuthenticated, isReady, error } = useCurrentUserState();
 */
export function useCurrentUserState(): AuthUserState {
  const { data: user, isError, error: queryError } = useQuery({
    ...userCurrentQueryOptions(),
    retry: false,
  });

  const { authState } = useAuth();

  // Derive status from authStateMachine + query state
  let status: AuthUserStatus;
  let error: Error | undefined;

  if (authState.state === "initializing") {
    status = "initializing";
  } else if (isError) {
    status = "error";
    error = queryError instanceof Error ? queryError : new Error(String(queryError));
  } else if (authState.state === "authenticated" && user) {
    status = "authenticated";
  } else {
    status = "unauthenticated";
  }

  const state: AuthUserState = {
    user: user ?? null,
    status,
    isAuthenticated: status === "authenticated",
    isReady: authState.isReady,
    error,
  };

  // Debug log in DEV
  if (import.meta.env.DEV) {
    console.log("[KUSQA AUTH STATE] useCurrentUserState:", {
      status: state.status,
      isReady: state.isReady,
      isAuthenticated: state.isAuthenticated,
      userName: state.user?.name,
      hasError: !!state.error,
    });
  }

  return state;
}

/**
 * Returns whether the user is authenticated.
 */
export function useIsAuthenticated(): boolean {
  const { data: userId, isSuccess } = useQuery({
    ...userSessionQueryOptions(),
    retry: false,
  });

  return isSuccess && !!userId;
}

/**
 * XP progress toward the next level from domain User + LEVELS config.
 */
export function useUserXpProgress(): {
  currentXp: number;
  fromXp: number;
  toXp: number;
  progressPct: number;
} {
  const user = useCurrentUser();
  const territoryProgress = useUserProgress();

  // Fallback seguro si user es null (profile no creado aún)
  if (!user) {
    return {
      currentXp: 0,
      fromXp: 0,
      toXp: 100,
      progressPct: 0,
    };
  }

  const userWithProgress: User = {
    ...user,
    missionsDone: territoryProgress.totalMissionsCompleted,
    peopleImpacted: territoryProgress.communityPoints,
  };

  const currentLevel =
    LEVELS.find((l) => userWithProgress.xp >= l.from && userWithProgress.xp < l.to) ?? LEVELS[0];
  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1) ?? currentLevel;
  const fromXp = currentLevel.from;
  const toXp = nextLevel.from;
  const range = toXp - fromXp;

  return {
    currentXp: userWithProgress.xp,
    fromXp,
    toXp,
    progressPct:
      range > 0
        ? Math.min(100, Math.max(0, ((userWithProgress.xp - fromXp) / range) * 100))
        : 100,
  };
}
