/**
 * Proposal relationships — pure deterministic derivations.
 *
 * Given real counts (supportCount, collaboratorCount, etc.) and a
 * proposal's team size, derive qualitative state for the UI:
 *
 *   - support strength       ("apoyo inicial" | "creciendo" | "fuerte" | "masivo")
 *   - coalition momentum     (rising / steady / early)
 *   - proposal readiness     (how close to "convertible")
 *
 * ZERO randomness. ZERO fabricated metrics. Every label is grounded
 * in either:
 *   (a) a hard threshold (e.g. support_count >= threshold), or
 *   (b) a percentage of team_size (e.g. accepted/team).
 */

import { getProposalThreshold } from "@/domain/proposalLifecycle";

export type SupportStrength = "apoyo_inicial" | "creciendo" | "fuerte" | "masivo";
export type CoalitionMomentum = "temprana" | "estable" | "en_crecimiento";
export type ProposalReadiness = "lejana" | "acercandose" | "alcanzada" | "movilizando";

export function deriveSupportStrength(args: {
  supportCount: number;
  threshold: number;
  teamSize: number;
}): SupportStrength {
  const { supportCount, threshold, teamSize } = args;
  if (supportCount <= 0) return "apoyo_inicial";
  if (supportCount >= threshold * 2) return "masivo";
  if (supportCount >= threshold) return "fuerte";
  if (supportCount >= Math.max(1, Math.floor(teamSize * 0.1))) return "creciendo";
  return "apoyo_inicial";
}

export function deriveCoalitionMomentum(args: {
  acceptedCollaboratorCount: number;
  pendingCollaboratorCount: number;
  teamSize: number;
}): CoalitionMomentum {
  const { acceptedCollaboratorCount, pendingCollaboratorCount, teamSize } = args;
  if (teamSize <= 0) return "temprana";
  const ratio = acceptedCollaboratorCount / teamSize;
  if (ratio >= 0.5) return "estable";
  if (ratio > 0 || pendingCollaboratorCount > 0) return "en_crecimiento";
  return "temprana";
}

export function deriveProposalReadiness(args: {
  status: "pending" | "active" | "resolved" | "rejected";
  supportCount: number;
  threshold: number;
  acceptedCollaboratorCount: number;
}): ProposalReadiness {
  if (args.status === "active") return "movilizando";
  if (args.status === "resolved" || args.status === "rejected") return "alcanzada";
  if (args.supportCount >= args.threshold) {
    return args.acceptedCollaboratorCount > 0 ? "movilizando" : "alcanzada";
  }
  const ratio = args.supportCount / Math.max(1, args.threshold);
  if (ratio >= 0.66) return "acercandose";
  return "lejana";
}

export function deriveReadinessProgress(args: { supportCount: number; teamSize: number }): {
  progress: number;
  threshold: number;
  remaining: number;
} {
  const threshold = getProposalThreshold(args.teamSize);
  const progress = args.supportCount >= threshold ? 1 : args.supportCount / threshold;
  return {
    progress,
    threshold,
    remaining: Math.max(0, threshold - args.supportCount),
  };
}

/**
 * Spanish label pairs keyed off derived states. Reused by Hero, feed cards,
 * and Conversation header.
 */
export const RELATIONSHIP_COPY: Record<
  SupportStrength | CoalitionMomentum | ProposalReadiness,
  { label: string; short: string }
> = {
  apoyo_inicial: { label: "Apoyo inicial", short: "Apoyo inicial" },
  creciendo: { label: "Creciendo", short: "Creciendo" },
  fuerte: { label: "Apoyo fuerte", short: "Fuerte" },
  masivo: { label: "Apoyo masivo", short: "Masivo" },
  temprana: { label: "Coalición temprana", short: "Temprana" },
  estable: { label: "Coalición establecida", short: "Estable" },
  en_crecimiento: { label: "Coalición en crecimiento", short: "En crecimiento" },
  lejana: { label: "Aún lejana", short: "Lejana" },
  acercandose: { label: "Acércandose al umbral", short: "Acércandose" },
  alcanzada: { label: "Umbral alcanzado", short: "Alcanzada" },
  movilizando: { label: "Movilizando", short: "Movilizando" },
};
