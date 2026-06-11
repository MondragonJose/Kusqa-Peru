import { describe, expect, it, vi, beforeEach } from "vitest";
import { isUnifiedWritesEnabled } from "@/features/initiative/mutations/initiativeMutationTypes";
import { emitInitiativeEvent } from "@/features/initiative/mutations/emitInitiativeEvent";
import type { InitiativeEvent } from "@/domain/initiativeEventCatalog";

// ---------------------------------------------------------------------------
// Flag routing
// ---------------------------------------------------------------------------

describe("isUnifiedWritesEnabled", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns true when VITE_USE_UNIFIED_WRITES=true", () => {
    vi.stubEnv("VITE_USE_UNIFIED_WRITES", "true");
    expect(isUnifiedWritesEnabled()).toBe(true);
  });

  it("returns false when VITE_USE_UNIFIED_WRITES=false", () => {
    vi.stubEnv("VITE_USE_UNIFIED_WRITES", "false");
    expect(isUnifiedWritesEnabled()).toBe(false);
  });

  it("returns false when VITE_USE_UNIFIED_WRITES is unset", () => {
    vi.stubEnv("VITE_USE_UNIFIED_WRITES", undefined);
    expect(isUnifiedWritesEnabled()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// emitInitiativeEvent — actor/entity/mission extraction
// ---------------------------------------------------------------------------

describe("emitInitiativeEvent", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("handles ProposalSupported event", () => {
    const event: InitiativeEvent = {
      type: "ProposalSupported",
      proposalId: "prop-1",
      supporterId: "user-1",
      timestamp: "2026-06-10T12:00:00Z",
    };
    expect(() => emitInitiativeEvent(event)).not.toThrow();
  });

  it("handles MissionJoined event", () => {
    const event: InitiativeEvent = {
      type: "MissionJoined",
      missionId: "mission-1",
      userId: "user-1",
      timestamp: "2026-06-10T12:00:00Z",
    };
    expect(() => emitInitiativeEvent(event)).not.toThrow();
  });

  it("handles EvidenceSubmitted event", () => {
    const event: InitiativeEvent = {
      type: "EvidenceSubmitted",
      evidenceId: "ev-1",
      missionId: "mission-1",
      userId: "user-1",
      actorId: "user-1",
      timestamp: "2026-06-10T12:00:00Z",
    };
    expect(() => emitInitiativeEvent(event)).not.toThrow();
  });

  it("handles ProposalLocked event", () => {
    const event: InitiativeEvent = {
      type: "ProposalLocked",
      proposalId: "prop-1",
      timestamp: "2026-06-10T12:00:00Z",
    };
    expect(() => emitInitiativeEvent(event)).not.toThrow();
  });

  it("handles ProposalConvertedToMission event", () => {
    const event: InitiativeEvent = {
      type: "ProposalConvertedToMission",
      proposalId: "prop-1",
      missionId: "mission-1",
      timestamp: "2026-06-10T12:00:00Z",
    };
    expect(() => emitInitiativeEvent(event)).not.toThrow();
  });

  it("handles ProposalCommentAdded event", () => {
    const event: InitiativeEvent = {
      type: "ProposalCommentAdded",
      proposalId: "prop-1",
      commentId: "comment-1",
      actorId: "user-1",
      timestamp: "2026-06-10T12:00:00Z",
    };
    expect(() => emitInitiativeEvent(event)).not.toThrow();
  });

  it("handles every InitiativeEvent variant without throwing", () => {
    const variants: InitiativeEvent[] = [
      {
        type: "ProposalCreated",
        proposalId: "p1",
        actorId: "u1",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "ProposalSupported",
        proposalId: "p1",
        supporterId: "u1",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "ProposalUnsuspended",
        proposalId: "p1",
        supporterId: "u1",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "ProposalCommentAdded",
        proposalId: "p1",
        commentId: "c1",
        actorId: "u1",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "ProposalCollaboratorJoined",
        proposalId: "p1",
        collaboratorId: "u1",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "ProposalThresholdReached",
        proposalId: "p1",
        fromStatus: "pending",
        toStatus: "active",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "ProposalConvertedToMission",
        proposalId: "p1",
        missionId: "m1",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "ProposalReopened",
        proposalId: "p1",
        reason: null,
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "ProposalLocked",
        proposalId: "p1",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "MissionJoined",
        missionId: "m1",
        userId: "u1",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "EvidenceSubmitted",
        evidenceId: "e1",
        missionId: "m1",
        userId: "u1",
        actorId: "u1",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "EvidenceVerified",
        evidenceId: "e1",
        missionId: "m1",
        userId: "u1",
        verifierId: "u2",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "EvidenceRejected",
        evidenceId: "e1",
        missionId: "m1",
        userId: "u1",
        verifierId: "u2",
        rejectionReason: "bad photo",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "EvidenceFlagged",
        evidenceId: "e1",
        missionId: "m1",
        userId: "u1",
        flaggerId: "u2",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "MissionStateUpdated",
        missionId: "m1",
        actorId: "u1",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "MissionCompleted",
        missionId: "m1",
        userId: "u1",
        evidenceId: "e1",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "DistrictFirstMovement",
        districtId: "d1",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "CommunityTrustChanged",
        profileId: "p1",
        timestamp: "2026-01-01T00:00:00Z",
      },
      {
        type: "CommunityProfileMilestone",
        profileId: "p1",
        milestone: "100_days",
        timestamp: "2026-01-01T00:00:00Z",
      },
    ];

    for (const event of variants) {
      expect(() => emitInitiativeEvent(event)).not.toThrow();
    }
  });
});
