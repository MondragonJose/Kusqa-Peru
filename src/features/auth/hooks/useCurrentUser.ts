/**
 * useCurrentUser — Auth boundary for domain User.
 * Live: Supabase Auth + profiles (+ user_progress for stats).
 * NO fallbacks to mock - returns null if no authenticated user.
 */

import { useQuery } from "@tanstack/react-query";
import { LEVELS } from "@/constants/gamification";
import { userCurrentQueryOptions, userSessionQueryOptions } from "@/features/auth/queryOptions";
import type { User } from "@/types";
import { useUserProgress } from "./useUserProgress";

/**
 * Returns the current user for UI (null if not authenticated).
 */
export function useCurrentUser(): User | null {
  const { data: user } = useQuery({
    ...userCurrentQueryOptions(),
    retry: false,
  });

  return user ?? null;
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
