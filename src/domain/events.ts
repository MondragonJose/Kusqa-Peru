/**
 * KUSQA Domain Events — lightweight internal event types.
 *
 * Each event represents a single domain state transition.
 * Payloads contain identifiers only (no full DB rows).
 * Events are emitted synchronously after successful mutations.
 */

// ─── Discriminated union ──────────────────────────────────────────────────

export type EvidenceSubmittedEvent = {
  type: "EvidenceSubmitted";
  evidenceId: string;
  userId: string;
  missionId: string;
  actorId: string;
  timestamp: string;
};

export type EvidenceVerifiedEvent = {
  type: "EvidenceVerified";
  evidenceId: string;
  userId: string;
  missionId: string;
  verifierId: string;
  timestamp: string;
};

export type EvidenceRejectedEvent = {
  type: "EvidenceRejected";
  evidenceId: string;
  userId: string;
  missionId: string;
  verifierId: string;
  rejectionReason: string | null;
  timestamp: string;
};

export type EvidenceFlaggedEvent = {
  type: "EvidenceFlagged";
  evidenceId: string;
  userId: string;
  missionId: string;
  flaggerId: string;
  timestamp: string;
};

export type MissionCompletedEvent = {
  type: "MissionCompleted";
  missionId: string;
  userId: string;
  evidenceId: string;
  timestamp: string;
};

export type MissionStateUpdatedEvent = {
  type: "MissionStateUpdated";
  missionId: string;
  actorId: string;
  timestamp: string;
};

export type KusqaDomainEvent =
  | EvidenceSubmittedEvent
  | EvidenceVerifiedEvent
  | EvidenceRejectedEvent
  | EvidenceFlaggedEvent
  | MissionCompletedEvent
  | MissionStateUpdatedEvent;

/**
 * Causal-enriched event — extends any KusqaDomainEvent with optional
 * causal relationship fields for deterministic ordering and parent linkage.
 *
 * These fields are populated internally during hydration or chain-building;
 * they are NEVER required at emit() time.
 */
export type CausalEnrichedEvent = KusqaDomainEvent & {
  /** Unique identifier for this event's position in a causal chain */
  causalId?: string;
  /** The causalId of this event's direct predecessor in the chain */
  parentEventId?: string;
  /** Groups causally-related events together (e.g. all events for one evidence submission) */
  causalGroupId?: string;
};

// ─── Event factory helpers ────────────────────────────────────────────────

export function createEvidenceSubmittedEvent(
  evidenceId: string,
  userId: string,
  missionId: string,
  actorId: string
): EvidenceSubmittedEvent {
  return {
    type: "EvidenceSubmitted",
    evidenceId,
    userId,
    missionId,
    actorId,
    timestamp: new Date().toISOString(),
  };
}

export function createEvidenceVerifiedEvent(
  evidenceId: string,
  userId: string,
  missionId: string,
  verifierId: string
): EvidenceVerifiedEvent {
  return {
    type: "EvidenceVerified",
    evidenceId,
    userId,
    missionId,
    verifierId,
    timestamp: new Date().toISOString(),
  };
}

export function createEvidenceRejectedEvent(
  evidenceId: string,
  userId: string,
  missionId: string,
  verifierId: string,
  rejectionReason: string | null
): EvidenceRejectedEvent {
  return {
    type: "EvidenceRejected",
    evidenceId,
    userId,
    missionId,
    verifierId,
    rejectionReason,
    timestamp: new Date().toISOString(),
  };
}

export function createEvidenceFlaggedEvent(
  evidenceId: string,
  userId: string,
  missionId: string,
  flaggerId: string
): EvidenceFlaggedEvent {
  return {
    type: "EvidenceFlagged",
    evidenceId,
    userId,
    missionId,
    flaggerId,
    timestamp: new Date().toISOString(),
  };
}

export function createMissionCompletedEvent(
  missionId: string,
  userId: string,
  evidenceId: string
): MissionCompletedEvent {
  return {
    type: "MissionCompleted",
    missionId,
    userId,
    evidenceId,
    timestamp: new Date().toISOString(),
  };
}
