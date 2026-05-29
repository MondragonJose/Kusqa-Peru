/**
 * KUSQA Entity Invariants — domain-level correctness guarantees at the projection boundary.
 *
 * This layer enforces logical consistency rules on EntityState before it
 * reaches UI. It is a safety net, NOT a replacement for reducer correctness.
 *
 * Design:
 *   - Pure functions — no DB, no React, no side effects
 *   - Two severity levels:
 *       "hard" — state is definitely corrupt, throw to trigger fallback
 *       "soft" — self-contradictory but auto-correctable
 *   - Corrections are conservative: they clear contradictory flags
 *     without inventing missing data
 *   - All enforcement is post-projection (read-path safety layer)
 */

import type { EntityState, VerificationState } from "@/domain/eventReducer";

// ─── Types ─────────────────────────────────────────────────────────────────

export type InvariantSeverity = "soft" | "hard";

export type InvariantResult = {
  valid: boolean;
  violations: readonly string[];
  severity: InvariantSeverity | null;
};

export class EntityInvariantError extends Error {
  readonly violations: readonly string[];

  constructor(violations: string[]) {
    super(`Entity invariant violation(s): ${violations.join("; ")}`);
    this.name = "EntityInvariantError";
    this.violations = violations;
  }
}

// ─── Rules ─────────────────────────────────────────────────────────────────

/**
 * Check all domain invariants on an EntityState value.
 *
 * Hard violations (state corrupt, must never reach UI):
 *   - isCompleted but no completedAt
 *   - isCompleted but missionStatus !== "completed"
 *   - isCompleted AND isPendingVerification both true
 *
 * Soft violations (self-contradictory, auto-correctable):
 *   - isRejected AND isCompleted
 *   - isFlagged AND isCompleted
 *   - isRejected AND isPendingVerification
 *   - isCompleted without any EvidenceSubmitted in chain
 *     (admin/manual completion, soft warning only)
 */
export function validateEntityState(state: EntityState): InvariantResult {
  const violations: string[] = [];
  let severity: InvariantSeverity | null = null;

  const push = (msg: string, sev: InvariantSeverity): void => {
    violations.push(msg);
    if (severity === null || sev === "hard") {
      severity = sev;
    }
  };

  // ── Hard invariants ──────────────────────────────────────────────────

  if (state.isCompleted && !state.completedAt) {
    push("isCompleted requires completedAt timestamp", "hard");
  }

  if (state.isCompleted && state.missionStatus !== "completed") {
    push("isCompleted requires missionStatus = 'completed'", "hard");
  }

  if (state.isCompleted && state.isPendingVerification) {
    push("isCompleted and isPendingVerification are mutually exclusive", "hard");
  }

  // ── Soft invariants ──────────────────────────────────────────────────

  if (state.isRejected && state.isCompleted) {
    push("isRejected and isCompleted are contradictory — clearing isRejected", "soft");
  }

  if (state.isFlagged && state.isCompleted) {
    push("isFlagged and isCompleted are contradictory — clearing isCompleted", "soft");
  }

  if (state.isRejected && state.isPendingVerification) {
    push("EvidenceSubmitted after rejection must reset isRejected", "soft");
  }

  if (state.isCompleted && !state.hasEvidence) {
    push("isCompleted without evidence chain (possible manual completion)", "soft");
  }

  return {
    valid: violations.length === 0,
    violations,
    severity,
  };
}

// ─── Enforcement ───────────────────────────────────────────────────────────

/**
 * Enforce domain invariants on an EntityState value.
 *
 * - If valid → returns state unchanged
 * - If soft violation → returns auto-corrected state
 * - If hard violation → throws EntityInvariantError (caller must catch
 *   and fall back to raw reducer output)
 *
 * Non-mutating: always returns a new object or throws.
 */
export function enforceEntityInvariants(state: EntityState): EntityState {
  const result = validateEntityState(state);

  if (result.valid) return state;

  if (result.severity === "hard") {
    if (import.meta.env.DEV) {
      console.warn("[entityInvariants] Hard violation — falling back to raw state", {
        violations: result.violations,
        state,
      });
    }
    throw new EntityInvariantError([...result.violations]);
  }

  // Soft corrections — conservative: clear contradictory flags only
  let corrected: EntityState = { ...state };

  if (corrected.isRejected && corrected.isCompleted) {
    corrected = {
      ...corrected,
      isRejected: false,
      rejectionReason: null,
      verificationState: "verified" as VerificationState,
    };
  }

  if (corrected.isFlagged && corrected.isCompleted) {
    corrected = {
      ...corrected,
      isCompleted: false,
      completionState: "awaiting_verification",
      missionStatus: "in_progress",
      completedAt: undefined,
    };
  }

  if (corrected.isRejected && corrected.isPendingVerification) {
    corrected = {
      ...corrected,
      isRejected: false,
      rejectionReason: null,
      verificationState: "pending" as VerificationState,
    };
  }

  return corrected;
}
