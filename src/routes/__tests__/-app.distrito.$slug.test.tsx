import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";

const mockDistrict = {
  id: "d1",
  slug: "cusco",
  displayName: "Cusco",
  region: "costa" as const,
  department: "Cusco",
  latitude: -13.5,
  longitude: -71.9,
  narrative: "Un distrito histórico",
  sortOrder: 1,
};

const mockStats = {
  districtId: "d1",
  slug: "cusco",
  displayName: "Cusco",
  region: "costa" as const,
  department: "Cusco",
  missionCount: 5,
  upcomingMissionCount: 2,
  completedMissionCount: 3,
  proposalCount: 3,
  activeProposalCount: 1,
  uniqueSupporterCount: 20,
  acceptedCollaboratorCount: 0,
  lastActivityAt: "2026-06-07T10:00:00Z",
};

const mockFeed = {
  activeProposals: [],
  recentMissions: [],
};

const mockActivity: unknown[] = [];
const mockTopSupporters: unknown[] = [];

function setupMocks(overrides: {
  useDistrict?: () => unknown;
  useDistrictStats?: () => unknown;
  useDistrictFeed?: () => unknown;
  useDistrictActivity?: () => unknown;
  useDistrictTopSupporters?: () => unknown;
}) {
  vi.resetModules();
  vi.doMock("@/features/districts/hooks", () => ({
    useDistrict: overrides.useDistrict ?? (() => ({ data: mockDistrict, isLoading: false, isError: false })),
    useDistrictStats: overrides.useDistrictStats ?? (() => ({ data: mockStats, isLoading: false })),
    useDistrictFeed: overrides.useDistrictFeed ?? (() => ({ data: mockFeed, isLoading: false })),
    useDistrictActivity: overrides.useDistrictActivity ?? (() => ({ data: mockActivity })),
    useDistrictTopSupporters: overrides.useDistrictTopSupporters ?? (() => ({ data: mockTopSupporters })),
  }));
  vi.doMock("@/features/auth", () => ({
    useCurrentUserId: () => "u1",
  }));
}

async function loadPage() {
  const mod = await import("../app.distrito.$slug");
  return mod.Route.options.component as React.ComponentType;
}

describe("app.distrito.$slug", () => {
  it("shows a loading spinner when the district is loading", async () => {
    setupMocks({
      useDistrict: () => ({ isLoading: true, data: undefined }),
    });
    const Page = await loadPage();
    renderWithProviders(<Page />, {
      testPath: "/app/distrito/$slug",
      initialEntries: ["/app/distrito/cusco"],
    });
    await waitFor(() => {
      expect(document.querySelector(".animate-spin")).toBeTruthy();
    });
  });

  it("shows an error page when the district is not found", async () => {
    setupMocks({
      useDistrict: () => ({ isError: true, data: undefined }),
    });
    const Page = await loadPage();
    renderWithProviders(<Page />, {
      testPath: "/app/distrito/$slug",
      initialEntries: ["/app/distrito/unknown"],
    });
    await waitFor(() => {
      expect(screen.getByText("No encontramos este distrito")).toBeInTheDocument();
    });
  });

  it("renders the district page when data is available", async () => {
    setupMocks({});
    const Page = await loadPage();
    renderWithProviders(<Page />, {
      testPath: "/app/distrito/$slug",
      initialEntries: ["/app/distrito/cusco"],
    });
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: "Cusco" })).toBeInTheDocument();
    });
  });
});
