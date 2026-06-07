/**
 * Territory aggregations — pure, deterministic derivations.
 *
 * The district page presents a *civic memory* of a place, not a leaderboard.
 * Every label and number comes from real aggregated counts. No fake
 * momentum, no "trending now", no ranking against other districts.
 *
 * The "truthful empty state" is the most important output of this module:
 * if a district has zero activity, the user sees the empty state — not
 * placeholder metrics.
 */

export type DistrictActivityClass =
  | "empty"
  | "early"
  | "active"
  | "established";

export type TerritorialImpactSummary = {
  missionCount: number;
  completedMissionCount: number;
  proposalCount: number;
  activeProposalCount: number;
  uniqueSupporterCount: number;
  acceptedCollaboratorCount: number;
  /** Most recent timestamp of any civic action in this district. */
  lastActivityAt: string | null;
};

/**
 * Classify a district's civic activity into 4 honest bands.
 * Thresholds are derived from the count magnitudes, not from a percentile
 * (i.e. "you're active" is not a comparison with other districts).
 */
export function classifyDistrictActivity(
  summary: TerritorialImpactSummary,
): DistrictActivityClass {
  const total = summary.missionCount + summary.proposalCount;
  const live = summary.completedMissionCount + summary.activeProposalCount;
  if (total === 0) return "empty";
  if (live === 0) return "early";
  if (live >= 5) return "established";
  return "active";
}

export const DISTRICT_ACTIVITY_COPY: Record<
  DistrictActivityClass,
  { label: string; description: string; short: string }
> = {
  empty: {
    label: "Distrito sin rutas activas",
    description: "Todavía no hay propuestas ni misiones en este distrito. Sé quien inicie la primera.",
    short: "Sin actividad",
  },
  early: {
    label: "Primeras semillas",
    description: "Hay propuestas o misiones en el distrito, pero ninguna se ha concretado todavía. Es un momento para sumarte.",
    short: "Primeras semillas",
  },
  active: {
    label: "Caminando",
    description: "Hay propuestas y misiones en curso. La comunidad está organizando.",
    short: "Caminando",
  },
  established: {
    label: "Comunidad activa",
    description: "Múltiples propuestas y misiones en curso. Hay memoria cívica aquí.",
    short: "Comunidad activa",
  },
};

/**
 * How many "first movements" are still needed for a district?
 * Returns 0 when the district already has activity, 1 when truly empty.
 * Used by the empty-state CTA: "Sé quien inicie la primera."
 */
export function missingFirstMovements(summary: TerritorialImpactSummary): number {
  const total = summary.missionCount + summary.proposalCount;
  return total === 0 ? 1 : 0;
}

/**
 * Format a territorial impact line for the district hero.
 * Returns an honest, label-shaped summary — never a percentage.
 * Example outputs:
 *   "3 misiones · 2 en curso"
 *   "2 propuestas · 8 apoyos"
 *   "Sin actividad aún"
 */
export function formatTerritorialImpact(
  summary: TerritorialImpactSummary,
): string {
  const total = summary.missionCount + summary.proposalCount;
  if (total === 0) return "Sin actividad aún";

  const parts: string[] = [];
  if (summary.missionCount > 0) {
    parts.push(
      `${summary.missionCount} ${summary.missionCount === 1 ? "misión" : "misiones"}`,
    );
  }
  if (summary.proposalCount > 0) {
    parts.push(
      `${summary.proposalCount} ${summary.proposalCount === 1 ? "propuesta" : "propuestas"}`,
    );
  }
  return parts.join(" · ");
}

/**
 * Derive a single-word civic memory line for the narrative section.
 * Returns null when there's not enough signal to say anything true.
 */
export function deriveCivicMemoryLine(
  summary: TerritorialImpactSummary,
): string | null {
  const cls = classifyDistrictActivity(summary);
  if (cls === "empty") return null;
  if (cls === "early") {
    return "Hay semillas recién plantadas. Pronto sabremos si florecen.";
  }
  if (cls === "active") {
    return "La comunidad está caminando. Algunas rutas están tomando forma.";
  }
  return "Hay memoria cívica aquí. La comunidad ya recorrió este camino antes.";
}

/**
 * Determine if a district is ready for the "first movement" empty state.
 * Returns true only when there is literally nothing in the district.
 */
export function isFirstMovementNeeded(
  summary: TerritorialImpactSummary,
): boolean {
  return (
    summary.missionCount === 0 &&
    summary.proposalCount === 0
  );
}
