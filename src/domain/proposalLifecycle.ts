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
 */

import type { ProposalStatus } from "@/services/proposalContract";

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
  }
> = {
  open: {
    label: "Recogiendo apoyo",
    shortLabel: "En apoyo",
    ctaPrimary: "Apoyar",
    ctaSecondary: "Compartir",
    blurb: "Esta propuesta está sumando voluntades. Si te resuena, deja tu apoyo.",
  },
  mobilizing: {
    label: "Movilizando",
    shortLabel: "En marcha",
    ctaPrimary: "Quiero co-organizar",
    ctaSecondary: "Seguir",
    blurb: "La comunidad está organizando esta iniciativa. Súmate a organizarla.",
  },
  converted: {
    label: "Ya es una misión",
    shortLabel: "Convertida",
    ctaPrimary: null,
    ctaSecondary: "Ver misión",
    blurb: "Esta propuesta se transformó en una misión activa de la comunidad.",
  },
  dismissed: {
    label: "No procede",
    shortLabel: "Archivada",
    ctaPrimary: null,
    ctaSecondary: null,
    blurb: "Esta propuesta no se llevará adelante.",
  },
};

export function getProposalPhaseCopy(phase: ProposalPhase) {
  return PROPOSAL_PHASE_COPY[phase];
}
