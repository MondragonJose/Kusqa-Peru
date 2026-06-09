import { describe, expect, it } from "vitest";
import { isMission, isProposal, type ProposalEntity, type CivicEntity } from "../entity";

describe("ProposalEntity", () => {
  const proposalEntity: ProposalEntity = {
    entityType: "proposal",
    id: "prop-1",
    proposalId: "prop-1",
    title: "Reparación de veredas",
    description: "Las veredas están rotas",
    category: "Comunidad",
    district: "cusco-cusco",
    districtId: null,
    region: "sierra",
    spotsLeft: 5,
    date: "2026-06-01T12:00:00Z",
    emoji: "🤝",
    coords: { lat: -13.5, lng: -71.9 },
    lifecycleInfo: { lifecycle: "active", isJoinable: true, isCompletable: false, isVisible: true, lifecyclePriority: 0, timeToStart: null, timeToEnd: null, timeToStartLabel: null, timeToEndLabel: null },
    _proposal: {} as any,
  };

  it("has entityType 'proposal'", () => {
    expect(proposalEntity.entityType).toBe("proposal");
  });

  it("has no mission-only fields", () => {
    const entity: CivicEntity = proposalEntity;
    if (isProposal(entity)) {
      // @ts-expect-error — participants should not exist on ProposalEntity
      void entity.participants;
    }
  });

  it("guards correctly with isProposal", () => {
    expect(isProposal(proposalEntity)).toBe(true);
    expect(isMission(proposalEntity)).toBe(false);
  });

  it("carries proposal identifier", () => {
    expect(proposalEntity.id).toBe("prop-1");
    expect(proposalEntity.proposalId).toBe("prop-1");
  });
});

describe("MissionEntity (via CivicEntity union)", () => {
  const missionEntity: CivicEntity = {
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
    entityType: "mission",
  };

  it("has entityType 'mission'", () => {
    expect(missionEntity.entityType).toBe("mission");
  });

  it("guards correctly with isMission", () => {
    expect(isMission(missionEntity)).toBe(true);
    expect(isProposal(missionEntity)).toBe(false);
  });

  it("carries mission-native fields", () => {
    if (isMission(missionEntity)) {
      expect(missionEntity.xp).toBe(500);
      expect(missionEntity.participants).toBe(12);
      expect(missionEntity.difficulty).toBe("Andina");
      expect(missionEntity.organizer.name).toBe("María");
      expect(missionEntity.distanceKm).toBe(0);
    }
  });
});

describe("CivicEntity discriminated union", () => {
  it("properly narrows with type guard", () => {
    const entities: CivicEntity[] = [
      {
        entityType: "proposal" as const,
        id: "prop-1",
        proposalId: "prop-1",
        title: "Test",
        description: null,
        category: "test",
        district: "test",
        districtId: null,
        region: "costa",
        spotsLeft: 5,
        date: "2026-01-01",
        emoji: "📌",
        coords: null,
        lifecycleInfo: { lifecycle: "active", isJoinable: true, isCompletable: false, isVisible: true, lifecyclePriority: 0, timeToStart: null, timeToEnd: null, timeToStartLabel: null, timeToEndLabel: null },
        _proposal: {} as any,
      },
      {
        entityType: "mission" as const,
        id: "miss-1",
        title: "Mission",
        description: "desc",
        district: "test",
        districtId: null,
        region: "costa",
        category: "Comunidad",
        xp: 100,
        participants: 5,
        spotsLeft: 10,
        date: "2026-01-01",
        distanceKm: 0,
        impact: "impact",
        difficulty: "Suave",
        organizer: { name: "A", avatar: "" },
        coords: { lat: 0, lng: 0 },
        emoji: "📌",
        startDate: null,
        endDate: null,
        lifecycleInfo: { lifecycle: "active", isJoinable: true, isCompletable: false, isVisible: true, lifecyclePriority: 0, timeToStart: null, timeToEnd: null, timeToStartLabel: null, timeToEndLabel: null },
      },
    ];

    const missions = entities.filter(isMission);
    const proposals = entities.filter(isProposal);

    expect(missions).toHaveLength(1);
    expect(proposals).toHaveLength(1);
    expect(missions[0].id).toBe("miss-1");
    expect(proposals[0].id).toBe("prop-1");
  });
});
