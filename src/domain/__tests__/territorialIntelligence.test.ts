import { describe, expect, it } from "vitest";
import type { TerritorialImpactSummary } from "../territoryAggregations";
import {
  computeVitalityScore,
  classifyTerritorialVitality,
  classifyCoalitionDensity,
  classifyRecurringSupport,
  classifyOrganizerContinuity,
  classifyInitiativeReinforcement,
  detectDormancy,
  classifyInitiativePersistence,
  deriveDistrictVitality,
  buildVitalityNarrative,
  summarizeEventsToImpact,
  deriveSpatialSignals,
  buildSpatialNarrative,
} from "../territorialIntelligence";
import type { TerritorialEvent, TerritorialEventType } from "../territorialEvent";
import { classifyDistrictActivity, deriveMovementDirection } from "../territoryAggregations";
import type { AdjacencyMap } from "../spatialRelationships";

function makeSummary(overrides: Partial<TerritorialImpactSummary> = {}): TerritorialImpactSummary {
  return {
    missionCount: 0,
    completedMissionCount: 0,
    proposalCount: 0,
    activeProposalCount: 0,
    uniqueSupporterCount: 0,
    acceptedCollaboratorCount: 0,
    lastActivityAt: null,
    ...overrides,
  };
}

// Helper: date N days ago as ISO string
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

describe("computeVitalityScore", () => {
  it("returns 0 for a completely empty district", () => {
    expect(computeVitalityScore(makeSummary())).toBe(0);
  });

  it("scores 1 for a district with old activity and no continuity", () => {
    expect(
      computeVitalityScore(makeSummary({ lastActivityAt: daysAgo(120), missionCount: 1 })),
    ).toBeGreaterThanOrEqual(1);
  });

  it("scores higher for recent active diverse participation", () => {
    const score = computeVitalityScore(
      makeSummary({
        missionCount: 3,
        proposalCount: 2,
        activeProposalCount: 1,
        completedMissionCount: 1,
        uniqueSupporterCount: 10,
        acceptedCollaboratorCount: 2,
        lastActivityAt: daysAgo(2),
        recentCompletionCount: 1,
      }),
    );
    expect(score).toBeGreaterThanOrEqual(6);
  });

  it("scores a committed district higher than an abandoned one", () => {
    // 3 committed initiatives with conversions
    const committed = computeVitalityScore(
      makeSummary({
        missionCount: 3,
        proposalCount: 2,
        activeProposalCount: 2,
        completedMissionCount: 2,
        uniqueSupporterCount: 15,
        acceptedCollaboratorCount: 3,
        lastActivityAt: daysAgo(1),
        recentCompletionCount: 1,
      }),
    );
    // 40 abandoned proposals, no conversions, no recent activity
    const abandoned = computeVitalityScore(
      makeSummary({
        proposalCount: 40,
        activeProposalCount: 0,
        lastActivityAt: daysAgo(200),
      }),
    );
    expect(committed).toBeGreaterThan(abandoned);
  });
});

describe("classifyTerritorialVitality", () => {
  it("returns 'dormant' for a district with old activity and no active proposals", () => {
    expect(
      classifyTerritorialVitality(
        makeSummary({ missionCount: 2, lastActivityAt: daysAgo(90), activeProposalCount: 0 }),
        "early",
      ),
    ).toBe("dormant");
  });

  it("returns 'emerging' for a low-score district", () => {
    const summary = makeSummary({ proposalCount: 1, lastActivityAt: daysAgo(45) });
    const cls = classifyDistrictActivity(summary);
    expect(classifyTerritorialVitality(summary, cls)).toBe("emerging");
  });

  it("returns 'resilient' for a high-score district", () => {
    const summary = makeSummary({
      missionCount: 5,
      proposalCount: 3,
      activeProposalCount: 2,
      completedMissionCount: 3,
      uniqueSupporterCount: 20,
      acceptedCollaboratorCount: 4,
      lastActivityAt: daysAgo(1),
      recentCompletionCount: 2,
    });
    const cls = classifyDistrictActivity(summary);
    expect(classifyTerritorialVitality(summary, cls)).toBe("resilient");
  });

  it("returns 'reactivating' for a dormant district with new proposals", () => {
    const summary = makeSummary({
      missionCount: 2,
      lastActivityAt: daysAgo(90),
      recentProposalCount: 1,
    });
    const cls = classifyDistrictActivity(summary);
    expect(classifyTerritorialVitality(summary, cls)).toBe("reactivating");
  });

  it("returns 'fragmented' for many initiatives with low conversion", () => {
    const summary = makeSummary({
      missionCount: 3,
      proposalCount: 5,
      completedMissionCount: 1,
      lastActivityAt: daysAgo(15),
    });
    const cls = classifyDistrictActivity(summary);
    expect(classifyTerritorialVitality(summary, cls)).toBe("fragmented");
  });
});

