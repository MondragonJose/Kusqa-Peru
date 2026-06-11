import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { assertQueryKeyConsistency } from "@/lib/queryKeys";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  assertQueryKeyConsistency();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const status = (error as { status?: number; code?: string })?.status;
          if (typeof status === "number" && status >= 400 && status < 500) return false;
          return failureCount < 2;
        },
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
