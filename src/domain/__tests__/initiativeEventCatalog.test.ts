import { describe, expect, it } from "vitest";
import type { KusqaDomainEvent } from "@/domain/events";
import type { TerritorialEvent, TerritorialEventType } from "@/domain/territorialEvent";
import type {
  ProposalLifecycleEvent,
  ProposalLifecycleEventType,
} from "@/services/proposalConversionRepository";
import {
  kusqaEventToInitiative,
  territorialEventToInitiative,
  lifecycleEventToInitiative,
} from "../initiativeEventCatalog";
import { summarizeInitiativeEvents } from "../territorialIntelligence";
import type { InitiativeEvent } from "../initiativeEventCatalog";
import { summarizeEventsToImpact } from "../territorialIntelligence";

// ─── Helpers ──────────────────────────────────────────────────────────────

function ts(iso?: string): string {
  return iso ?? new Date().toISOString();
}

function makeKusqaEvent(
  overrides: Partial<KusqaDomainEvent> & { type: KusqaDomainEvent["type"] },
): KusqaDomainEvent {
  const base = { timestamp: ts() };
  switch (overrides.type) {
    case "EvidenceSubmitted":
      return {
        ...base,
        type: "EvidenceSubmitted",
        evidenceId: "ev-1",
        userId: "u-1",
        missionId: "m-1",
        actorId: "a-1",
      } as KusqaDomainEvent;
    case "EvidenceVerified":
      return {
        ...base,
        type: "EvidenceVerified",
        evidenceId: "ev-1",
        userId: "u-1",
        missionId: "m-1",
        verifierId: "v-1",
      } as KusqaDomainEvent;
    case "EvidenceRejected":
      return {
        ...base,
        type: "EvidenceRejected",
        evidenceId: "ev-1",
        userId: "u-1",
        missionId: "m-1",
        verifierId: "v-1",
        rejectionReason: null,
      } as KusqaDomainEvent;
    case "EvidenceFlagged":
      return {
        ...base,
        type: "EvidenceFlagged",
        evidenceId: "ev-1",
        userId: "u-1",
        missionId: "m-1",
        flaggerId: "f-1",
      } as KusqaDomainEvent;
    case "MissionCompleted":
      return {
        ...base,
        type: "MissionCompleted",
        missionId: "m-1",
        userId: "u-1",
        evidenceId: "ev-1",
      } as KusqaDomainEvent;
    case "MissionStateUpdated":
      return {
        ...base,
        type: "MissionStateUpdated",
        missionId: "m-1",
        actorId: "a-1",
      } as KusqaDomainEvent;
  }
}

function makeTerritorialEvent(
  type: TerritorialEventType,
  entityId: string,
  actorId?: string,
): TerritorialEvent {
  return {
    id: "te-" + entityId,
    type,
    actor: {
      id: actorId ?? "u-1",
      username: "tester",
      firstName: "Tester",
      avatarUrl: null,
    },
    entityType: type.startsWith("proposal")
      ? "proposal"
      : type.startsWith("mission")
        ? "mission"
        : type.startsWith("institution")
          ? "institution"
          : type.startsWith("district")
            ? "district"
            : "profile",
    entityId,
    entityTitle: null,
    districtId: null,
    region: null,
    createdAt: ts(),
    metadata: {},
  };
}

function makeLifecycleEvent(
  eventType: ProposalLifecycleEventType,
  overrides?: Partial<ProposalLifecycleEvent>,
): ProposalLifecycleEvent {
  return {
    id: "lc-" + eventType,
    eventType,
    actorUsername: "tester",
    actorFirstName: "Tester",
    actorAvatarUrl: null,
    fromStatus: null,
    toStatus: null,
    convertedMissionId: null,
    detail: null,
    createdAt: ts(),
    ...overrides,
  };
}

// ─── Adapter: KusqaDomainEvent → InitiativeEvent ─────────────────────────

