import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Mission } from "@/types";
import type { Proposal } from "@/services/proposalContract";
import type { Initiative } from "@/domain/initiative";

// ─── Mocks — hoisted before any import ───────────────────────────────────────

const mockMissionFindAll = vi.fn();
const mockMissionFindById = vi.fn();
const mockProposalGetAll = vi.fn();
const mockProposalGetById = vi.fn();

vi.mock("@/services/missionRepository", () => ({
  missionRepository: {
    findAll: mockMissionFindAll,
    findById: mockMissionFindById,
  },
}));

vi.mock("@/services/proposalRepository", () => ({
  proposalRepository: {
    getAllProposals: mockProposalGetAll,
    getProposalById: mockProposalGetById,
  },
}));

const { initiativeResolver } = await import("../initiativeResolver");

// ─── Fixtures ────────────────────────────────────────────────────────────────

const COORDS = { lat: -12.0464, lng: -77.0428 };

function makeMission(overrides?: Partial<Mission>): Mission {
  return {
    id: "mission-uuid-1",
    title: "Limpieza de playa",
    description: "Jornada de limpieza en la costa verde",
    district: "Miraflores",
    region: "costa",
    category: "Medio ambiente",
    xp: 150,
    participants: 12,
    spotsLeft: 8,
    date: "2026-07-15",
    distanceKm: 3.5,
    impact: "Alta",
    difficulty: "Suave",
    organizer: { name: "Ana García", avatar: "/avatars/ana.jpg" },
    coords: COORDS,
    emoji: "🌊",
    startDate: "2026-07-15T09:00:00Z",
    endDate: "2026-07-15T13:00:00Z",
    lifecycleInfo: {
      lifecycle: "upcoming",
      isJoinable: true,
      isCompletable: false,
      isVisible: true,
      lifecyclePriority: 2,
      timeToStart: 86400000 * 5,
      timeToEnd: null,
      timeToStartLabel: "5d 0h",
      timeToEndLabel: null,
    },
    ...overrides,
  };
}

