import { describe, expect, it } from "vitest";
import type { TerritorialImpactSummary } from "../territoryAggregations";
import type { AdjacencyMap } from "../spatialRelationships";
import {
  deriveCivicPresence,
  computeNearbyActivityWindow,
  deriveTerritorialPresence,
  computeTemporalContinuity,
  deriveNeighboringAwareness,
} from "../civicPresence";

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

describe("deriveCivicPresence", () => {
  it("returns empty presence for district with no neighbor data", () => {
    const map: AdjacencyMap = new Map([["a", []]]);
    const presence = deriveCivicPresence("a", map, [], new Map());
    expect(presence.nearbyInitiativeCount).toBe(0);
    expect(presence.hasCoordinationSignal).toBe(false);
  });

  it("detects coordination signal when neighbors have coalition activity", () => {
    const map: AdjacencyMap = new Map([["a", [{ slug: "b", name: "B", distanceKm: 10 }]]]);
    const summaries = new Map([
      [
        "b",
        makeSummary({
          missionCount: 2,
          proposalCount: 1,
          acceptedCollaboratorCount: 2,
          uniqueSupporterCount: 5,
          lastActivityAt: new Date().toISOString(),
        }),
      ],
    ]);
    const presence = deriveCivicPresence("a", map, ["b"], summaries);
    expect(presence.hasCoordinationSignal).toBe(true);
    expect(presence.nearbyInitiativeCount).toBeGreaterThan(0);
  });
});

describe("computeNearbyActivityWindow", () => {
  it("returns zero counts for empty summaries", () => {
    const w = computeNearbyActivityWindow([]);
    expect(w.initiativeCount).toBe(0);
  });

  it("aggregates initiative counts", () => {
    const w = computeNearbyActivityWindow([
      makeSummary({ missionCount: 2, proposalCount: 1 }),
      makeSummary({ missionCount: 1 }),
    ]);
    expect(w.initiativeCount).toBe(4);
  });
});

describe("deriveTerritorialPresence", () => {
  it("returns fragmented for many clusters", () => {
    const map: AdjacencyMap = new Map([
      ["a", []],
      ["b", []],
      ["c", []],
    ]);
    const presence = deriveTerritorialPresence("sierra", [], ["a", "b", "c"], map);
    expect(presence.continuityStatus).toBe("fragmented");
  });
});

describe("computeTemporalContinuity", () => {
  it("returns first_steps for empty district", () => {
    const t = computeTemporalContinuity(makeSummary());
    expect(t.pattern).toBe("first_steps");
    expect(t.hasSustainedActivity).toBe(false);
  });

  it("returns continuous for consistent long-term activity", () => {
    const t = computeTemporalContinuity(
      makeSummary({
        missionCount: 5,
        proposalCount: 3,
        lastActivityAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    );
    expect(t.pattern).toBe("continuous");
    expect(t.hasSustainedActivity).toBe(true);
  });
});

describe("deriveNeighboringAwareness", () => {
  it("returns zero awareness for empty map", () => {
    const map: AdjacencyMap = new Map([["a", []]]);
    const a = deriveNeighboringAwareness(map, "a", []);
    expect(a.totalNeighbors).toBe(0);
    expect(a.neighborActivityRatio).toBe(0);
  });

  it("computes activity ratio", () => {
    const map: AdjacencyMap = new Map([
      [
        "a",
        [
          { slug: "b", name: "B", distanceKm: 10 },
          { slug: "c", name: "C", distanceKm: 15 },
        ],
      ],
    ]);
    const a = deriveNeighboringAwareness(map, "a", ["b"]);
    expect(a.totalNeighbors).toBe(2);
    expect(a.activeNeighbors).toBe(1);
    expect(a.neighborActivityRatio).toBe(0.5);
  });
});
