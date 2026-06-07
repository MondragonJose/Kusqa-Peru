/**
 * app.perfil.$userId route integration test — Phase 5A.3.
 *
 * Mocks the supabase client + auth hooks so the full route renders
 * in isolation. Verifies:
 *   - loading state shows a spinner
 *   - not-found state shows the public-safe fallback copy
 *   - public profile renders header + stats + territory + timeline
 *   - own-profile shows "Tu perfil público" label
 */
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { createSupabaseMock } from "../../test/createSupabaseMock";
import { renderWithProviders } from "../../test/renderWithProviders";
import { makePublicProfileRpc, makeCivicEventRow } from "../../test/factories";

const mock = createSupabaseMock();

// Mock the auth module to return a stable user id.
vi.mock("@/features/auth", () => ({
  useCurrentUserId: () => "other-user-id",
  useCurrentUser: () => null,
  useUserXpProgress: () => ({ progressPct: 0 }),
}));

vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));

const PublicProfilePage = (
  await import("../app.perfil.$userId")
).Route.options.component as React.ComponentType;

describe("app.perfil.$userId", () => {
  it("shows a loading state initially", async () => {
    // No mock response configured → usePublicProfile is in loading.
    renderWithProviders(
      <PublicProfilePage />,
      { testPath: "/app/perfil/$userId", initialEntries: ["/app/perfil/test-user-id"] },
    );
    // The loading view renders a Loader2 with class "animate-spin"
    // inside a centered flex container.
    await waitFor(() => {
      const spinners = document.querySelectorAll(".animate-spin");
      expect(spinners.length).toBeGreaterThan(0);
    });
  });

  it("shows a not-found state when the RPC returns no rows", async () => {
    mock.queue.rpcResponse("get_public_profile", { data: [], error: null });

    renderWithProviders(
      <PublicProfilePage />,
      { testPath: "/app/perfil/$userId", initialEntries: ["/app/perfil/test-user-id"] },
    );

    await waitFor(() => {
      expect(
        screen.getByText("No encontramos este perfil"),
      ).toBeInTheDocument();
    });
  });

  it("renders the public profile when the RPC returns a row", async () => {
    mock.queue.rpcResponse("get_public_profile", {
      data: [makePublicProfileRpc({ username: "ana_cusco", full_name: "Ana Quispe" })],
      error: null,
    });
    mock.queue.rpcResponse("get_civic_events_for_profile", {
      data: [makeCivicEventRow()],
      error: null,
    });

    renderWithProviders(
      <PublicProfilePage />,
      { testPath: "/app/perfil/$userId", initialEntries: ["/app/perfil/test-user-id"] },
    );

    await waitFor(() => {
      expect(screen.getByText("Ana Quispe")).toBeInTheDocument();
    });
    expect(screen.getByText("Perfil")).toBeInTheDocument();
  });

  it("labels the page as 'Tu perfil público' when viewing own profile", async () => {
    // Re-mock the auth module to return a userId matching the profile.
    vi.resetModules();
    vi.doMock("@/features/auth", () => ({
      useCurrentUserId: () => "22222222-2222-2222-2222-222222222222",
      useCurrentUser: () => null,
      useUserXpProgress: () => ({ progressPct: 0 }),
    }));
    mock.queue.rpcResponse("get_public_profile", {
      data: [makePublicProfileRpc()],
      error: null,
    });
    mock.queue.rpcResponse("get_civic_events_for_profile", {
      data: [],
      error: null,
    });
    const OwnProfilePage = (
      await import("../app.perfil.$userId")
    ).Route.options.component as React.ComponentType;

    renderWithProviders(
      <OwnProfilePage />,
      { testPath: "/app/perfil/$userId", initialEntries: ["/app/perfil/test-user-id"] },
    );

    // Both the sticky header and the trust badge display the label;
    // assert at least one is present.
    await waitFor(() => {
      expect(screen.getAllByText("Tu perfil público").length).toBeGreaterThan(0);
    });
  });
});
