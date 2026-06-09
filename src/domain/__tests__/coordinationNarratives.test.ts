import { describe, expect, it } from "vitest";
import {
  buildNearbyActivityNarrative,
  buildCoalitionProximityNarrative,
  buildTemporalContinuityNarrative,
  buildNeighboringAwarenessNarrative,
  deriveCoordinationNarratives,
} from "../coordinationNarratives";
import type { CoalitionProximity, TemporalContinuity, NeighboringDistrictAwareness } from "../civicPresence";
import type { RelatedTerritorialActivity, AdjacentCoalitionEmergence, NeighboringMissionContinuity } from "../nearbyCoordination";

describe("buildNearbyActivityNarrative", () => {
  it("returns null when no activity", () => {
    const r: RelatedTerritorialActivity = { activityCount: 0, neighboringSlugs: [], recentActivity: false, coordinationSignal: false };
    expect(buildNearbyActivityNarrative(r)).toBeNull();
  });

  it("returns narrative when recent activity with coordination", () => {
    const r: RelatedTerritorialActivity = { activityCount: 3, neighboringSlugs: ["b"], recentActivity: true, coordinationSignal: true };
    const n = buildNearbyActivityNarrative(r);
    expect(n!.message).toContain("coordinarse");
  });
});

describe("buildCoalitionProximityNarrative", () => {
  it("returns null when no nearby coalitions", () => {
    const p: CoalitionProximity = { nearbyCoalitions: 0, nearbyCollaborators: 0, closestCoalitionDistance: "none" };
    expect(buildCoalitionProximityNarrative(p)).toBeNull();
  });

  it("returns narrative for near coalitions", () => {
    const p: CoalitionProximity = { nearbyCoalitions: 2, nearbyCollaborators: 4, closestCoalitionDistance: "near" };
    const n = buildCoalitionProximityNarrative(p);
    expect(n!.message).toContain("cerca");
  });
});

describe("buildTemporalContinuityNarrative", () => {
  it("returns null for first_steps", () => {
    const t: TemporalContinuity = { hasSustainedActivity: false, totalActiveWeeks: 0, gapWeeks: 0, pattern: "first_steps" };
    expect(buildTemporalContinuityNarrative(t)).toBeNull();
  });

  it("returns narrative for continuous pattern", () => {
    const t: TemporalContinuity = { hasSustainedActivity: true, totalActiveWeeks: 8, gapWeeks: 0, pattern: "continuous" };
    const n = buildTemporalContinuityNarrative(t);
    expect(n!.message).toContain("continuidad");
  });
});

describe("buildNeighboringAwarenessNarrative", () => {
  it("returns null when no neighbors", () => {
    const a: NeighboringDistrictAwareness = { totalNeighbors: 0, activeNeighbors: 0, dormantNeighbors: 0, neighborActivityRatio: 0 };
    expect(buildNeighboringAwarenessNarrative(a)).toBeNull();
  });

  it("returns narrative when most neighbors active", () => {
    const a: NeighboringDistrictAwareness = { totalNeighbors: 4, activeNeighbors: 3, dormantNeighbors: 1, neighborActivityRatio: 0.75 };
    const n = buildNeighboringAwarenessNarrative(a);
    expect(n!.message).toContain("mayoría");
  });
});

describe("deriveCoordinationNarratives", () => {
  it("returns empty for all-null inputs", () => {
    const related: RelatedTerritorialActivity = { activityCount: 0, neighboringSlugs: [], recentActivity: false, coordinationSignal: false };
    const proximity: CoalitionProximity = { nearbyCoalitions: 0, nearbyCollaborators: 0, closestCoalitionDistance: "none" };
    const continuity: TemporalContinuity = { hasSustainedActivity: false, totalActiveWeeks: 0, gapWeeks: 0, pattern: "first_steps" };
    const awareness: NeighboringDistrictAwareness = { totalNeighbors: 0, activeNeighbors: 0, dormantNeighbors: 0, neighborActivityRatio: 0 };
    const emergence: AdjacentCoalitionEmergence = { emergingCoalitions: 0, coalitionSlugs: [], hasAdjacentCoalitions: false };
    const missionContinuity: NeighboringMissionContinuity = { hasContinuity: false, contiguousMissions: 0, corridorForming: false };

    const narratives = deriveCoordinationNarratives(related, proximity, continuity, awareness, emergence, missionContinuity);
    expect(narratives).toEqual([]);
  });
});
