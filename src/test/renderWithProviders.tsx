/**
 * renderWithProviders — Phase 5A.
 *
 * Mounts a React element as a TanStack Router index route (so
 * `useRouterState`, `Link`, and `useQuery` all work) plus a
 * QueryClientProvider. Used by route integration tests.
 *
 *   renderWithProviders(<MyPage />, {
 *     initialEntries: ["/app/mision/abc"],
 *   });
 *
 * The UI is mounted as the router's index route. `useLocation`
 * inside the component will report the initial entry's pathname.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
  type Router,
  type AnyRoute,
} from "@tanstack/react-router";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";

type RenderWithProvidersOptions = {
  /** Initial router location(s). Default: ["/"]. */
  initialEntries?: string[];
  /**
   * Pre-seeded routes to register, used to satisfy strict `useParams({ from })`
   * lookups inside the test component. Each route gets `path` + a render
   * function. The test component is the LAST registered route's component.
   */
  routes?: Array<{ path: string; component: () => ReactNode }>;
  /**
   * Path the test component is registered at. Defaults to "/". The route
   * tree is built from the parent path to this test path so that
   * `useParams({ from: "<testPath>" })` resolves.
   */
  testPath?: string;
  /** Override the QueryClient (e.g. to disable retries). */
  queryClient?: QueryClient;
} & Omit<RenderOptions, "wrapper">;

type RenderWithRouterResult = RenderResult & {
  router: Router<
    AnyRoute,
    "never",
    false,
    import("@tanstack/react-router").RouterHistory,
    Record<string, unknown>
  >;
};

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderWithRouterResult {
  const {
    initialEntries = ["/"],
    routes = [],
    testPath = "/",
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0, staleTime: 0 },
        mutations: { retry: false },
      },
    }),
    ...renderOptions
  } = options;

  const rootRoute = createRootRoute();

  // The test's UI is mounted at `testPath` (default "/"). This
  // matches `useParams({ from: testPath })` lookups inside the
  // component.
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: testPath,
    component: () => ui,
  });

  const auxRoutes = routes.map((r) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path: r.path,
      component: () => <>{r.component()}</>,
    }),
  );

  const routeTree = rootRoute.addChildren([indexRoute, ...auxRoutes]);

  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries }),
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {children}
    </QueryClientProvider>
  );

  // Pass `null` — RouterProvider renders the matched route on its
  // own; we don't double-render.
  const result = render(<></>, {
    wrapper: Wrapper,
    ...renderOptions,
  });

  return { ...result, router };
}
