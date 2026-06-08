import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";

const mockMission = {
  id: "m1",
  title: "Misión territorial de prueba",
  description: "Una misión importante para la comunidad",
  district: "Cusco",
  districtId: "d1",
  region: "costa" as const,
  category: "Medio ambiente",
  xp: 100,
  participants: 5,
  spotsLeft: 10,
  date: "2026-06-15",
  distanceKm: 3.5,
  impact: "Alto impacto",
  difficulty: "Suave" as const,
  organizer: { name: "Ana", avatar: "" },
  coords: { lat: -13.5, lng: -71.9 },
  emoji: "🌿",
  status: "active" as const,
  startDate: "2026-06-15",
  endDate: null,
  lifecycleInfo: {
    lifecycle: "active" as const,
    isJoinable: true,
    isCompletable: true,
    isVisible: true,
    lifecyclePriority: 2,
    timeToStart: null,
    timeToEnd: null,
    timeToStartLabel: null,
    timeToEndLabel: null,
  },
};

function setupMocks(overrides: {
  useMission?: () => unknown;
  useProposal?: () => unknown;
}) {
  vi.resetModules();
  vi.doMock("@/hooks/useMissions", () => ({
    useMission: overrides.useMission ?? (() => ({ data: undefined, isLoading: false, isError: false })),
    useMissions: () => ({ data: [] }),
  }));
  vi.doMock("@/features/proposals", () => ({
    useProposal: overrides.useProposal ?? (() => ({ data: undefined, isLoading: false })),
  }));
  vi.doMock("@/features/auth", () => ({
    useCurrentUser: () => ({ id: "u1", name: "Ana", district: "Cusco" }),
    useJoinUserMission: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  }));
  vi.doMock("@/features/auth/hooks/useUserMissions", () => ({
    useProfileMissionTimeline: () => ({
      data: { missions: [], userMissions: [], totalCompleted: 0, activeRegions: [] },
    }),
  }));
  vi.doMock("@/hooks/useUploadMissionEvidence", () => ({
    useMissionEvidence: () => ({ data: [] }),
    useSubmitEvidence: () => ({ mutate: vi.fn(), isPending: false }),
    useUploadMissionEvidence: () => ({ mutate: vi.fn(), isPending: false }),
  }));
}

async function loadMissionPage() {
  const mod = await import("../app.mision.$missionId");
  return mod.Route.options.component as React.ComponentType;
}

describe("app.mision.$missionId", () => {
  it("shows a loading skeleton while the mission is loading", async () => {
    setupMocks({
      useMission: () => ({ isLoading: true, data: undefined }),
    });
    const Page = await loadMissionPage();
    renderWithProviders(<Page />, {
      testPath: "/app/mision/$missionId",
      initialEntries: ["/app/mision/m1"],
    });
    await waitFor(() => {
      expect(document.querySelector(".animate-pulse")).toBeTruthy();
    });
  });

  it("shows an error state when the mission/proposal is not found", async () => {
    setupMocks({});
    const Page = await loadMissionPage();
    renderWithProviders(<Page />, {
      testPath: "/app/mision/$missionId",
      initialEntries: ["/app/mision/m1"],
    });
    await waitFor(() => {
      expect(
        screen.getByText("No se pudo cargar la misión."),
      ).toBeInTheDocument();
    });
  });

  it("renders the mission detail when data is available", async () => {
    setupMocks({
      useMission: () => ({ data: mockMission, isLoading: false, isError: false }),
    });
    const Page = await loadMissionPage();
    renderWithProviders(<Page />, {
      testPath: "/app/mision/$missionId",
      initialEntries: ["/app/mision/m1"],
    });
    await waitFor(() => {
      expect(screen.getByText("Misión territorial de prueba")).toBeInTheDocument();
    });
  });
});
