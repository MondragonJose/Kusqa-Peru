import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import type { InitiativeMapEntity } from "@/domain/initiativeMapEntity";

const MISSION_ENTITY: InitiativeMapEntity = {
  id: "mission-1",
  prefixedId: "mission_mission-1",
  sourceType: "mission",
  sourceId: "mission-1",
  title: "Limpieza de playa",
  summary: "Jornada de limpieza en la costa verde",
  category: "Medio ambiente",
  region: "costa",
  lifecycle: "active",
  emoji: "🌊",
  location: {
    district: "Miraflores",
    districtId: null,
    region: "costa",
    coords: { lat: -12.0464, lng: -77.0428 },
    locationLabel: null,
  },
  temporalAnchor: { label: "Próximamente", kind: "scheduled", referenceDate: "2026-07-15" },
  supportCount: 0,
  supportersCount: 0,
  vitalityScore: null,
  xp: 150,
  difficulty: "Suave",
  impact: "Alto",
  organizerName: "Ana",
  organizerAvatar: null,
  participants: 10,
  spotsLeft: 5,
  distanceKm: 3.5,
  date: "2026-07-15",
  original: {} as any,
};

const PROPOSAL_ENTITY: InitiativeMapEntity = {
  id: "proposal-1",
  prefixedId: "proposal_proposal-1",
  sourceType: "proposal",
  sourceId: "proposal-1",
  title: "Taller de reciclaje comunitario",
  summary: "Aprender a reciclar en el distrito",
  category: "Medio ambiente",
  region: "costa",
  lifecycle: "forming",
  emoji: "♻️",
  location: {
    district: "San Isidro",
    districtId: null,
    region: "costa",
    coords: { lat: -12.0973, lng: -77.0361 },
    locationLabel: null,
  },
  temporalAnchor: { label: "Propuesta activa", kind: "pending", referenceDate: "2026-06-01" },
  supportCount: 5,
  supportersCount: 0,
  vitalityScore: null,
  xp: null,
  difficulty: null,
  impact: null,
  organizerName: null,
  organizerAvatar: null,
  participants: null,
  spotsLeft: null,
  distanceKm: null,
  date: null,
  original: {} as any,
};

function setupMocks(overrides?: {
  entities?: InitiativeMapEntity[];
}) {
  vi.resetModules();
  vi.doMock("@/features/map/hooks/useMapEntities", () => ({
    useMapEntities: () => ({
      data: overrides?.entities ?? [MISSION_ENTITY, PROPOSAL_ENTITY],
      isLoading: false,
      isError: false,
    }),
  }));
  vi.doMock("@/features/map/hooks/useUserLocation", () => ({
    useUserLocation: () => ({
      coords: { lat: -12.0, lng: -77.0 },
      loading: false,
      requestUserLocation: vi.fn(),
    }),
  }));
  vi.doMock("@/features/map/components/MapView", () => ({
    MapView: ({
      missions,
      onRequestDetail,
      selectedMissionId,
    }: {
      missions: InitiativeMapEntity[];
      onRequestDetail?: (id: string) => void;
      selectedMissionId: string | null;
    }) => (
      <div data-testid="mock-mapview">
        <div data-testid="selected-mission-id">{selectedMissionId ?? "null"}</div>
        {missions.map((m) => (
          <button
            key={m.id}
            data-testid={`marker-${m.id}`}
            data-source-type={m.sourceType}
            onClick={() => onRequestDetail?.(m.id)}
          >
            {m.emoji} {m.title}
          </button>
        ))}
      </div>
    ),
  }));
}

async function loadMapPage() {
  const mod = await import("../app.mapa");
  return mod.Route.options.component as React.ComponentType;
}

describe("app.mapa — selection logic", () => {
  it("selects a mission marker and shows its detail in the dialog", async () => {
    setupMocks();
    const Page = await loadMapPage();
    renderWithProviders(<Page />, {
      testPath: "/app/mapa",
      initialEntries: ["/app/mapa"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("marker-mission-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("marker-mission-1"));

    await waitFor(() => {
      expect(screen.getAllByText("Limpieza de playa").length).toBeGreaterThan(0);
    });
  });

  it("selects a proposal marker and shows its detail instead of jumping to first mission", async () => {
    setupMocks();
    const Page = await loadMapPage();
    renderWithProviders(<Page />, {
      testPath: "/app/mapa",
      initialEntries: ["/app/mapa"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("marker-proposal-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("marker-proposal-1"));

    await waitFor(() => {
      expect(screen.getAllByText("Taller de reciclaje comunitario").length).toBeGreaterThan(0);
    });
  });

  it("does not jump selection when selecting a proposal then a mission", async () => {
    setupMocks();
    const Page = await loadMapPage();
    renderWithProviders(<Page />, {
      testPath: "/app/mapa",
      initialEntries: ["/app/mapa"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("marker-proposal-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("marker-proposal-1"));

    await waitFor(() => {
      expect(screen.getAllByText("Taller de reciclaje comunitario").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByTestId("marker-mission-1"));

    await waitFor(() => {
      expect(screen.getAllByText("Limpieza de playa").length).toBeGreaterThan(0);
    });

    // Sidebar lists all entities so the proposal title is still visible;
    // the detail panel (or dialog) now shows the mission title as the active entity.
    expect(screen.getByText("Taller de reciclaje comunitario")).toBeInTheDocument();
  });

  it("defaults to null selectedMissionId when no selection is made", async () => {
    setupMocks();
    const Page = await loadMapPage();
    renderWithProviders(<Page />, {
      testPath: "/app/mapa",
      initialEntries: ["/app/mapa"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("selected-mission-id").textContent).toBe("null");
    });
  });

  it("shows null selectedMissionId when there are no entities", async () => {
    setupMocks({ entities: [] });
    const Page = await loadMapPage();
    renderWithProviders(<Page />, {
      testPath: "/app/mapa",
      initialEntries: ["/app/mapa"],
    });

    await waitFor(() => {
      expect(screen.getByTestId("selected-mission-id").textContent).toBe("null");
    });
  });
});
