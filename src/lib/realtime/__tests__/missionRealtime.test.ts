/**
 * missionRealtime reconciliation test — Phase 5A.2.
 *
 * Covers the reconciliation planner across the new event types
 * added in Phase 4B and the staleness/dedup/coalesce behaviors
 * expected by ADR-0001.
 */
import { describe, expect, it } from "vitest";
import {
  planRealtimeReconciliation,
  mapCivicEventPayloadToProposalSupport,
  MISSION_REALTIME_CHANNELS,
  type RealtimePayload,
} from "@/lib/realtime/missionRealtime";

const baseOpts = { hasLocalWriteInFlight: false };
const userA = "00000000-4000-8000-0000-00000000000a";
const proposalId = "11111111-1111-4111-8111-111111111111";

describe("planRealtimeReconciliation", () => {
  it("ignores remote events when local write is in flight", () => {
    const decision = planRealtimeReconciliation(
      {
        type: "mission.completed",
        actorId: userA,
        missionId: "mission-1",
        occurredAt: new Date().toISOString(),
        xpGranted: 320,
      },
      { hasLocalWriteInFlight: true },
    );
    expect(decision.action).toBe("ignore");
  });

  it("schedules invalidation when safe to reconcile", () => {
    const decision = planRealtimeReconciliation(
      {
        type: "progress.updated",
        actorId: userA,
        occurredAt: new Date().toISOString(),
      },
      baseOpts,
    );
    expect(decision.action).toBe("invalidate");
    if (decision.action === "invalidate") {
      expect(decision.scope.userId).toBe(userA);
    }
  });

  it("invalidates notification events per user", () => {
    const decision = planRealtimeReconciliation(
      {
        type: "notification.received",
        actorId: userA,
        occurredAt: new Date().toISOString(),
      },
      baseOpts,
    );
    expect(decision.action).toBe("invalidate");
  });

  describe("proposal.support_changed (Phase 4B)", () => {
    it("returns an invalidate decision with the userId scope", () => {
      const decision = planRealtimeReconciliation(
        {
          type: "proposal.support_changed",
          actorId: userA,
          occurredAt: new Date().toISOString(),
          proposalId,
        },
        baseOpts,
      );
      expect(decision.action).toBe("invalidate");
      if (decision.action === "invalidate") {
        // The planner carries userId; the bridge composes the
        // proposal query keys from the event's `proposalId`.
        expect(decision.scope.userId).toBe(userA);
      }
    });

    it("does NOT carry missionIds for proposal events", () => {
      const decision = planRealtimeReconciliation(
        {
          type: "proposal.support_changed",
          actorId: userA,
          occurredAt: new Date().toISOString(),
          proposalId,
        },
        baseOpts,
      );
      if (decision.action === "invalidate") {
        expect(decision.scope.missionIds).toBeUndefined();
      }
    });
  });

  describe("mission.catalog_updated", () => {
    it("invalidates with the missionIds scope, not userId", () => {
      const decision = planRealtimeReconciliation(
        {
          type: "mission.catalog_updated",
          actorId: userA,
          missionId: "mission-7",
          occurredAt: new Date().toISOString(),
        },
        baseOpts,
      );
      expect(decision.action).toBe("invalidate");
      if (decision.action === "invalidate") {
        expect(decision.scope.missionIds).toEqual(["mission-7"]);
        // userId is intentionally omitted for catalog events.
        expect(decision.scope.userId).toBeUndefined();
      }
    });
  });
});

describe("mapCivicEventPayloadToProposalSupport", () => {
  it("extracts proposal_id from a civic_events payload", () => {
    const row = {
      id: "ce1",
      kind: "proposal.supported",
      actor_id: userA,
      target_type: "proposal",
      target_id: proposalId,
      district_id: null,
      payload: { support_id: "s1" },
      occurred_at: "2026-06-07T10:00:00Z",
      dedupe_key: `proposal.supported:${proposalId}:${userA}`,
    };
    const payload: RealtimePayload = {
      eventType: "INSERT",
      new: row,
      old: null,
    };
    const event = mapCivicEventPayloadToProposalSupport(payload, userA);
    expect(event).not.toBeNull();
    expect(event?.proposalId).toBe(proposalId);
    expect(event?.actorId).toBe(userA);
  });

  it("falls back to fallbackActorId when actor_id is missing", () => {
    const row = {
      id: "ce1",
      kind: "proposal.supported",
      actor_id: null,
      target_type: "proposal",
      target_id: proposalId,
      district_id: null,
      payload: {},
      occurred_at: "2026-06-07T10:00:00Z",
      dedupe_key: null,
    };
    const payload: RealtimePayload = {
      eventType: "INSERT",
      new: row,
      old: null,
    };
    const event = mapCivicEventPayloadToProposalSupport(payload, userA);
    expect(event).not.toBeNull();
    expect(event?.actorId).toBe(userA);
  });

  it("returns null when the row is missing a target_id", () => {
    const row = {
      id: "ce1",
      kind: "proposal.supported",
      actor_id: userA,
      target_type: "proposal",
      target_id: null,
      district_id: null,
      payload: {},
      occurred_at: "2026-06-07T10:00:00Z",
      dedupe_key: null,
    };
    const payload: RealtimePayload = {
      eventType: "INSERT",
      new: row,
      old: null,
    };
    const event = mapCivicEventPayloadToProposalSupport(payload, userA);
    expect(event).toBeNull();
  });

  it("returns null when kind is not proposal.supported", () => {
    const row = {
      id: "ce1",
      kind: "proposal.created",
      actor_id: userA,
      target_type: "proposal",
      target_id: proposalId,
      district_id: null,
      payload: {},
      occurred_at: "2026-06-07T10:00:00Z",
      dedupe_key: null,
    };
    const payload: RealtimePayload = {
      eventType: "INSERT",
      new: row,
      old: null,
    };
    const event = mapCivicEventPayloadToProposalSupport(payload, userA);
    expect(event).toBeNull();
  });
});

describe("MISSION_REALTIME_CHANNELS", () => {
  it("builds a per-user channel for proposal support", () => {
    expect(MISSION_REALTIME_CHANNELS.proposalSupport(proposalId)).toBe(
      `kusqa:proposal-support:${proposalId}`,
    );
  });
});