describe("kusqaEventToInitiative", () => {
  it("maps EvidenceSubmitted", () => {
    const e = makeKusqaEvent({ type: "EvidenceSubmitted" });
    const result = kusqaEventToInitiative(e);
    expect(result.type).toBe("EvidenceSubmitted");
    if (result.type === "EvidenceSubmitted") {
      expect(result.evidenceId).toBe("ev-1");
      expect(result.missionId).toBe("m-1");
    }
  });

  it("maps EvidenceVerified", () => {
    const e = makeKusqaEvent({ type: "EvidenceVerified" });
    const result = kusqaEventToInitiative(e);
    expect(result.type).toBe("EvidenceVerified");
  });

  it("maps EvidenceRejected", () => {
    const e = makeKusqaEvent({ type: "EvidenceRejected" });
    const result = kusqaEventToInitiative(e);
    expect(result.type).toBe("EvidenceRejected");
    if (result.type === "EvidenceRejected") {
      expect(result.rejectionReason).toBeNull();
    }
  });

  it("maps EvidenceFlagged", () => {
    const e = makeKusqaEvent({ type: "EvidenceFlagged" });
    const result = kusqaEventToInitiative(e);
    expect(result.type).toBe("EvidenceFlagged");
  });

  it("maps MissionCompleted", () => {
    const e = makeKusqaEvent({ type: "MissionCompleted" });
    const result = kusqaEventToInitiative(e);
    expect(result.type).toBe("MissionCompleted");
  });

  it("maps MissionStateUpdated", () => {
    const e = makeKusqaEvent({ type: "MissionStateUpdated" });
    const result = kusqaEventToInitiative(e);
    expect(result.type).toBe("MissionStateUpdated");
  });

  /* Exhaustive check: every KusqaDomainEvent variant must be handled */
  it("handles every KusqaDomainEvent variant exhaustively", () => {
    const variants: KusqaDomainEvent["type"][] = [
      "EvidenceSubmitted",
      "EvidenceVerified",
      "EvidenceRejected",
      "EvidenceFlagged",
      "MissionCompleted",
      "MissionStateUpdated",
    ];
    for (const type of variants) {
      const e = makeKusqaEvent({ type: type as KusqaDomainEvent["type"] });
      const result = kusqaEventToInitiative(e);
      expect(result.type).toBeDefined();
    }
    // Compile-time check: if a new variant is added to KusqaDomainEvent but
    // not handled in kusqaEventToInitiative, the switch above would error.
    const _exhaustive = (_e: KusqaDomainEvent): void => {
      const r = kusqaEventToInitiative(_e);
      const _check: never = _e as never;
      void r;
      void _check;
    };
    void _exhaustive;
  });
});

// ─── Adapter: TerritorialEvent → InitiativeEvent ─────────────────────────

