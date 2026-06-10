import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";

const mockProposal = {
  id: "p1",
  userId: "u1",
  title: "Mi propuesta",
  description: "Una descripción",
  category: "ambiente",
  district: "Cusco",
  region: "costa" as const,
  teamSize: 3,
  images: [],
  status: "active" as const,
  latitude: null,
  longitude: null,
  proposedDate: null,
  districtId: null,
  summary: null,
  why: null,
  locationLabel: null,
  createdAt: "2026-06-07T10:00:00Z",
  updatedAt: "2026-06-07T10:00:00Z",
};

async function loadRoute() {
  vi.resetModules();
  vi.doMock("@/features/proposals", () => ({
    useProposal: () => ({ data: mockProposal, isLoading: false, isError: false, error: null }),
    useProposalCoalition: () => ({ data: null }),
    useSupportCount: () => ({ data: 0 }),
  }));
  vi.doMock("@/features/districts/hooks", () => ({
    useConvertProposal: () => ({ mutate: vi.fn(), isPending: false }),
    useReopenProposal: () => ({ mutate: vi.fn(), isPending: false }),
    useProposalLifecycle: () => ({ data: [] }),
  }));
  vi.doMock("@/features/auth", () => ({
    useCurrentUserId: () => "u1",
    useCurrentUser: () => ({ id: "u1", name: "Ana", district: "Cusco" }),
  }));
  vi.doMock("@/features/proposals/hooks/useSupportProposal", () => ({
    useSupportProposal: () => ({ mutate: vi.fn(), isPending: false }),
    useSupportCount: () => ({ data: 0 }),
  }));
  const mod = await import("../app.propuesta.$proposalId");
  return mod.Route.options.component as React.ComponentType;
}

describe("app.propuesta.$proposalId", () => {
  it("shows a loading spinner while the proposal is loading", async () => {
    vi.resetModules();
    vi.doMock("@/features/proposals", () => ({
      useProposal: () => ({ isLoading: true, data: undefined }),
      useProposalCoalition: () => ({ data: null }),
      useSupportCount: () => ({ data: 0 }),
    }));
    vi.doMock("@/features/districts/hooks", () => ({
      useConvertProposal: () => ({ mutate: vi.fn(), isPending: false }),
      useReopenProposal: () => ({ mutate: vi.fn(), isPending: false }),
      useProposalLifecycle: () => ({ data: [] }),
    }));
    vi.doMock("@/features/auth", () => ({
      useCurrentUserId: () => "u1",
      useCurrentUser: () => ({ id: "u1", name: "Ana", district: "Cusco" }),
    }));
    vi.doMock("@/features/proposals/hooks/useSupportProposal", () => ({
      useSupportProposal: () => ({ mutate: vi.fn(), isPending: false }),
    }));
    const mod = await import("../app.propuesta.$proposalId");
    const Page = mod.Route.options.component as React.ComponentType;

    renderWithProviders(<Page />, {
      testPath: "/app/propuesta/$proposalId",
      initialEntries: ["/app/propuesta/p1"],
    });

    await waitFor(() => {
      expect(document.body.querySelector(".animate-spin")).toBeTruthy();
    });
    expect(screen.queryByText("Propuesta")).not.toBeInTheDocument();
  });

  it("shows an error state when the proposal is not found", async () => {
    vi.resetModules();
    vi.doMock("@/features/proposals", () => ({
      useProposal: () => ({
        isError: true,
        data: undefined,
        error: new Error("No encontrado"),
      }),
      useSupportCount: () => ({ data: 0 }),
    }));
    vi.doMock("@/features/districts/hooks", () => ({
      useConvertProposal: () => ({ mutate: vi.fn(), isPending: false }),
      useReopenProposal: () => ({ mutate: vi.fn(), isPending: false }),
      useProposalLifecycle: () => ({ data: [] }),
    }));
    vi.doMock("@/features/auth", () => ({
      useCurrentUserId: () => "u1",
      useCurrentUser: () => ({ id: "u1", name: "Ana", district: "Cusco" }),
    }));
    vi.doMock("@/features/proposals/hooks/useSupportProposal", () => ({
      useSupportProposal: () => ({ mutate: vi.fn(), isPending: false }),
    }));
    const mod = await import("../app.propuesta.$proposalId");
    const Page = mod.Route.options.component as React.ComponentType;
    renderWithProviders(<Page />, {
      testPath: "/app/propuesta/$proposalId",
      initialEntries: ["/app/propuesta/p1"],
    });
    await waitFor(() => {
      expect(screen.getByText("No encontramos esta propuesta")).toBeInTheDocument();
    });
    expect(screen.getByText("No encontrado")).toBeInTheDocument();
  });

  it("renders the proposal page when data is available", async () => {
    const Page = await loadRoute();
    renderWithProviders(<Page />, {
      testPath: "/app/propuesta/$proposalId",
      initialEntries: ["/app/propuesta/p1"],
    });
    await waitFor(() => {
      expect(screen.getByText("Mi propuesta")).toBeInTheDocument();
    });
    expect(screen.getByText("Propuesta")).toBeInTheDocument();
  });
});
