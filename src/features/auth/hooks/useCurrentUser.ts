/**
 * useCurrentUser — Auth Preparation Hook
 *
 * CURRENT BEHAVIOR: Returns the static mock CURRENT_USER.
 * FUTURE BEHAVIOR: Will return the authenticated Supabase session user.
 *
 * This hook exists to create a migration-safe boundary.
 * When Supabase Auth is integrated, ONLY this file changes.
 * All consumers of useCurrentUser() require zero refactoring.
 *
 * @see src/features/auth/README.md for migration guide
 */
import { CURRENT_USER } from "@/data/kusqa";
import type { User } from "@/types";

/**
 * Returns the current authenticated user.
 * Currently backed by static mock data.
 * Will be replaced with Supabase session data during auth integration.
 */
export function useCurrentUser(): User {
  // TODO(auth-agent): Replace with:
  // const { data: { user } } = useSupabaseAuth();
  // return mapSupabaseUserToKusqaUser(user);
  return CURRENT_USER;
}

/**
 * Returns whether the user is authenticated.
 * Currently always true (mock).
 * Will return false for unauthenticated users after auth integration.
 */
export function useIsAuthenticated(): boolean {
  // TODO(auth-agent): Replace with actual session check
  return true;
}

/**
 * Returns the current user's XP progress toward the next level.
 * Derived from useCurrentUser() for convenience.
 */
export function useUserXpProgress(): { currentXp: number; fromXp: number; toXp: number; progressPct: number } {
  const user = useCurrentUser();
  // Level 4 thresholds from LEVELS constant
  // TODO(auth-agent): Derive dynamically from LEVELS[user.level]
  const fromXp = 3500;
  const toXp = 6500;
  return {
    currentXp: user.xp,
    fromXp,
    toXp,
    progressPct: Math.min(100, Math.max(0, ((user.xp - fromXp) / (toXp - fromXp)) * 100)),
  };
}