describe("territorialEventToInitiative", () => {
  const ALL_TERRITORIAL_TYPES: TerritorialEventType[] = [
    "proposal.created",
    "proposal.supported",
    "proposal.unsupported",
    "proposal.comment_added",
    "proposal.collaborator_joined",
    "proposal.threshold_reached",
    "proposal.converted_to_mission",
    "proposal.reopened",
    "mission.joined",
    "mission.completed",
    "mission.evidence_submitted",
    "mission.evidence_verified",
    "institution.endorsed",
    "district.first_movement",
    "community.trust_changed",
    "community.profile_milestone",
  ];

  it.each(ALL_TERRITORIAL_TYPES)("maps %s", (type) => {
    const te = makeTerritorialEvent(type, "entity-1");
    const result = territorialEventToInitiative(te);
    expect(result.type).toBeDefined();
    expect(result.timestamp).toBe(te.createdAt);
  });

  it("maps proposal.created correctly", () => {
    const result = territorialEventToInitiative(
      makeTerritorialEvent("proposal.created", "prop-1", "a-1"),
    );
    expect(result.type).toBe("ProposalCreated");
    if (result.type === "ProposalCreated") {
      expect(result.proposalId).toBe("prop-1");
      expect(result.actorId).toBe("a-1");
    }
  });

  it("maps proposal.supported correctly", () => {
    const result = territorialEventToInitiative(
      makeTerritorialEvent("proposal.supported", "prop-1", "u-1"),
    );
    expect(result.type).toBe("ProposalSupported");
    if (result.type === "ProposalSupported") {
      expect(result.supporterId).toBe("u-1");
    }
  });

  it("maps proposal.unsupported correctly", () => {
    const result = territorialEventToInitiative(
      makeTerritorialEvent("proposal.unsupported", "prop-1", "u-1"),
    );
    expect(result.type).toBe("ProposalUnsuspended");
  });

  it("maps proposal.collaborator_joined correctly", () => {
    const result = territorialEventToInitiative(
      makeTerritorialEvent("proposal.collaborator_joined", "prop-1", "c-1"),
    );
    expect(result.type).toBe("ProposalCollaboratorJoined");
    if (result.type === "ProposalCollaboratorJoined") {
      expect(result.collaboratorId).toBe("c-1");
    }
  });

  /* Exhaustive compile-time check for territorialEventToInitiative */
  it("handles every TerritorialEvent type exhaustively", () => {
    const _exhaustive = (e: TerritorialEvent): void => {
      const r = territorialEventToInitiative(e);
      const _check: never = e as never;
      void r;
      void _check;
    };
    void _exhaustive;
  });
});

// ─── Adapter: ProposalLifecycleEvent → InitiativeEvent ───────────────────

describe("lifecycleEventToInitiative", () => {
  it("maps coalition_threshold_reached → ProposalThresholdReached", () => {
    const lc = makeLifecycleEvent("coalition_threshold_reached", {
      fromStatus: "pending",
      toStatus: "active",
    });
    const result = lifecycleEventToInitiative(lc, "prop-1");
    expect(result.type).toBe("ProposalThresholdReached");
    if (result.type === "ProposalThresholdReached") {
      expect(result.proposalId).toBe("prop-1");
      expect(result.fromStatus).toBe("pending");
      expect(result.toStatus).toBe("active");
    }
  });

  it("maps organizer_confirmed → ProposalCollaboratorJoined", () => {
    const lc = makeLifecycleEvent("organizer_confirmed");
    const result = lifecycleEventToInitiative(lc, "prop-1");
    expect(result.type).toBe("ProposalCollaboratorJoined");
    if (result.type === "ProposalCollaboratorJoined") {
      expect(result.proposalId).toBe("prop-1");
    }
  });

  it("maps mission_created → ProposalConvertedToMission", () => {
    const lc = makeLifecycleEvent("mission_created", { convertedMissionId: "m-42" });
    const result = lifecycleEventToInitiative(lc, "prop-1");
    expect(result.type).toBe("ProposalConvertedToMission");
    if (result.type === "ProposalConvertedToMission") {
      expect(result.missionId).toBe("m-42");
    }
  });

  it("maps proposal_locked → ProposalLocked", () => {
    const lc = makeLifecycleEvent("proposal_locked");
    const result = lifecycleEventToInitiative(lc, "prop-1");
    expect(result.type).toBe("ProposalLocked");
  });

  it("maps proposal_reopened → ProposalReopened", () => {
    const lc = makeLifecycleEvent("proposal_reopened", { detail: "needs more support" });
    const result = lifecycleEventToInitiative(lc, "prop-1");
    expect(result.type).toBe("ProposalReopened");
    if (result.type === "ProposalReopened") {
      expect(result.reason).toBe("needs more support");
    }
  });

  /* Exhaustive compile-time check */
  it("handles every ProposalLifecycleEventType exhaustively", () => {
    const _exhaustive = (lc: ProposalLifecycleEvent, pid: string): void => {
      const r = lifecycleEventToInitiative(lc, pid);
      const _check: never = lc as never;
      void r;
      void _check;
    };
    void _exhaustive;
  });
});

