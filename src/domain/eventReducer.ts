/**
 * KUSQA Event Reducer — deterministic state machine over causal event chains.
 *
 * This is the SINGLE source of truth for entity state reconstruction.
 * Given a causally-ordered event chain, it folds events left-to-right
 * into a stable EntityState value.
 *
 * Design:
 *   - PURE FUNCTION — no DB, no React, no side effects
 *   - Deterministic: same events → same EntityState every time
 *   - Causal ordering first, then parentEventId resolution, then timestamp FIFO
 *   - Every event type maps to a state transition
 *   - Backward compatible: causal fields are optional on input events
 */

import type { KusqaDomainEvent, CausalEnrichedEvent } from "@/domain/events";
import type { EvidenceStatus, CompletionState } from "@/types/evidence";

// ─── Types ─────────────────────────────────────────────────────────────────

export type VerificationState =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected"
  | "flagged";

/**
 * Consolidated state derived from an entity's full causal event chain.
 * Every field is deterministic from the event input alone.
 */
export type EntityState = {
  /** Derived mission lifecycle phase */
  missionStatus: "unknown" | "in_progress" | "completed";
  /** Most recent evidence verification status (null if no evidence events) */
  evidenceStatus: EvidenceStatus | null;
  /** Completion state for the entity */
  completionState: CompletionState;
  /** Detailed verification phase */
  verificationState: VerificationState;
  /** causalId of the most recent event processed */
  lastUpdatedEventId: string | undefined;
  /** Type of the most recent event processed */
  lastEventType: KusqaDomainEvent["type"] | undefined;
  /** Timestamp from the MissionCompleted event, if any */
  completedAt: string | undefined;
  /** True if a MissionCompleted event exists in the chain */
  isCompleted: boolean;
  /** True if there is at least one EvidenceSubmitted not yet resolved */
  isPendingVerification: boolean;
  /** True if the latest evidence event was a rejection */
  isRejected: boolean;
  /** True if the latest evidence event was a flag */
  isFlagged: boolean;
  /** True if any evidence has been submitted */
  hasEvidence: boolean;
  /** Reason from the most recent rejection event */
  rejectionReason: string | null;
};

// ─── Initial state ─────────────────────────────────────────────────────────

const INITIAL_STATE: EntityState = {
  missionStatus: "in_progress",
  evidenceStatus: null,
  completionState: "not_completed",
  verificationState: "unverified",
  lastUpdatedEventId: undefined,
  lastEventType: undefined,
  completedAt: undefined,
  isCompleted: false,
  isPendingVerification: false,
  isRejected: false,
  isFlagged: false,
  hasEvidence: false,
  rejectionReason: null,
};

// ─── Reducer ───────────────────────────────────────────────────────────────

/**
 * Pure deterministic reducer over a causally-ordered event chain.
 *
 * Walks events left-to-right once, applying each as a state transition.
 * - EvidenceSubmitted → pending verification
 * - EvidenceVerified → verified
 * - EvidenceRejected → rejected (with optional reason)
 * - EvidenceFlagged → flagged
 * - MissionCompleted → terminal completed state (cancels pending flags)
 * - MissionStateUpdated → marker (no state mutation beyond tracking)
 *
 * The reducer does NOT re-sort events — it assumes they arrive in
 * causal order (use buildCausalChain() output).
 */
export function reduceEntityState(
  events: readonly (KusqaDomainEvent | CausalEnrichedEvent)[]
): EntityState {
  return events.reduce<EntityState>((state, event) => {
    switch (event.type) {
      case "EvidenceSubmitted":
        return {
          ...state,
          evidenceStatus: "pending",
          completionState:
            state.completionState === "completed"
              ? "completed"
              : "awaiting_verification",
          verificationState: "pending",
          isPendingVerification: true,
          isRejected: false,
          isFlagged: false,
          hasEvidence: true,
          lastUpdatedEventId: "causalId" in event ? event.causalId : undefined,
          lastEventType: event.type,
        };

      case "EvidenceVerified":
        return {
          ...state,
          evidenceStatus: "verified",
          verificationState: "verified",
          isPendingVerification: false,
          isRejected: false,
          isFlagged: false,
          rejectionReason: null,
          lastUpdatedEventId: "causalId" in event ? event.causalId : undefined,
          lastEventType: event.type,
        };

      case "EvidenceRejected":
        return {
          ...state,
          evidenceStatus: "rejected",
          verificationState: "rejected",
          isRejected: true,
          isPendingVerification: false,
          isFlagged: false,
          rejectionReason: event.rejectionReason,
          lastUpdatedEventId: "causalId" in event ? event.causalId : undefined,
          lastEventType: event.type,
        };

      case "EvidenceFlagged":
        return {
          ...state,
          evidenceStatus: "flagged",
          verificationState: "flagged",
          isFlagged: true,
          isPendingVerification: false,
          isRejected: false,
          lastUpdatedEventId: "causalId" in event ? event.causalId : undefined,
          lastEventType: event.type,
        };

      case "MissionCompleted":
        return {
          ...state,
          missionStatus: "completed",
          completionState: "completed",
          evidenceStatus: "verified",
          verificationState: "verified",
          isCompleted: true,
          isPendingVerification: false,
          isRejected: false,
          isFlagged: false,
          completedAt: event.timestamp,
          rejectionReason: null,
          lastUpdatedEventId: "causalId" in event ? event.causalId : undefined,
          lastEventType: event.type,
        };

      case "MissionStateUpdated":
        return {
          ...state,
          lastUpdatedEventId: "causalId" in event ? event.causalId : undefined,
          lastEventType: event.type,
        };
    }
  }, INITIAL_STATE);
}