function makeProposal(overrides?: Partial<Proposal>): Proposal {
  return {
    id: "proposal-uuid-1",
    userId: "user-1",
    title: "Taller de reciclaje",
    description: "Enseñar a reciclar en el distrito",
    category: "Medio ambiente",
    district: "San Isidro",
    region: "costa",
    teamSize: 5,
    images: [],
    status: "pending",
    latitude: -12.0973,
    longitude: -77.0361,
    proposedDate: "2026-06-01T10:00:00Z",
    districtId: null,
    summary: null,
    why: null,
    locationLabel: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    readyAt: null,
    convertedAt: null,
    completedAt: null,
    hasConvertedMissionId: null,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("initiativeResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resolveAll", () => {
    it("returns missions and proposals as initiatives with correct sourceType", async () => {
      mockMissionFindAll.mockResolvedValue([makeMission()]);
      mockProposalGetAll.mockResolvedValue([makeProposal()]);

      const result = await initiativeResolver.resolveAll();

      expect(result).toHaveLength(2);
      expect(result.filter((i) => i.sourceType === "mission")).toHaveLength(1);
      expect(result.filter((i) => i.sourceType === "proposal")).toHaveLength(1);
    });

    it("maps mission fields into Initiative shape", async () => {
      mockMissionFindAll.mockResolvedValue([makeMission()]);
      mockProposalGetAll.mockResolvedValue([]);

      const [i] = await initiativeResolver.resolveAll();

      expect(i.sourceType).toBe("mission");
      expect(i.sourceId).toBe("mission-uuid-1");
      expect(i.title).toBe("Limpieza de playa");
      expect(i.summary).toBe("Jornada de limpieza en la costa verde");
      expect(i.category).toBe("Medio ambiente");
      expect(i.region).toBe("costa");
      expect(i.lifecycle).toBe("forming");
      expect(i.emoji).toBe("🌊");
      expect(i.location?.district).toBe("Miraflores");
      expect(i.location?.coords).toEqual(COORDS);
      expect(i.temporalAnchor).toBeDefined();
      expect(i.temporalAnchor.referenceDate).toBe("2026-07-15T09:00:00Z");
    });

    it("maps proposal fields into Initiative shape", async () => {
      mockMissionFindAll.mockResolvedValue([]);
      mockProposalGetAll.mockResolvedValue([makeProposal()]);

      const [i] = await initiativeResolver.resolveAll();

      expect(i.sourceType).toBe("proposal");
      expect(i.sourceId).toBe("proposal-uuid-1");
      expect(i.title).toBe("Taller de reciclaje");
      expect(i.summary).toBe("Enseñar a reciclar en el distrito");
      expect(i.category).toBe("Medio ambiente");
      expect(i.region).toBe("costa");
      expect(i.lifecycle).toBe("forming");
      expect(i.location?.district).toBe("San Isidro");
      expect(i.location?.coords).toEqual({ lat: -12.0973, lng: -77.0361 });
    });

    it("falls back summary through description and title for proposals", async () => {
      mockMissionFindAll.mockResolvedValue([]);
      mockProposalGetAll.mockResolvedValue([
        makeProposal({ summary: null, description: null }),
      ]);

      const [i] = await initiativeResolver.resolveAll();
      expect(i.summary).toBe("Taller de reciclaje");
    });

    it("returns empty array when both repositories are empty", async () => {
      mockMissionFindAll.mockResolvedValue([]);
      mockProposalGetAll.mockResolvedValue([]);

      expect(await initiativeResolver.resolveAll()).toEqual([]);
    });

    it("filters by sourceType", async () => {
      mockMissionFindAll.mockResolvedValue([makeMission()]);
      mockProposalGetAll.mockResolvedValue([makeProposal()]);

      const missions = await initiativeResolver.resolveAll({ sourceType: "mission" });
      expect(missions).toHaveLength(1);
      expect(missions[0].sourceType).toBe("mission");

      const proposals = await initiativeResolver.resolveAll({ sourceType: "proposal" });
      expect(proposals).toHaveLength(1);
      expect(proposals[0].sourceType).toBe("proposal");
    });

    it("filters by region", async () => {
      mockMissionFindAll.mockResolvedValue([
        makeMission({ region: "costa" }),
        makeMission({ id: "m2", title: "Selva mission", region: "selva" }),
      ]);
      mockProposalGetAll.mockResolvedValue([]);

      const result = await initiativeResolver.resolveAll({ region: "costa" });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Limpieza de playa");
    });

    it("filters by lifecycle", async () => {
      mockMissionFindAll.mockResolvedValue([makeMission()]);
      mockProposalGetAll.mockResolvedValue([]);

      const result = await initiativeResolver.resolveAll({ lifecycle: "forming" });
      expect(result).toHaveLength(1);
    });

    it("filters by district", async () => {
      mockMissionFindAll.mockResolvedValue([
        makeMission({ district: "Miraflores" }),
        makeMission({ id: "m2", title: "Otro", district: "Barranco" }),
      ]);
      mockProposalGetAll.mockResolvedValue([]);

      const result = await initiativeResolver.resolveAll({ district: "Miraflores" });
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Limpieza de playa");
    });

    it("renders completed missions correctly", async () => {
      mockMissionFindAll.mockResolvedValue([
        makeMission({
          lifecycleInfo: {
            lifecycle: "completed",
            isJoinable: false,
            isCompletable: false,
            isVisible: true,
            lifecyclePriority: 0,
            timeToStart: null,
            timeToEnd: null,
            timeToStartLabel: null,
            timeToEndLabel: null,
          },
        }),
      ]);
      mockProposalGetAll.mockResolvedValue([]);

      const [i] = await initiativeResolver.resolveAll();
      expect(i.lifecycle).toBe("completed");
    });
  });

  describe("resolveById", () => {
    it("resolves mission_ prefixed id", async () => {
      mockMissionFindById.mockResolvedValue(makeMission());
      mockProposalGetById.mockResolvedValue(null);
      mockMissionFindAll.mockResolvedValue([]);
      mockProposalGetAll.mockResolvedValue([]);

      const result = await initiativeResolver.resolveById("mission_mission-uuid-1");
      expect(result).not.toBeNull();
      expect(result!.sourceType).toBe("mission");
      expect(result!.sourceId).toBe("mission-uuid-1");
    });

    it("resolves proposal_ prefixed id", async () => {
      mockMissionFindById.mockResolvedValue(null);
      mockProposalGetById.mockResolvedValue(makeProposal());
      mockMissionFindAll.mockResolvedValue([]);
      mockProposalGetAll.mockResolvedValue([]);

      const result = await initiativeResolver.resolveById("proposal_proposal-uuid-1");
      expect(result).not.toBeNull();
      expect(result!.sourceType).toBe("proposal");
      expect(result!.sourceId).toBe("proposal-uuid-1");
    });

    it("falls back to bare UUID lookup for unprefixed ids", async () => {
      mockMissionFindById.mockResolvedValue(makeMission());
      mockMissionFindAll.mockResolvedValue([]);
      mockProposalGetAll.mockResolvedValue([]);

      const result = await initiativeResolver.resolveById("mission-uuid-1");
      expect(result).not.toBeNull();
      expect(result!.sourceType).toBe("mission");
    });

    it("returns null for unknown id", async () => {
      mockMissionFindById.mockResolvedValue(null);
      mockProposalGetById.mockResolvedValue(null);
      mockMissionFindAll.mockResolvedValue([]);
      mockProposalGetAll.mockResolvedValue([]);

      const result = await initiativeResolver.resolveById("unknown");
      expect(result).toBeNull();
    });
  });
});
