/**
 * Evidence Domain — pure derivation logic, zero side effects.
 *
 * This is the ONLY place where evidence lifecycle state is computed.
 * All consumers (services, UI, mutations) import from here.
 * NEVER duplicate evidence logic elsewhere.
 */

import type { EvidenceStatus, EvidenceLifecycleInfo, CompletionState } from "@/types/evidence";
import { EVIDENCE_VERIFICATION_REQUIRED } from "@/types/evidence";

// ─── DB → Domain status mapping ──────────────────────────────────────────

const MODERATION_TO_EVIDENCE: Record<string, EvidenceStatus> = {
  pending: "pending",
  approved: "verified",
  rejected: "rejected",
  flagged: "flagged",
};

/**
 * Map the DB moderation_status to canonical EvidenceStatus.
 * Defensive: unknown values map to 'pending' (graceful degradation).
 */
export function mapModerationStatus(dbStatus: string): EvidenceStatus {
  return MODERATION_TO_EVIDENCE[dbStatus] ?? "pending";
}

/**
 * Map domain EvidenceStatus back to DB moderation_status value.
 */
export function mapEvidenceToModeration(status: EvidenceStatus): string {
  switch (status) {
    case "verified":
      return "approved";
    case "pending":
    case "rejected":
    case "flagged":
      return status;
  }
}

// ─── Evidence lifecycle derivation ────────────────────────────────────────

/**
 * Compute derived lifecycle fields from evidence status.
 * Pure function — no side effects, no external state.
 */
export function computeEvidenceLifecycle(
  status: EvidenceStatus,
  verifiedBy: string | null,
  userId: string | undefined,
): EvidenceLifecycleInfo {
  const isSelf = verifiedBy !== null && userId !== undefined && verifiedBy === userId;

  switch (status) {
    case "pending":
      return {
        status,
        isVisible: true,
        isVerifiable: true,
        contributesToCompletion: false,
        contributesToTrust: false,
      };
    case "verified":
      return {
        status,
        isVisible: true,
        isVerifiable: false,
        contributesToCompletion: true,
        contributesToTrust: true,
      };
    case "rejected":
      return {
        status,
        isVisible: true,
        isVerifiable: false,
        contributesToCompletion: false,
        contributesToTrust: false,
      };
    case "flagged":
      return {
        status,
        isVisible: true,
        isVerifiable: true,
        contributesToCompletion: false,
        contributesToTrust: false,
      };
  }
}

// ─── Mission completion state derivation ─────────────────────────────────

/**
 * Derive the user's mission completion state from their participation
 * and evidence status.
 *
 * Rules:
 *   - completed_at IS NOT NULL → "completed"
 *   - Has evidence with moderation_status = 'pending' → "awaiting_verification"
 *   - Otherwise → "not_completed"
 */
export function deriveCompletionState(
  completedAt: string | null | undefined,
  hasPendingEvidence: boolean,
): CompletionState {
  if (completedAt) return "completed";
  if (hasPendingEvidence) return "awaiting_verification";
  return "not_completed";
}

export function deriveCompletionStateFromEvidenceStatuses(
  completedAt: string | null | undefined,
  evidenceStatuses: EvidenceStatus[],
): CompletionState {
  if (completedAt) return "completed";
  if (evidenceStatuses.some((s) => s === "pending")) return "awaiting_verification";
  return "not_completed";
}

// ─── Validation rules ────────────────────────────────────────────────────

export function canSubmitEvidence(completionState: CompletionState): boolean {
  return completionState === "not_completed" || completionState === "awaiting_verification";
}

export function canVerifyEvidence(verifierId: string, evidenceUserId: string): boolean {
  if (!EVIDENCE_VERIFICATION_REQUIRED) return true;
  return verifierId !== evidenceUserId;
}

export function canEditEvidence(
  evidenceUserId: string,
  currentUserId: string,
  status: EvidenceStatus,
): boolean {
  if (evidenceUserId !== currentUserId) return false;
  return status === "pending";
}