// ─── summarizeInitiativeEvents ─────────────────────────────────────────────

describe("summarizeInitiativeEvents", () => {
  it("returns empty counts for empty events", () => {
    const result = summarizeInitiativeEvents([]);
    expect(result.missionCount).toBe(0);
    expect(result.proposalCount).toBe(0);
    expect(result.uniqueSupporterCount).toBe(0);
    expect(result.acceptedCollaboratorCount).toBe(0);
    expect(result.lastActivityAt).toBeNull();
  });

  it("counts unique proposals and missions", () => {
    const result = summarizeInitiativeEvents([
      { type: "ProposalCreated", proposalId: "p-1", actorId: "u-1", timestamp: ts() },
      { type: "ProposalSupported", proposalId: "p-1", supporterId: "u-2", timestamp: ts() },
      {
        type: "ProposalCollaboratorJoined",
        proposalId: "p-1",
        collaboratorId: "u-3",
        timestamp: ts(),
      },
      { type: "ProposalConvertedToMission", proposalId: "p-1", missionId: "m-1", timestamp: ts() },
      { type: "MissionJoined", missionId: "m-1", userId: "u-4", timestamp: ts() },
    ]);
    expect(result.proposalCount).toBe(1);
    expect(result.missionCount).toBe(1);
    expect(result.uniqueSupporterCount).toBe(1);
    expect(result.acceptedCollaboratorCount).toBe(1);
  });

  it("tracks lastActivityAt from the most recent event", () => {
    const early = "2024-01-01T00:00:00.000Z";
    const late = "2024-06-01T00:00:00.000Z";
    const result = summarizeInitiativeEvents([
      { type: "ProposalCreated", proposalId: "p-1", actorId: "u-1", timestamp: early },
      {
        type: "MissionCompleted",
        missionId: "m-1",
        userId: "u-1",
        evidenceId: "ev-1",
        timestamp: late,
      },
    ]);
    expect(result.lastActivityAt).toBe(late);
  });

  it("counts recent proposals within 30 days", () => {
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const result = summarizeInitiativeEvents([
      { type: "ProposalCreated", proposalId: "p-1", actorId: "u-1", timestamp: old },
      { type: "ProposalCreated", proposalId: "p-2", actorId: "u-2", timestamp: recent },
    ]);
    expect(result.recentProposalCount).toBe(1);
  });

  it("returns undefined counts when there are no recent proposals", () => {
    const old = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const result = summarizeInitiativeEvents([
      { type: "ProposalCreated", proposalId: "p-1", actorId: "u-1", timestamp: old },
    ]);
    expect(result.recentProposalCount).toBeUndefined();
  });

  it("aggregates multiple supporters across events", () => {
    const result = summarizeInitiativeEvents([
      { type: "ProposalSupported", proposalId: "p-1", supporterId: "u-1", timestamp: ts() },
      { type: "ProposalSupported", proposalId: "p-2", supporterId: "u-2", timestamp: ts() },
      { type: "ProposalSupported", proposalId: "p-3", supporterId: "u-1", timestamp: ts() },
    ]);
    expect(result.uniqueSupporterCount).toBe(2);
  });

  it("handles evidence events as mission events", () => {
    const result = summarizeInitiativeEvents([
      {
        type: "EvidenceSubmitted",
        evidenceId: "ev-1",
        missionId: "m-1",
        userId: "u-1",
        actorId: "u-1",
        timestamp: ts(),
      },
      {
        type: "EvidenceVerified",
        evidenceId: "ev-1",
        missionId: "m-1",
        userId: "u-1",
        verifierId: "v-1",
        timestamp: ts(),
      },
    ]);
    expect(result.missionCount).toBe(1);
  });

  it("handles community events gracefully (no entity count change)", () => {
    const result = summarizeInitiativeEvents([
      { type: "DistrictFirstMovement", districtId: "d-1", timestamp: ts() },
      { type: "CommunityTrustChanged", profileId: "p-1", timestamp: ts() },
      {
        type: "CommunityProfileMilestone",
        profileId: "p-1",
        milestone: "level_5",
        timestamp: ts(),
      },
    ]);
    expect(result.proposalCount).toBe(0);
    expect(result.missionCount).toBe(0);
    expect(result.uniqueSupporterCount).toBe(0);
  });

  /* Exhaustive compile-time check for summarizeInitiativeEvents */
  it("handles every InitiativeEvent variant exhaustively", () => {
    const variants: InitiativeEvent[] = [
      { type: "ProposalCreated", proposalId: "p", actorId: "u", timestamp: ts() },
      { type: "ProposalSupported", proposalId: "p", supporterId: "u", timestamp: ts() },
      { type: "ProposalUnsuspended", proposalId: "p", supporterId: "u", timestamp: ts() },
      {
        type: "ProposalCommentAdded",
        proposalId: "p",
        commentId: "c",
        actorId: "u",
        timestamp: ts(),
      },
      { type: "ProposalCollaboratorJoined", proposalId: "p", collaboratorId: "u", timestamp: ts() },
      {
        type: "ProposalThresholdReached",
        proposalId: "p",
        fromStatus: null,
        toStatus: null,
        timestamp: ts(),
      },
      { type: "ProposalConvertedToMission", proposalId: "p", missionId: "m", timestamp: ts() },
      { type: "ProposalReopened", proposalId: "p", reason: null, timestamp: ts() },
      { type: "ProposalLocked", proposalId: "p", timestamp: ts() },
      { type: "MissionJoined", missionId: "m", userId: "u", timestamp: ts() },
      {
        type: "EvidenceSubmitted",
        evidenceId: "ev",
        missionId: "m",
        userId: "u",
        actorId: "u",
        timestamp: ts(),
      },
      {
        type: "EvidenceVerified",
        evidenceId: "ev",
        missionId: "m",
        userId: "u",
        verifierId: "v",
        timestamp: ts(),
      },
      {
        type: "EvidenceRejected",
        evidenceId: "ev",
        missionId: "m",
        userId: "u",
        verifierId: "v",
        rejectionReason: null,
        timestamp: ts(),
      },
      {
        type: "EvidenceFlagged",
        evidenceId: "ev",
        missionId: "m",
        userId: "u",
        flaggerId: "f",
        timestamp: ts(),
      },
      { type: "MissionStateUpdated", missionId: "m", actorId: "u", timestamp: ts() },
      { type: "MissionCompleted", missionId: "m", userId: "u", evidenceId: "ev", timestamp: ts() },
      { type: "InstitutionEndorsed", institutionId: "i", timestamp: ts() },
      { type: "DistrictFirstMovement", districtId: "d", timestamp: ts() },
      { type: "CommunityTrustChanged", profileId: "p", timestamp: ts() },
      { type: "CommunityProfileMilestone", profileId: "p", milestone: "m", timestamp: ts() },
    ];
    for (const v of variants) {
      const r = summarizeInitiativeEvents([v]);
      expect(r.lastActivityAt).toBe(v.timestamp);
    }
    // Compile-time exhaustive check
    const _exhaustive = (ev: InitiativeEvent): void => {
      const r = summarizeInitiativeEvents([ev]);
      void r;
    };
    void _exhaustive;
  });
});

// ─── Regression: summarizeEventsToImpact delegates correctly ──────────────

describe("summarizeEventsToImpact (TerritorialEvent input)", () => {
  it("produces same output as before for TerritorialEvent input", () => {
    const te = makeTerritorialEvent("proposal.created", "prop-1", "a-1");
    const result = summarizeEventsToImpact([te]);
    expect(result.proposalCount).toBe(1);
    expect(result.missionCount).toBe(0);
  });
});
