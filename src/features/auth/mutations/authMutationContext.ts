/**
 * Shared auth context for mutations (React Query layer only).
 */

import type { QueryClient } from "@tanstack/react-query";
import { userSessionQueryOptions } from "@/features/auth/queryOptions";

export async function resolveAuthenticatedUserId(queryClient: QueryClient): Promise<string> {
  const userId = await queryClient.fetchQuery(userSessionQueryOptions());
  if (!userId) {
    throw new Error("No authenticated user");
  }
  return userId;
}
