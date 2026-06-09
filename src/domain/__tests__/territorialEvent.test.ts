import { describe, expect, it } from "vitest";
import {
  civicEventToTerritorial,
  lifecycleEventToTerritorial,
  districtActivityToTerritorial,
  TERRITORIAL_EVENT_COPY,
  TERRITORIAL_EVENT_VERB,
} from "../territorialEvent";
import type { CivicProfileEvent } from "@/services/civicEventsRepository";
import type { ProposalLifecycleEvent } from "@/services/proposalConversionRepository";
import type { DistrictActivity } from "@/services/districtRepository";

describe("civicEventToTerritorial", () => {
  const civic: CivicProfileEvent = {
    id: "evt-1",
    kind: "proposal.supported",
    targetType: "proposal",
    targetId: "proposal-1",
    districtId: "dist-1",
    districtSlug: "cusco-cusco",
    districtName: "Cusco",
    occurredAt: "2026-06-07T10:00:00Z",
    payload: { entityTitle: "Reparación de veredas" },
  };

  it("maps kind to type", () => {
    const result = civicEventToTerritorial(civic);
    expect(result.type).toBe("proposal.supported");
  });

  it("carries entityType and entityId", () => {
    const result = civicEventToTerritorial(civic);
    expect(result.entityType).toBe("proposal");
    expect(result.entityId).toBe("proposal-1");
  });

  it("carries district metadata", () => {
    const result = civicEventToTerritorial(civic);
    expect(result.districtId).toBe("dist-1");
  });

  it("extracts entityTitle from payload", () => {
    const result = civicEventToTerritorial(civic);
    expect(result.entityTitle).toBe("Reparación de veredas");
  });

  it("returns null entityTitle when payload has none", () => {
    const noTitle: CivicProfileEvent = { ...civic, payload: {} };
    const result = civicEventToTerritorial(noTitle);
    expect(result.entityTitle).toBeNull();
  });

  it("carries payload as metadata", () => {
    const result = civicEventToTerritorial(civic);
    expect(result.metadata).toEqual({ entityTitle: "Reparación de veredas" });
  });

  it("returns empty actor (not yet enriched from joined data)", () => {
    const result = civicEventToTerritorial(civic);
    expect(result.actor.id).toBe("");
    expect(result.actor.firstName).toBe("");
  });
});

describe("lifecycleEventToTerritorial", () => {
  const lc: ProposalLifecycleEvent = {
    id: "lc-1",
    eventType: "coalition_threshold_reached",
    actorUsername: "ana_cusco",
    actorFirstName: "Ana",
    actorAvatarUrl: "https://example.com/avatar.jpg",
    fromStatus: "pending",
    toStatus: "pending",
    convertedMissionId: null,
    detail: "Se alcanzó el umbral de apoyos",
    createdAt: "2026-06-07T10:00:00Z",
  };

  it("maps coalition_threshold_reached to proposal.threshold_reached", () => {
    const result = lifecycleEventToTerritorial(lc, "proposal-1");
    expect(result.type).toBe("proposal.threshold_reached");
  });

  it("maps mission_created to proposal.converted_to_mission", () => {
    const result = lifecycleEventToTerritorial(
      { ...lc, eventType: "mission_created" as const },
      "proposal-1",
    );
    expect(result.type).toBe("proposal.converted_to_mission");
  });

  it("maps proposal_reopened to proposal.reopened", () => {
    const result = lifecycleEventToTerritorial(
      { ...lc, eventType: "proposal_reopened" as const },
      "proposal-1",
    );
    expect(result.type).toBe("proposal.reopened");
  });

  it("carries actor info from joined profile fields", () => {
    const result = lifecycleEventToTerritorial(lc, "proposal-1");
    expect(result.actor.firstName).toBe("Ana");
    expect(result.actor.username).toBe("ana_cusco");
    expect(result.actor.avatarUrl).toBe("https://example.com/avatar.jpg");
  });

  it("sets proposal entity type", () => {
    const result = lifecycleEventToTerritorial(lc, "proposal-1");
    expect(result.entityType).toBe("proposal");
    expect(result.entityId).toBe("proposal-1");
  });

  it("wraps lifecycle metadata", () => {
    const result = lifecycleEventToTerritorial(lc, "proposal-1");
    expect(result.metadata.fromStatus).toBe("pending");
    expect(result.metadata.toStatus).toBe("pending");
  });
});

