/**
 * Proposal Phase Domain — pure derivation from DB status, zero side effects.
 *
 * Mapping (proposal status → user-facing phase):
 *   pending  → "open"          (just proposed, gathering support)
 *   active   → "mobilizing"     (a mission exists or is being formed)
 *   resolved → "converted"      (read-only: a mission was created from it)
 *   rejected → "dismissed"      (terminal: never show with primary CTA)
 *
 * The phase is derived, never stored. Reuse this function everywhere a
 * phase label, CTA, or status chip is needed.
 *
 * Phase 2A adds REAL state transitions to this layer:
 *   - getProposalThreshold(teamSize)  — support count required to mobilize
 *   - canConvertProposal(...)         — can the author convert now?
 *   - canInviteCollaborators(...)     — should the invite CTA show?
 *   - canProposeProposalTransition()  — predicate for status moves
 *
 * All transitions are derived from support_count, collaborator_count, and
 * team_size — no random numbers, no fake momentum, no invented thresholds.
 */

import { DB_DEFAULTS, type ProposalStatus } from "@/services/proposalContract";

export type ProposalPhase = "open" | "mobilizing" | "converted" | "dismissed";

const STATUS_TO_PHASE: Record<ProposalStatus, ProposalPhase> = {
  pending: "open",
  active: "mobilizing",
  resolved: "converted",
  rejected: "dismissed",
};

export function getProposalPhase(status: ProposalStatus): ProposalPhase {
  return STATUS_TO_PHASE[status];
}

/**
 * Spanish copy keyed by phase. Single source of truth so the same
 * vocabulary appears across hero, sticky CTA, and share sheet.
 */
export const PROPOSAL_PHASE_COPY: Record<
  ProposalPhase,
  {
    label: string;
    shortLabel: string;
    ctaPrimary: string | null;
    ctaSecondary: string | null;
    blurb: string;
    action: "support" | "coorganize" | "view_mission" | "none";
  }
> = {
  open: {
    label: "Recogiendo apoyo",
    shortLabel: "En apoyo",
    ctaPrimary: "Apoyar",
    ctaSecondary: "Compartir",
    blurb: "Esta propuesta está sumando voluntades. Si te resuena, deja tu apoyo.",
    action: "support",
  },
  mobilizing: {
    label: "Movilizando",
    shortLabel: "En marcha",
    ctaPrimary: "Quiero co-organizar",
    ctaSecondary: "Compartir",
    blurb: "La comunidad está organizando esta iniciativa. Súmate a organizarla.",
    action: "coorganize",
  },
  converted: {
    label: "Ya es una misión",
    shortLabel: "Convertida",
    ctaPrimary: null,
    ctaSecondary: null,
    blurb: "Esta propuesta se transformó en una misión activa de la comunidad.",
    action: "view_mission",
  },
  dismissed: {
    label: "No procede",
    shortLabel: "Archivada",
    ctaPrimary: null,
    ctaSecondary: null,
    blurb: "Esta propuesta no se llevará adelante.",
    action: "none",
  },
};

export function getProposalPhaseCopy(phase: ProposalPhase) {
  return PROPOSAL_PHASE_COPY[phase];
}

// ─── Phase 2A: Real state-machine predicates ────────────────────────────────

/**
 * Number of distinct supports a proposal needs to enter `mobilizing`.
 *
 * Rule (from Phase 2A spec):
 *   threshold = max(MIN, ceil(teamSize * 0.3))
 *
 * The 0.3 ratio is a deliberate social commitment threshold: it
 * represents ~1 supporter per 3 planned team slots — small enough
 * to be reachable for proposals with team_size 3, large enough
 * to filter out single-voter proposals.
 */
export function getProposalThreshold(teamSize: number): number {
  const safeTeam = Math.max(
    DB_DEFAULTS.TEAM_SIZE_MIN,
    Math.min(DB_DEFAULTS.TEAM_SIZE_MAX, Math.floor(teamSize)),
  );
  const ratio = Math.ceil(safeTeam * DB_DEFAULTS.SUPPORT_THRESHOLD_RATIO);
  return Math.max(DB_DEFAULTS.SUPPORT_THRESHOLD_MIN, ratio);
}

/**
 * Is the proposal ready to be converted to a mission?
 *
 * Author can convert when:
 *   - status is "active" (already in mobilizing), or
 *   - status is "pending" AND supportCount >= threshold
 *   - hasConvertedMissionId is null (idempotency)
 */
export function canConvertProposal(args: {
  status: ProposalStatus;
  supportCount: number;
  hasConvertedMissionId: boolean;
  threshold: number;
}): boolean {
  if (args.hasConvertedMissionId) return false;
  if (args.status === "resolved" || args.status === "rejected") return false;
  if (args.status === "active") return true;
  return args.supportCount >= args.threshold;
}

/**
 * Should the "Quiero co-organizar" CTA show on the detail page?
 *
 * Author can invite collaborators when:
 *   - status is "active" (mobilizing) — coalition phase
 *   - status is "pending" AND supportCount >= threshold
 *   - viewer is the author
 *   - proposal has not been converted or dismissed
 */
export function canInviteCollaborators(args: {
  status: ProposalStatus;
  supportCount: number;
  isAuthor: boolean;
  threshold: number;
}): boolean {
  if (!args.isAuthor) return false;
  if (args.status === "resolved" || args.status === "rejected") return false;
  if (args.status === "active") return true;
  return args.supportCount >= args.threshold;
}

/**
 * What action should the author take next? (used by author dashboard / sticky CTA)
 */
export type ProposalAuthorNextStep =
  | "share_to_gather_support"
  | "invite_collaborators"
  | "convert_to_mission"
  | "await_collaborators"
  | "no_action";

export function getProposalAuthorNextStep(args: {
  status: ProposalStatus;
  supportCount: number;
  acceptedCollaboratorCount: number;
  teamSize: number;
  hasConvertedMissionId: boolean;
}): ProposalAuthorNextStep {
  if (args.hasConvertedMissionId || args.status === "resolved" || args.status === "rejected") {
    return "no_action";
  }
  const threshold = getProposalThreshold(args.teamSize);

  if (args.status === "pending" && args.supportCount < threshold) {
    return "share_to_gather_support";
  }

  // Has reached threshold or already active
  if (args.acceptedCollaboratorCount === 0) {
    return "invite_collaborators";
  }

  if (
    canConvertProposal({
      status: args.status,
      supportCount: args.supportCount,
      hasConvertedMissionId: args.hasConvertedMissionId,
      threshold,
    })
  ) {
    return "convert_to_mission";
  }

  return "await_collaborators";
}

/**
 * Progress from open → mobilizing (0..1), used by progress chips.
 * Clamps to [0, 1]. Returns 1 when threshold is reached, NOT 1.5.
 */
export function getSupportProgress(args: { supportCount: number; threshold: number }): number {
  if (args.threshold <= 0) return 0;
  return Math.max(0, Math.min(1, args.supportCount / args.threshold));
}

/**
 * Tells the feed whether the proposal is in "gathering support" state
 * (deserves an "En apoyo" chip) vs. "mobilizing" (deserves "En marcha").
 * The returned string is meant for the feed card chip, not the detail hero.
 */
export function getFeedChip(
  status: ProposalStatus,
): "en_apoyo" | "en_marcha" | "convertida" | "archivada" {
  const phase = getProposalPhase(status);
  if (phase === "open") return "en_apoyo";
  if (phase === "mobilizing") return "en_marcha";
  if (phase === "converted") return "convertida";
  return "archivada";
}
