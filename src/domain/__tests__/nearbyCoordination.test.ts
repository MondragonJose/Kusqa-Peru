import { describe, expect, it } from "vitest";
import type { AdjacencyMap } from "../spatialRelationships";
import type { TerritorialImpactSummary } from "../territoryAggregations";
import {
  findRelatedTerritorialActivity,
  detectAdjacentCoalitionEmergence,
} from "../nearbyCoordination";

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

describe("findRelatedTerritorialActivity", () => {
  it("returns empty for district with no neighbors", () => {
    const map: AdjacencyMap = new Map([["a", []]]);
    const r = findRelatedTerritorialActivity("a", [], map);
    expect(r.activityCount).toBe(0);
    expect(r.recentActivity).toBe(false);
  });
});

describe("detectAdjacentCoalitionEmergence", () => {
  it("detects emerging coalition in neighbor", () => {
    const map: AdjacencyMap = new Map([["a", [{ slug: "b", name: "B", distanceKm: 10 }]]]);
    const summaries = new Map([
      ["b", makeSummary({ proposalCount: 2, acceptedCollaboratorCount: 1 })],
    ]);
    const e = detectAdjacentCoalitionEmergence("a", map, summaries);
    expect(e.hasAdjacentCoalitions).toBe(true);
    expect(e.emergingCoalitions).toBe(1);
  });

  it("returns false when no neighbor has coalitions", () => {
    const map: AdjacencyMap = new Map([["a", [{ slug: "b", name: "B", distanceKm: 10 }]]]);
    const summaries = new Map([["b", makeSummary()]]);
    const e = detectAdjacentCoalitionEmergence("a", map, summaries);
    expect(e.hasAdjacentCoalitions).toBe(false);
  });
});
