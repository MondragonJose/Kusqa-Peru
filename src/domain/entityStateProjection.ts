/**
 * KUSQA Entity State Projection — maps reduced EntityState to UI-friendly models.
 *
 * Wraps all outputs with enforceEntityInvariants as a safety gate:
 *   - Hard violations → fall back to raw reducer output (safe degrade)
 *   - Soft violations → auto-corrected by the invariant layer
 *   - Valid state → passes through unchanged
 *
 * Replaces scattered compute functions:
 *   - deriveCompletionState() — replaced via entityState.completionState
 *   - deriveCompletionStateFromEvidenceStatuses() — replaced via entityState.completionState
 *   - mission status derivations — replaced via entityStateToUserMission()
 *
 * Design:
 *   - PURE FUNCTIONS — no DB, no React, no side effects
 *   - Every function accepts EntityState and returns a specific view model
 *   - No function calls a reducer internally — callers pass pre-reduced state
 *   - Backward compatible: all existing callers can migrate incrementally
 */

import type { UserMission, UserMissionStatus } from "@/types/domain";
import type { Mission } from "@/types/domain";
import type { EntityState } from "@/domain/eventReducer";
import { enforceEntityInvariants, EntityInvariantError } from "@/domain/entityInvariants";

// ─── View model types ──────────────────────────────────────────────────────

export type EntityProjection = {
  status: UserMissionStatus;
  completionState: EntityState["completionState"];
  isCompleted: boolean;
  isPendingVerification: boolean;
  isRejected: boolean;
  isFlagged: boolean;
  hasEvidence: boolean;
  completedAt: string | undefined;
};

/**
 * Internal: apply invariant enforcement, falling back to the original state
 * on hard violations (safe degrade). Returns the state to use for projection.
 */
function safeEnforce(state: EntityState): EntityState {
  try {
    return enforceEntityInvariants(state);
  } catch (error) {
    if (error instanceof EntityInvariantError) {
      // Hard violation — safe degrade: use original state unchanged
      return state;
    }
    throw error;
  }
}

/**
 * Project EntityState into a generic UI-friendly model.
 * Works for any entity type (mission, evidence, user progress).
 *
 * Invariant gate: soft violations are auto-corrected before projection;
 * hard violations fall back to the original state.
 */
export function projectEntityState(state: EntityState): EntityProjection {
  const safe = safeEnforce(state);

  return {
    status: safe.isCompleted ? "completed" : "in_progress",
    completionState: safe.completionState,
    isCompleted: safe.isCompleted,
    isPendingVerification: safe.isPendingVerification,
    isRejected: safe.isRejected,
    isFlagged: safe.isFlagged,
    hasEvidence: safe.hasEvidence,
    completedAt: safe.completedAt,
  };
}

/**
 * Project EntityState into a UserMission shape.
 *
 * Merges reducer-derived fields with DB-backed fields (mission, userId, etc.)
 * that the reducer does not own.
 *
 * Invariant gate: same enforcement as projectEntityState.
 */
export function projectToUserMission(
  missionId: string,
  userId: string,
  state: EntityState,
  base: {
    mission: Mission;
    joinedAt: string | null;
    xpEarned: number | null;
  }
): UserMission {
  const safe = safeEnforce(state);
  const projected = projectEntityState(safe);

  return {
    id: `${missionId}-${userId}`,
    userId,
    missionId,
    status: projected.status,
    completionState: projected.completionState,
    joinedAt: base.joinedAt,
    completedAt: projected.completedAt ?? null,
    xpEarned: safe.isCompleted ? (base.xpEarned ?? 0) : base.xpEarned,
    mission: base.mission,
  };
}

/**
 * Determine whether a user can submit more evidence based on EntityState.
 * Replaces canSubmitEvidence() for the event-driven path.
 *
 * Invariant gate: validates state before computing the result.
 */
export function projectionCanSubmitEvidence(state: EntityState): boolean {
  const safe = safeEnforce(state);

  return (
    safe.completionState === "not_completed" ||
    safe.completionState === "awaiting_verification"
  );
}
