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
