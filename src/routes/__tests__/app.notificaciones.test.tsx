/**
 * app.notificaciones route integration test — Phase 5A.3.
 *
 * Verifies the route's empty state, mark-all-read button, and the
 * per-row markRead click handler. The mock is scoped per-test using
 * `vi.resetModules` so each test gets a fresh module-level inbox
 * store that the test owns.
 */
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { makeUserNotificationRow } from "../../test/factories";

// Per-test scratch. Filled in by each `it` via `setInbox`.
let inbox: ReturnType<typeof makeUserNotificationRow>[] = [];
let markReadCalls: string[] = [];

function setInbox(rows: ReturnType<typeof makeUserNotificationRow>[]) {
  inbox = rows;
  markReadCalls = [];
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
    useMarkNotificationRead: () => ({
      mutate: (id: string) => markReadCalls.push(id),
    }),
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
      expect(
        screen.getByText(/Tu territorio está tranquilo por ahora/),
      ).toBeInTheDocument();
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

  it("fires per-id markRead mutations on the mark-all-read click", async () => {
    setInbox([
      makeUserNotificationRow({ id: "n1", read_at: null }),
      makeUserNotificationRow({ id: "n2", read_at: null }),
    ]);
    const Page = await loadRoute();
    renderWithProviders(<Page />);

    const btn = await screen.findByRole("button", { name: /Marcar como leídas/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(markReadCalls).toContain("n1");
      expect(markReadCalls).toContain("n2");
    });
  });
});