describe("classifyCoalitionDensity", () => {
  it("returns 'none' with no supporters or collaborators", () => {
    expect(classifyCoalitionDensity(makeSummary())).toBe("none");
  });

  it("returns 'forming' with 5+ supporters", () => {
    expect(classifyCoalitionDensity(makeSummary({ uniqueSupporterCount: 5 }))).toBe("forming");
  });

  it("returns 'emerging' with 1 collaborator", () => {
    expect(
      classifyCoalitionDensity(makeSummary({ acceptedCollaboratorCount: 1, uniqueSupporterCount: 3 })),
    ).toBe("emerging");
  });

  it("returns 'consolidated' with 3+ collaborators", () => {
    expect(
      classifyCoalitionDensity(makeSummary({ acceptedCollaboratorCount: 3, uniqueSupporterCount: 10 })),
    ).toBe("consolidated");
  });
});

describe("classifyRecurringSupport", () => {
  it("returns 'none' for empty district", () => {
    expect(classifyRecurringSupport(makeSummary())).toBe("none");
  });

  it("returns 'none' when supporters are fewer than initiatives", () => {
    expect(
      classifyRecurringSupport(makeSummary({ proposalCount: 5, uniqueSupporterCount: 2 })),
    ).toBe("none");
  });

  it("returns 'some' when supporters slightly outnumber initiatives", () => {
    expect(
      classifyRecurringSupport(makeSummary({ proposalCount: 3, uniqueSupporterCount: 4 })),
    ).toBe("some");
  });

  it("returns 'strong' when supporters double the initiative count", () => {
    expect(
      classifyRecurringSupport(makeSummary({ proposalCount: 2, uniqueSupporterCount: 5 })),
    ).toBe("strong");
  });
});

describe("classifyOrganizerContinuity", () => {
  it("returns 'none' for empty district", () => {
    expect(classifyOrganizerContinuity(makeSummary())).toBe("none");
  });

  it("returns 'early' when some completions exist", () => {
    expect(
      classifyOrganizerContinuity(makeSummary({ missionCount: 2, completedMissionCount: 1 })),
    ).toBe("early");
  });

  it("returns 'established' with high completion rate and 2+ completions", () => {
    expect(
      classifyOrganizerContinuity(makeSummary({ missionCount: 3, completedMissionCount: 2 })),
    ).toBe("established");
  });
});

describe("classifyInitiativeReinforcement", () => {
  it("returns 'none' for empty district", () => {
    expect(classifyInitiativeReinforcement(makeSummary())).toBe("none");
  });

  it("returns 'some' when 2+ initiatives exist without cross-participation", () => {
    expect(
      classifyInitiativeReinforcement(makeSummary({ proposalCount: 2 })),
    ).toBe("some");
  });

  it("returns 'converging' when supporters and collaborators overlap across initiatives", () => {
    expect(
      classifyInitiativeReinforcement(
        makeSummary({ proposalCount: 2, missionCount: 1, uniqueSupporterCount: 5, acceptedCollaboratorCount: 1 }),
      ),
    ).toBe("converging");
  });
});

