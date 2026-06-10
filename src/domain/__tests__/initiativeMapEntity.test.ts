import { describe, expect, it } from "vitest";
import type { Mission, MapCoords } from "@/types";
import type { MissionLifecycleInfo } from "@/types/lifecycle";
import type { Proposal, ProposalStatus } from "@/services/proposalContract";
import type { Initiative, InitiativeLocation, TemporalAnchor } from "@/domain/initiative";
import {
  buildMapEntity,
  entityRoute,
  getSupportCount,
  getXp,
  type InitiativeMapEntity,
  type MissionCompat,
} from "@/domain/initiativeMapEntity";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const COORDS: MapCoords = { lat: -12.0464, lng: -77.0428 };
const MISSION_LIFECYCLE: MissionLifecycleInfo = {
  lifecycle: "upcoming",
  isJoinable: true,
  isCompletable: false,
  isVisible: true,
  lifecyclePriority: 2,
  timeToStart: 86400000 * 5,
  timeToEnd: null,
  timeToStartLabel: "5d 0h",
  timeToEndLabel: null,
};

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
    lifecycleInfo: MISSION_LIFECYCLE,
    status: "active",
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

function makeInitiative(overrides?: Partial<Initiative>): Initiative {
  const location: InitiativeLocation = {
    district: "Miraflores",
    districtId: null,
    region: "costa",
    coords: COORDS,
    locationLabel: null,
  };
  const anchor: TemporalAnchor = {
    label: "Próximamente",
    kind: "scheduled",
    referenceDate: "2026-07-15T09:00:00Z",
  };
  return {
    id: "mission_mission-uuid-1",
    sourceType: "mission",
    sourceId: "mission-uuid-1",
    title: "Limpieza de playa",
    summary: "Jornada de limpieza en la costa verde",
    category: "Medio ambiente",
    region: "costa",
    lifecycle: "forming",
    supportersCount: 3,
    temporalAnchor: anchor,
    emoji: "🌊",
    location,
    vitalityScore: 5,
    ...overrides,
  };
}

