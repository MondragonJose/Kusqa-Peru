/**
 * useCurrentUserId — returns the auth user id (uuid) or null.
 * Use this when you need the actual auth.users.id, e.g. for ownership
 * comparisons on proposals/comments. The domain `User` type does not
 * expose the id directly.
 */

import { useQuery } from "@tanstack/react-query";
import { userSessionQueryOptions } from "@/features/auth/queryOptions";
import { useAuth } from "../AuthProvider";

export function useCurrentUserId(): string | null {
  const { authState } = useAuth();
  const { data } = useQuery({
    ...userSessionQueryOptions(),
    retry: false,
    enabled: authState.isReady,
  });
  return data ?? null;
}