describe("summarizeEventsToImpact", () => {
  it("returns empty counts for empty events", () => {
    const result = summarizeEventsToImpact([]);
    expect(result.missionCount).toBe(0);
    expect(result.proposalCount).toBe(0);
    expect(result.uniqueSupporterCount).toBe(0);
  });

  it("counts unique proposals and missions from events", () => {
    const actorId = crypto.randomUUID();
    const result = summarizeEventsToImpact([
      makeEvent("proposal.created", "prop-1", actorId),
      makeEvent("proposal.supported", "prop-1", actorId),
      makeEvent("proposal.collaborator_joined", "prop-1", actorId),
      makeEvent("proposal.converted_to_mission", "prop-1", actorId),
      makeEvent("mission.joined", "miss-1", actorId),
    ]);
    expect(result.proposalCount).toBe(1);
    expect(result.missionCount).toBe(1);
    expect(result.uniqueSupporterCount).toBe(1);
  });
});

function makeEvent(type: TerritorialEventType, entityId: string, actorId?: string): TerritorialEvent {
  return {
    id: crypto.randomUUID(),
    type,
    actor: { id: actorId ?? crypto.randomUUID(), username: "test", firstName: "Test", avatarUrl: null },
    entityType: entityId.startsWith("miss") ? "mission" : "proposal",
    entityId,
    entityTitle: null,
    districtId: null,
    region: null,
    createdAt: new Date().toISOString(),
    metadata: {},
  };
}

describe("detectDormancy", () => {
  it("returns 'quiet' for empty district", () => {
    expect(detectDormancy(makeSummary())).toBe("quiet");
  });

  it("returns 'active' for recent activity", () => {
    expect(
      detectDormancy(makeSummary({ missionCount: 1, lastActivityAt: daysAgo(5) })),
    ).toBe("active");
  });

  it("returns 'dormant' for old activity with no active proposals", () => {
    expect(
      detectDormancy(makeSummary({ missionCount: 2, lastActivityAt: daysAgo(90) })),
    ).toBe("dormant");
  });

  it("returns 'reviving' when a dormant district gets new proposals", () => {
    expect(
      detectDormancy(
        makeSummary({ missionCount: 1, lastActivityAt: daysAgo(90), recentProposalCount: 1 }),
      ),
    ).toBe("reviving");
  });
});

describe("classifyInitiativePersistence", () => {
  it("returns 'forming' for empty district", () => {
    expect(classifyInitiativePersistence(makeSummary())).toBe("forming");
  });

  it("returns 'fragile' for 3+ proposals with no conversions", () => {
    expect(
      classifyInitiativePersistence(makeSummary({ proposalCount: 3 })),
    ).toBe("fragile");
  });

  it("returns 'persistent' for proposals with some completions", () => {
    expect(
      classifyInitiativePersistence(
        makeSummary({ proposalCount: 2, missionCount: 1, completedMissionCount: 1 }),
      ),
    ).toBe("persistent");
  });

  it("returns 'established' for 3+ completions", () => {
    expect(
      classifyInitiativePersistence(
        makeSummary({ missionCount: 4, completedMissionCount: 3 }),
      ),
    ).toBe("established");
  });
});