function makeMissionCompat(overrides?: Partial<MissionCompat>): MissionCompat {
  return {
    xp: 150,
    difficulty: "Suave",
    impact: "Alta",
    organizerName: "Ana García",
    organizerAvatar: "/avatars/ana.jpg",
    participants: 12,
    spotsLeft: 8,
    distanceKm: 3.5,
    date: "2026-07-15",
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("buildMapEntity — mission input", () => {
  it("projects a full mission into InitiativeMapEntity", () => {
    const mission = makeMission();
    const entity = buildMapEntity({ type: "mission", mission });

    expect(entity.id).toBe("mission-uuid-1");
    expect(entity.prefixedId).toBe("mission_mission-uuid-1");
    expect(entity.sourceType).toBe("mission");
    expect(entity.sourceId).toBe("mission-uuid-1");
    expect(entity.title).toBe("Limpieza de playa");
    expect(entity.summary).toBe("Jornada de limpieza en la costa verde");
    expect(entity.category).toBe("Medio ambiente");
    expect(entity.region).toBe("costa");
    expect(entity.lifecycle).toBe("forming");
    expect(entity.emoji).toBe("🌊");
    expect(entity.location).not.toBeNull();
    expect(entity.location!.coords).toEqual(COORDS);
    expect(entity.temporalAnchor.kind).toBe("scheduled");
    expect(entity.supportCount).toBe(0);
    expect(entity.supportersCount).toBe(0);
    expect(entity.vitalityScore).toBeNull();
    expect(entity.xp).toBe(150);
    expect(entity.difficulty).toBe("Suave");
    expect(entity.impact).toBe("Alta");
    expect(entity.organizerName).toBe("Ana García");
    expect(entity.organizerAvatar).toBe("/avatars/ana.jpg");
    expect(entity.participants).toBe(12);
    expect(entity.spotsLeft).toBe(8);
    expect(entity.distanceKm).toBe(3.5);
    expect(entity.date).toBe("2026-07-15");
    expect(entity.original).toBe(mission);
  });

  it("propagates supportCount when provided for mission", () => {
    const mission = makeMission();
    const entity = buildMapEntity({ type: "mission", mission, supportCount: 7 });

    expect(entity.supportCount).toBe(7);
  });

  it("defaults supportCount to 0 for mission without supportCount", () => {
    const mission = makeMission();
    const entity = buildMapEntity({ type: "mission", mission });

    expect(entity.supportCount).toBe(0);
  });
});

describe("buildMapEntity — proposal input", () => {
  it("projects a full proposal into InitiativeMapEntity", () => {
    const proposal = makeProposal();
    const entity = buildMapEntity({ type: "proposal", proposal });

    expect(entity.id).toBe("proposal-uuid-1");
    expect(entity.prefixedId).toBe("proposal_proposal-uuid-1");
    expect(entity.sourceType).toBe("proposal");
    expect(entity.sourceId).toBe("proposal-uuid-1");
    expect(entity.title).toBe("Taller de reciclaje");
    expect(entity.category).toBe("Medio ambiente");
    expect(entity.region).toBe("costa");
    expect(entity.lifecycle).toBe("forming");
    expect(entity.location).not.toBeNull();
    expect(entity.location!.coords).toEqual({ lat: -12.0973, lng: -77.0361 });
    expect(entity.xp).toBeNull();
    expect(entity.difficulty).toBeNull();
    expect(entity.impact).toBeNull();
    expect(entity.organizerName).toBeNull();
    expect(entity.organizerAvatar).toBeNull();
    expect(entity.participants).toBeNull();
    expect(entity.spotsLeft).toBeNull();
    expect(entity.distanceKm).toBeNull();
    expect(entity.date).toBeNull();
    expect(entity.original).toBe(proposal);
  });

  it("propagates supportCount when provided for proposal", () => {
    const proposal = makeProposal();
    const entity = buildMapEntity({ type: "proposal", proposal, supportCount: 12 });

    expect(entity.supportCount).toBe(12);
  });

  it("defaults supportCount to 0 for proposal without supportCount", () => {
    const proposal = makeProposal();
    const entity = buildMapEntity({ type: "proposal", proposal });

    expect(entity.supportCount).toBe(0);
  });

  it("falls back summary through description and title for proposal", () => {
    const proposal = makeProposal({ summary: null, description: null });
    const entity = buildMapEntity({ type: "proposal", proposal });

    expect(entity.summary).toBe("Taller de reciclaje");
  });
});

describe("buildMapEntity — initiative input", () => {
  it("projects a full initiative into InitiativeMapEntity", () => {
    const initiative = makeInitiative();
    const entity = buildMapEntity({ type: "initiative", initiative });

    expect(entity.id).toBe("mission-uuid-1");
    expect(entity.prefixedId).toBe("mission_mission-uuid-1");
    expect(entity.sourceType).toBe("mission");
    expect(entity.title).toBe("Limpieza de playa");
    expect(entity.supportCount).toBe(3);
    expect(entity.supportersCount).toBe(3);
    expect(entity.vitalityScore).toBe(5);
    expect(entity.xp).toBeNull();
    expect(entity.difficulty).toBeNull();
    expect(entity.original).toBe(initiative);
  });

  it("propagates missionCompat fields for initiative input", () => {
    const initiative = makeInitiative();
    const compat = makeMissionCompat();
    const entity = buildMapEntity({ type: "initiative", initiative, missionCompat: compat });

    expect(entity.xp).toBe(150);
    expect(entity.difficulty).toBe("Suave");
    expect(entity.impact).toBe("Alta");
    expect(entity.organizerName).toBe("Ana García");
    expect(entity.organizerAvatar).toBe("/avatars/ana.jpg");
    expect(entity.participants).toBe(12);
    expect(entity.spotsLeft).toBe(8);
    expect(entity.distanceKm).toBe(3.5);
    expect(entity.date).toBe("2026-07-15");
  });

  it("handles initiative without missionCompat", () => {
    const initiative = makeInitiative();
    const entity = buildMapEntity({ type: "initiative", initiative });

    expect(entity.xp).toBeNull();
    expect(entity.difficulty).toBeNull();
  });
});

describe("buildMapEntity — missing / edge case fields", () => {
  it("sets location to null for mission without coords", () => {
    const mission = makeMission({ coords: undefined as unknown as MapCoords });
    const entity = buildMapEntity({ type: "mission", mission });

    expect(entity.location).not.toBeNull();
    expect(entity.location!.coords).toBeUndefined();
  });

  it("sets location coords to null for proposal without lat/lng", () => {
    const proposal = makeProposal({ latitude: null, longitude: null });
    const entity = buildMapEntity({ type: "proposal", proposal });

    expect(entity.location).not.toBeNull();
    expect(entity.location!.coords).toBeNull();
  });

  it("falls back summary to title when description is empty for mission", () => {
    const mission = makeMission({ description: "" });
    const entity = buildMapEntity({ type: "mission", mission });

    expect(entity.summary).toBe("Limpieza de playa");
  });

  it("handles initiative without location field", () => {
    const initiative = makeInitiative({ location: undefined });
    const entity = buildMapEntity({ type: "initiative", initiative });

    expect(entity.location).toBeNull();
  });

  it("handles initiative without supportersCount", () => {
    const initiative = makeInitiative({ supportersCount: undefined });
    const entity = buildMapEntity({ type: "initiative", initiative });

    expect(entity.supportCount).toBe(0);
    expect(entity.supportersCount).toBe(0);
  });

  it("handles initiative without vitalityScore", () => {
    const initiative = makeInitiative({ vitalityScore: undefined });
    const entity = buildMapEntity({ type: "initiative", initiative });

    expect(entity.vitalityScore).toBeNull();
  });
});

describe("safe helpers", () => {
  it("entityRoute returns mission route for mission source", () => {
    const entity = buildMapEntity({ type: "mission", mission: makeMission() }) as InitiativeMapEntity;

    expect(entityRoute(entity)).toBe("/app/mision/mission-uuid-1");
  });

  it("entityRoute returns proposal route for proposal source", () => {
    const entity = buildMapEntity({ type: "proposal", proposal: makeProposal() }) as InitiativeMapEntity;

    expect(entityRoute(entity)).toBe("/app/propuesta/proposal-uuid-1");
  });

  it("entityRoute uses raw id (not prefixedId)", () => {
    const mission = makeMission({ id: "abc-123" });
    const entity = buildMapEntity({ type: "mission", mission }) as InitiativeMapEntity;

    expect(entityRoute(entity)).toBe("/app/mision/abc-123");
  });

  it("getSupportCount returns the supportCount value", () => {
    const entity = buildMapEntity({ type: "mission", mission: makeMission(), supportCount: 5 });

    expect(getSupportCount(entity)).toBe(5);
  });

  it("getXp returns xp when present", () => {
    const entity = buildMapEntity({ type: "mission", mission: makeMission() });

    expect(getXp(entity)).toBe(150);
  });

  it("getXp returns 0 when xp is null", () => {
    const entity = buildMapEntity({ type: "proposal", proposal: makeProposal() });

    expect(getXp(entity)).toBe(0);
  });
});
