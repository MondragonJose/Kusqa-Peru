/**
 * app.notificaciones route integration test — Phase 5A.3.
 *
 * Verifies the route's empty state, notification row rendering,
 * territory header, and disabled settings button.
 * Mocks are scoped per-test via vi.resetModules + vi.doMock.
 */
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { makeUserNotificationRow } from "../../test/factories";

let inbox: ReturnType<typeof makeUserNotificationRow>[] = [];

function setInbox(rows: ReturnType<typeof makeUserNotificationRow>[]) {
  inbox = rows;
}

async function loadRoute() {
  vi.resetModules();
  vi.doMock("@/features/auth", () => ({
    useCurrentUser: () => ({ id: "u1", name: "Ana", district: "Cusco" }),
  }));
  vi.doMock("@/features/auth/queryOptions", () => ({
    userSessionQueryOptions: () => ({
      queryKey: ["userSession"],
      queryFn: () => Promise.resolve("u1"),
    }),
  }));
  vi.doMock("@/lib/userFeature", () => ({
    isLiveUserEnabled: () => true,
    isOperationalUser: () => true,
  }));
  vi.doMock("@/hooks/useNotifications", () => ({
    useLiveNotificationInbox: () => ({ data: inbox }),
    useMarkNotificationRead: () => ({ mutate: vi.fn() }),
  }));
  const mod = await import("../app.notificaciones");
  return mod.Route.options.component as React.ComponentType;
}

describe("app.notificaciones", () => {
  it("shows the empty state when there are no notifications", async () => {
    setInbox([]);
    const Page = await loadRoute();
    renderWithProviders(<Page />);

    await waitFor(() => {
      expect(screen.getByText(/Tu territorio está tranquilo por ahora/)).toBeInTheDocument();
    });
  });

  it("renders a notification row when the inbox has a row", async () => {
    setInbox([makeUserNotificationRow({ read_at: null })]);
    const Page = await loadRoute();
    renderWithProviders(<Page />);

    await waitFor(() => {
      expect(screen.getByText("Te uniste a la misión")).toBeInTheDocument();
    });
  });

  it("shows the territory context line in the header", async () => {
    setInbox([]);
    const Page = await loadRoute();
    renderWithProviders(<Page />);

    await waitFor(() => {
      expect(
        screen.getByText(/El territorio habla: Hay movimiento activo en Cusco/),
      ).toBeInTheDocument();
    });
  });

  it("has a settings button (disabled, future feature)", async () => {
    setInbox([]);
    const Page = await loadRoute();
    renderWithProviders(<Page />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Ajustes de alertas/i })).toBeDisabled();
    });
  });
});