describe("districtActivityToTerritorial", () => {
  const activity: DistrictActivity = {
    id: "act-1",
    activityType: "support",
    entityType: "proposal",
    entityId: "proposal-1",
    occurredAt: "2026-06-07T10:00:00Z",
    actorUsername: "ana_cusco",
    actorFirstName: "Ana",
    actorAvatarUrl: null,
    detail: "Reparación de veredas",
  };

  it("maps 'support' to proposal.supported", () => {
    const result = districtActivityToTerritorial(activity, "dist-1", "sierra");
    expect(result.type).toBe("proposal.supported");
  });

  it("maps 'comment' to proposal.comment_added", () => {
    const result = districtActivityToTerritorial(
      { ...activity, activityType: "comment" as const },
      "dist-1",
      "sierra",
    );
    expect(result.type).toBe("proposal.comment_added");
  });

  it("maps 'complete' to mission.completed", () => {
    const result = districtActivityToTerritorial(
      { ...activity, activityType: "complete" as const, entityType: "mission" as const },
      "dist-1",
      "sierra",
    );
    expect(result.type).toBe("mission.completed");
  });

  it("maps 'join' to mission.joined", () => {
    const result = districtActivityToTerritorial(
      { ...activity, activityType: "join" as const, entityType: "mission" as const },
      "dist-1",
      "sierra",
    );
    expect(result.type).toBe("mission.joined");
  });

  it("carries district territory metadata", () => {
    const result = districtActivityToTerritorial(activity, "dist-1", "sierra");
    expect(result.districtId).toBe("dist-1");
    expect(result.region).toBe("sierra");
  });

  it("carries actor info", () => {
    const result = districtActivityToTerritorial(activity, "dist-1", "sierra");
    expect(result.actor.firstName).toBe("Ana");
    expect(result.actor.username).toBe("ana_cusco");
  });

  it("preserves original activityType in metadata", () => {
    const result = districtActivityToTerritorial(
      { ...activity, activityType: "join_idempotent" as const },
      "dist-1",
      "sierra",
    );
    expect(result.metadata.originalActivityType).toBe("join_idempotent");
  });
});

describe("TERRITORIAL_EVENT_COPY", () => {
  it("has all required event types", () => {
    const types = Object.keys(TERRITORIAL_EVENT_COPY);
    expect(types).toContain("proposal.supported");
    expect(types).toContain("proposal.comment_added");
    expect(types).toContain("mission.completed");
    expect(types).toContain("proposal.threshold_reached");
    expect(types).toContain("mission.joined");
    expect(types.length).toBeGreaterThan(10);
  });

  it("has a title and icon for each entry", () => {
    for (const [_type, copy] of Object.entries(TERRITORIAL_EVENT_COPY)) {
      expect(typeof copy.title).toBe("string");
      expect(typeof copy.icon).toBe("string");
      expect(copy.title.length).toBeGreaterThan(0);
    }
  });
});

describe("TERRITORIAL_EVENT_VERB", () => {
  it("has matching keys for all copy entries", () => {
    const copyKeys = Object.keys(TERRITORIAL_EVENT_COPY);
    const verbKeys = Object.keys(TERRITORIAL_EVENT_VERB);
    expect(verbKeys.sort()).toEqual(copyKeys.sort());
  });

  it("has Spanish short verbs", () => {
    expect(TERRITORIAL_EVENT_VERB["proposal.supported"]).toBe("apoyó");
    expect(TERRITORIAL_EVENT_VERB["proposal.comment_added"]).toBe("comentó");
    expect(TERRITORIAL_EVENT_VERB["mission.completed"]).toBe("completó");
  });
});
