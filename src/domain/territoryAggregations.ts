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



export type DistrictActivityClass = "empty" | "early" | "active" | "established";

export type TerritorialImpactSummary = {
  missionCount: number;
  completedMissionCount: number;
  proposalCount: number;
  activeProposalCount: number;
  uniqueSupporterCount: number;
  acceptedCollaboratorCount: number;
  /** Most recent timestamp of any civic action in this district. */
  lastActivityAt: string | null;
  /** Proposals created in the last 30 days — used for momentum */
  recentProposalCount?: number;
  /** Missions completed in the last 30 days — used for momentum */
  recentCompletionCount?: number;
};

export type MovementDirection = "growing" | "stable" | "quiet" | "first_steps";

/** Key events that happened in this district (for storytelling). */
export type DistrictMilestone = {
  type: "first_proposal" | "first_mission" | "first_conversion" | "coalition_formed";
  label: string;
  date: string | null;
};

/**
 * Classify a district's civic activity into 4 honest bands.
 * Thresholds are derived from the count magnitudes, not from a percentile
 * (i.e. "you're active" is not a comparison with other districts).
 */
export function classifyDistrictActivity(summary: TerritorialImpactSummary): DistrictActivityClass {
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
    description:
      "Todavía no hay propuestas ni misiones en este distrito. Sé quien inicie la primera.",
    short: "Sin actividad",
  },
  early: {
    label: "Primeras semillas",
    description:
      "Hay propuestas o misiones en el distrito, pero ninguna se ha concretado todavía. Es un momento para sumarte.",
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
export function formatTerritorialImpact(summary: TerritorialImpactSummary): string {
  const total = summary.missionCount + summary.proposalCount;
  if (total === 0) return "Sin actividad aún";

  const parts: string[] = [];
  if (summary.missionCount > 0) {
    parts.push(`${summary.missionCount} ${summary.missionCount === 1 ? "misión" : "misiones"}`);
  }
  if (summary.proposalCount > 0) {
    parts.push(
      `${summary.proposalCount} ${summary.proposalCount === 1 ? "propuesta" : "propuestas"}`,
    );
  }
  return parts.join(" · ");
}

/**
 * Derive the direction of civic movement in the district.
 * Uses recent activity counts if available; falls back to total counts.
 */
export function deriveMovementDirection(
  summary: TerritorialImpactSummary,
): MovementDirection {
  const total = summary.missionCount + summary.proposalCount;
  if (total === 0) return "quiet";
  if (summary.activeProposalCount === 0 && summary.missionCount === 0) return "first_steps";

  const recent =
    (summary.recentProposalCount ?? 0) + (summary.recentCompletionCount ?? 0);
  if (recent >= 3) return "growing";
  if (recent >= 1) return "stable";
  return "quiet";
}

const MOVEMENT_NARRATIVE: Record<MovementDirection, string> = {
  growing: "El movimiento está creciendo. Nuevas iniciativas están tomando forma en el distrito.",
  stable: "La comunidad se mantiene activa. Hay un ritmo constante de participación.",
  quiet: "El territorio está en calma. Las iniciativas anteriores dejaron su semilla.",
  first_steps: "Se están dando los primeros pasos. Todo movimiento empieza con una propuesta.",
};

export function getMovementNarrative(direction: MovementDirection): string {
  return MOVEMENT_NARRATIVE[direction];
}

/**
 * Derive a contextual civic memory line for the narrative section.
 * Uses movement direction for richer storytelling.
 */
export function deriveCivicMemoryLine(summary: TerritorialImpactSummary): string | null {
  const cls = classifyDistrictActivity(summary);
  if (cls === "empty") return null;

  const direction = deriveMovementDirection(summary);

  if (cls === "early") {
    if (direction === "growing") {
      return "Las primeras semillas están germinando. Este distrito empieza a moverse.";
    }
    return "Hay semillas recién plantadas. Pronto sabremos si florecen.";
  }

  if (cls === "active") {
    if (direction === "growing") {
      return "El movimiento cobra fuerza. Más personas están participando cada semana.";
    }
    return "La comunidad está caminando. Algunas rutas están tomando forma.";
  }

  if (cls === "established") {
    if (direction === "growing") {
      return "Hay memoria cívica sólida. El distrito es un referente de organización ciudadana.";
    }
    return "Hay memoria cívica aquí. La comunidad ya recorrió este camino antes.";
  }

  return MOVEMENT_NARRATIVE[direction];
}

/**
 * Build a list of notable milestones for the district.
 * Returns empty array when there's no signal yet.
 */
export function deriveDistrictMilestones(
  summary: TerritorialImpactSummary,
  districtCreatedAt?: string | null,
): DistrictMilestone[] {
  const milestones: DistrictMilestone[] = [];

  if (summary.missionCount > 0 || summary.proposalCount > 0) {
    milestones.push({
      type: "first_proposal",
      label: "Primera iniciativa registrada",
      date: null,
    });
  }

  if (summary.completedMissionCount > 0) {
    milestones.push({
      type: "first_mission",
      label: `${summary.completedMissionCount} misión${summary.completedMissionCount !== 1 ? "es" : ""} completada${summary.completedMissionCount !== 1 ? "s" : ""}`,
      date: null,
    });
  }

  if (summary.acceptedCollaboratorCount > 0) {
    milestones.push({
      type: "coalition_formed",
      label: `${summary.acceptedCollaboratorCount} persona${summary.acceptedCollaboratorCount !== 1 ? "s" : ""} co-organizando iniciativas`,
      date: null,
    });
  }

  return milestones;
}

/**
 * Determine if a district is ready for the "first movement" empty state.
 * Returns true only when there is literally nothing in the district.
 */
export function isFirstMovementNeeded(summary: TerritorialImpactSummary): boolean {
  return summary.missionCount === 0 && summary.proposalCount === 0;
}


