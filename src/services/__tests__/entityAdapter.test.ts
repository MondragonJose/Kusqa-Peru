import { describe, expect, it } from "vitest";
import { isMission } from "@/types/entity";
import { proposalToEntity, missionToEntity } from "../entityAdapter";
import type { Proposal } from "../proposalContract";
import type { Mission } from "@/types";

const TEST_PROPOSAL: Proposal = {
  id: "prop-1",
  userId: "user-1",
  title: "Reparación de veredas",
  description: "Las veredas están rotas",
  category: "Comunidad",
  district: "cusco-cusco",
  region: "sierra",
  teamSize: 5,
  images: [],
  status: "pending",
  latitude: -13.5,
  longitude: -71.9,
  proposedDate: null,
  districtId: null,
  summary: null,
  why: null,
  locationLabel: null,
  createdAt: "2026-06-01T12:00:00Z",
  updatedAt: "2026-06-01T12:00:00Z",
  readyAt: null,
  convertedAt: null,
  completedAt: null,
  hasConvertedMissionId: null,
};

describe("proposalToEntity", () => {
  it("returns a ProposalEntity with correct shape", () => {
    const entity = proposalToEntity(TEST_PROPOSAL);
    expect(entity).not.toBeNull();
    expect(entity!.entityType).toBe("proposal");
    expect(entity!.id).toBe("prop-1");
    expect(entity!.title).toBe("Reparación de veredas");
    expect(entity!.region).toBe("sierra");
    expect(entity!.spotsLeft).toBe(5);
    expect(entity!.date).toBe("2026-06-01T12:00:00Z");
    expect(entity!.emoji).toBe("🤝");
  });

  it("returns null when proposal lacks coordinates", () => {
    const noCoords = { ...TEST_PROPOSAL, latitude: null, longitude: null };
    const entity = proposalToEntity(noCoords);
    expect(entity).toBeNull();
  });

  it("carries coords from lat/lng", () => {
    const entity = proposalToEntity(TEST_PROPOSAL);
    expect(entity!.coords).toEqual({ lat: -13.5, lng: -71.9 });
  });

  it("preserves the original proposal in _proposal", () => {
    const entity = proposalToEntity(TEST_PROPOSAL);
    expect(entity!._proposal.id).toBe("prop-1");
    expect(entity!._proposal.status).toBe("pending");
  });

  it("has no Mission-only fields", () => {
    const entity = proposalToEntity(TEST_PROPOSAL);
    const keys = Object.keys(entity!);
    expect(keys).not.toContain("xp");
    expect(keys).not.toContain("participants");
    expect(keys).not.toContain("difficulty");
    expect(keys).not.toContain("distanceKm");
    expect(keys).not.toContain("impact");
    expect(keys).not.toContain("organizer");
  });
});

describe("missionToEntity", () => {
  const mission: Mission = {
    id: "miss-1",
    title: "Limpieza del río",
    description: "Jornada de limpieza",
    district: "cusco-cusco",
    districtId: null,
    region: "sierra",
    category: "Medio ambiente",
    xp: 500,
    participants: 12,
    spotsLeft: 8,
    date: "2026-06-15T10:00:00Z",
    distanceKm: 0,
    impact: "Río más limpio",
    difficulty: "Andina",
    organizer: { name: "María", avatar: "https://example.com/avatar.jpg" },
    coords: { lat: -13.5, lng: -71.9 },
    emoji: "🌱",
    status: "active",
    startDate: null,
    endDate: null,
    lifecycleInfo: { lifecycle: "active", isJoinable: true, isCompletable: false, isVisible: true, lifecyclePriority: 0, timeToStart: null, timeToEnd: null, timeToStartLabel: null, timeToEndLabel: null },
  };

  it("returns a CivicEntity with all Mission fields + entityType", () => {
    const entity = missionToEntity(mission);
    expect(entity.entityType).toBe("mission");
    if (isMission(entity)) {
      expect(entity.xp).toBe(500);
      expect(entity.participants).toBe(12);
      expect(entity.difficulty).toBe("Andina");
      expect(entity.organizer.name).toBe("María");
      expect(entity.lifecycleInfo.lifecycle).toBe("active");
    }
  });
});