describe("deriveDistrictVitality — integration", () => {
  it("produces a coherent vitality model for an active district", () => {
    const summary = makeSummary({
      missionCount: 3,
      proposalCount: 2,
      activeProposalCount: 1,
      completedMissionCount: 1,
      uniqueSupporterCount: 8,
      acceptedCollaboratorCount: 2,
      lastActivityAt: daysAgo(3),
      recentCompletionCount: 1,
    });
    const cls = classifyDistrictActivity(summary);
    const dir = deriveMovementDirection(summary);
    const vitality = deriveDistrictVitality(summary, cls, dir);

    expect(vitality.score).toBeGreaterThan(0);
    expect(vitality.activityLevel).toMatch(/^(emerging|organizing|active|resilient|dormant)$/);
    expect(vitality.narrative.length).toBeGreaterThan(10);
    expect(typeof vitality.dormantDays).toBe("number");
    expect(vitality.activeInitiatives).toBeGreaterThanOrEqual(0);
  });

  it("produces a dormant narrative for an old district with organizer history", () => {
    const summary = makeSummary({
      missionCount: 1,
      completedMissionCount: 1,
      lastActivityAt: daysAgo(120),
    });
    const cls = classifyDistrictActivity(summary);
    const dir = deriveMovementDirection(summary);
    const vitality = deriveDistrictVitality(summary, cls, dir);

    expect(vitality.activityLevel).toBe("dormant");
    expect(vitality.narrative).toContain("organización en el pasado");
    expect(vitality.narrative).toContain("despertar de nuevo");
  });

  it("produces a dormant narrative for an old district", () => {
    const summary = makeSummary({
      missionCount: 1,
      lastActivityAt: daysAgo(120),
    });
    const cls = classifyDistrictActivity(summary);
    const dir = deriveMovementDirection(summary);
    const vitality = deriveDistrictVitality(summary, cls, dir);

    expect(vitality.activityLevel).toBe("dormant");
    expect(vitality.narrative).toContain("esperan nuevas manos");
    expect(vitality.narrative.length).toBeGreaterThan(20);
  });
});

describe("buildVitalityNarrative", () => {
  it("returns a Spanish narrative for dormant districts", () => {
    const n = buildVitalityNarrative({
      activityLevel: "dormant",
      coalitionDensity: "none",
      dormantStatus: "dormant",
      initiativePersistence: "fragile",
      movementDirection: "quiet",
      activeInitiatives: 0,
      recurringSupport: "none",
      organizerContinuity: "none",
      initiativeReinforcement: "none",
    });
    expect(n).toContain("esperan nuevas manos");
  });

  it("returns a narrative for active resilient districts", () => {
    const n = buildVitalityNarrative({
      activityLevel: "resilient",
      coalitionDensity: "consolidated",
      dormantStatus: "active",
      initiativePersistence: "established",
      movementDirection: "growing",
      activeInitiatives: 6,
      recurringSupport: "strong",
      organizerContinuity: "established",
      initiativeReinforcement: "converging",
    });
    expect(n.length).toBeGreaterThan(20);
  });

  it("returns a narrative for reviving districts", () => {
    const n = buildVitalityNarrative({
      activityLevel: "emerging",
      coalitionDensity: "none",
      dormantStatus: "reviving",
      initiativePersistence: "forming",
      movementDirection: "growing",
      activeInitiatives: 1,
      recurringSupport: "none",
      organizerContinuity: "none",
      initiativeReinforcement: "none",
    });
    expect(n).toContain("vuelve a moverse");
  });

  it("returns a narrative for reactivating districts", () => {
    const n = buildVitalityNarrative({
      activityLevel: "reactivating",
      coalitionDensity: "none",
      dormantStatus: "active",
      initiativePersistence: "forming",
      movementDirection: "growing",
      activeInitiatives: 1,
      recurringSupport: "none",
      organizerContinuity: "none",
      initiativeReinforcement: "none",
    });
    expect(n).toContain("vuelve a moverse");
    expect(n).toContain("retomando");
  });

  it("returns a narrative for fragmented districts", () => {
    const n = buildVitalityNarrative({
      activityLevel: "fragmented",
      coalitionDensity: "none",
      dormantStatus: "active",
      initiativePersistence: "fragile",
      movementDirection: "stable",
      activeInitiatives: 3,
      recurringSupport: "none",
      organizerContinuity: "none",
      initiativeReinforcement: "none",
    });
    expect(n).toContain("dispersas");
  });
});

// ─── Phase 13G: Spatial narrative signals ────────────────────────────────

describe("deriveSpatialSignals", () => {
  it("returns empty array for minimal context", () => {
    const signals = deriveSpatialSignals({
      districtSlug: "test",
      adjacencyMap: new Map(),
      activeSlugs: [],
      dormantSlugs: [],
    });
    expect(signals).toEqual([]);
  });

  it("detects neighboring activity when active neighbors exist", () => {
    const adjacencyMap: AdjacencyMap = new Map([
      ["a", [{ slug: "b", name: "B", distanceKm: 10 }]],
    ]);
    const signals = deriveSpatialSignals({
      districtSlug: "a",
      adjacencyMap,
      activeSlugs: ["a", "b"],
      dormantSlugs: [],
      activeNeighborCount: 1,
    });
    expect(signals).toContain("neighboring_activity");
  });

  it("detects corridor when 3+ active neighbors in convergence", () => {
    const adjacencyMap: AdjacencyMap = new Map([
      ["a", [{ slug: "b", name: "B", distanceKm: 10 }, { slug: "c", name: "C", distanceKm: 15 }]],
    ]);
    const signals = deriveSpatialSignals({
      districtSlug: "a",
      adjacencyMap,
      activeSlugs: ["a", "b", "c"],
      dormantSlugs: [],
      activeNeighborCount: 2,
      convergenceZoneSize: 3,
    });
    expect(signals).toContain("corridor_formation");
    expect(signals).toContain("convergence_zone");
  });

  it("detects quiet neighborhood when no active neighbors", () => {
    const adjacencyMap: AdjacencyMap = new Map([
      ["a", [{ slug: "b", name: "B", distanceKm: 10 }]],
    ]);
    const signals = deriveSpatialSignals({
      districtSlug: "a",
      adjacencyMap,
      activeSlugs: ["a"],
      dormantSlugs: ["b"],
      neighborCount: 1,
      activeNeighborCount: 0,
    });
    expect(signals).toContain("quiet_neighborhood");
  });

  it("detects isolated persistence", () => {
    const adjacencyMap: AdjacencyMap = new Map([
      ["a", [{ slug: "b", name: "B", distanceKm: 15 }]],
      ["c", [{ slug: "d", name: "D", distanceKm: 12 }]],
    ]);
    const signals = deriveSpatialSignals({
      districtSlug: "a",
      adjacencyMap,
      activeSlugs: ["a", "c"],
      dormantSlugs: [],
      isIsolated: true,
    });
    expect(signals).toContain("isolated_persistence");
  });
});

describe("buildSpatialNarrative", () => {
  it("returns null for empty signals", () => {
    expect(buildSpatialNarrative([])).toBeNull();
  });

  it("returns corridor narrative", () => {
    const n = buildSpatialNarrative(["corridor_formation"]);
    expect(n).toContain("corredor cívico");
  });

  it("returns convergence zone narrative", () => {
    const n = buildSpatialNarrative(["convergence_zone"]);
    expect(n).toContain("converge");
  });

  it("returns isolated persistence narrative", () => {
    const n = buildSpatialNarrative(["isolated_persistence"]);
    expect(n).toContain("foco independiente");
  });

  it("prioritizes corridor over convergence", () => {
    const n = buildSpatialNarrative(["convergence_zone", "corridor_formation"]);
    expect(n).toContain("corredor cívico");
  });
});

describe("deriveDistrictVitality with spatial context", () => {
  it("gracefully degrades when no spatial context", () => {
    const summary = makeSummary({ missionCount: 1, lastActivityAt: daysAgo(120) });
    const cls = classifyDistrictActivity(summary);
    const dir = deriveMovementDirection(summary);
    const vitality = deriveDistrictVitality(summary, cls, dir);
    expect(vitality.narrative.length).toBeGreaterThan(10);
  });

  it("appends spatial narrative when spatial context provided", () => {
    const adjacencyMap: AdjacencyMap = new Map([
      ["test", [{ slug: "neighbor", name: "Neighbor", distanceKm: 10 }]],
    ]);
    const summary = makeSummary({ missionCount: 1, lastActivityAt: daysAgo(120) });
    const cls = classifyDistrictActivity(summary);
    const dir = deriveMovementDirection(summary);
    const vitality = deriveDistrictVitality(summary, cls, dir, {
      districtSlug: "test",
      adjacencyMap,
      activeSlugs: ["test", "neighbor"],
      dormantSlugs: [],
      activeNeighborCount: 1,
    });
    expect(vitality.narrative).toContain("esperan nuevas manos");
    expect(vitality.narrative).toContain("distritos vecinos");
  });
});
