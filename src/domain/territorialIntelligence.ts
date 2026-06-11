import type {
  TerritorialImpactSummary,
  MovementDirection,
  DistrictActivityClass,
} from "./territoryAggregations";
import type { AdjacencyMap, ContinuityStatus, SpreadLevel } from "./spatialRelationships";
import type { InitiativeEvent } from "./initiativeEventCatalog";

// ─── Spatial narrative types ─────────────────────────────────────────────

export type SpatialContext = {
  districtSlug: string;
  adjacencyMap: AdjacencyMap;
  activeSlugs: string[];
  dormantSlugs: string[];
  contiguityStatus?: ContinuityStatus;
  spreadLevel?: SpreadLevel;
  isIsolated?: boolean;
  convergenceZoneSize?: number;
  hasReactivationPotential?: boolean;
  neighborCount?: number;
  activeNeighborCount?: number;
};

export type SpatialNarrativeSignal =
  | "neighboring_activity"
  | "isolated_persistence"
  | "convergence_zone"
  | "corridor_formation"
  | "reactivation_potential"
  | "territorial_bridge"
  | "fragmented_activity"
  | "quiet_neighborhood";

// ─── Spatial narrative derivation ────────────────────────────────────────

export function deriveSpatialSignals(ctx: SpatialContext): SpatialNarrativeSignal[] {
  const signals: SpatialNarrativeSignal[] = [];

  if (ctx.activeNeighborCount != null && ctx.activeNeighborCount > 0) {
    signals.push("neighboring_activity");
    if (ctx.convergenceZoneSize != null && ctx.convergenceZoneSize >= 3) {
      if (ctx.activeNeighborCount >= 2) {
        signals.push("corridor_formation");
      }
      signals.push("convergence_zone");
    }
  }

  if (ctx.isIsolated && ctx.activeSlugs.length > 1) {
    signals.push("isolated_persistence");
  }

  if (ctx.hasReactivationPotential) {
    signals.push("reactivation_potential");
  }

  if (ctx.contiguityStatus === "fragmented") {
    signals.push("fragmented_activity");
  }

  if ((ctx.neighborCount ?? 0) > 0 && (ctx.activeNeighborCount ?? 0) === 0) {
    signals.push("quiet_neighborhood");
  }

  return signals;
}

export function buildSpatialNarrative(signals: SpatialNarrativeSignal[]): string | null {
  if (signals.length === 0) return null;

  const prioritized = [
    signals.includes("corridor_formation") && "corridor_formation",
    signals.includes("convergence_zone") && "convergence_zone",
    signals.includes("neighboring_activity") && "neighboring_activity",
    signals.includes("isolated_persistence") && "isolated_persistence",
    signals.includes("reactivation_potential") && "reactivation_potential",
    signals.includes("fragmented_activity") && "fragmented_activity",
    signals.includes("quiet_neighborhood") && "quiet_neighborhood",
  ].filter(Boolean) as SpatialNarrativeSignal[];

  if (prioritized.length === 0) return null;

  const primary = prioritized[0];

  switch (primary) {
    case "corridor_formation":
      return "Distritos cercanos están en movimiento. Parece formarse un corredor cívico en el territorio.";
    case "convergence_zone":
      return "Varios distritos vecinos tienen actividad. El movimiento converge en esta zona.";
    case "neighboring_activity":
      return "Hay actividad en distritos vecinos. El movimiento se extiende por el territorio.";
    case "isolated_persistence":
      return "Este distrito sostiene su actividad sin apoyo de territorios vecinos. Es un foco independiente.";
    case "reactivation_potential":
      return "Distritos vecinos en silencio podrían retomar actividad. El movimiento puede expandirse.";
    case "fragmented_activity":
      return "La actividad en la zona se da en núcleos separados, sin continuidad territorial.";
    case "quiet_neighborhood":
      return "Los distritos vecinos están en silencio. La actividad se concentra aquí.";
    default:
      return null;
  }
}

// ─── Vitality score (0–10) ──────────────────────────────────────────────

export function computeVitalityScore(summary: TerritorialImpactSummary): number {
  let score = 0;

  if (summary.lastActivityAt) {
    const daysSince = daysAgo(summary.lastActivityAt);
    if (daysSince < 7) score += 3;
    else if (daysSince < 30) score += 2;
    else if (daysSince < 90) score += 1;
  }

  if (
    summary.activeProposalCount > 0 &&
    summary.recentCompletionCount &&
    summary.recentCompletionCount > 0
  ) {
    score += 2;
  } else if (summary.activeProposalCount > 0 || summary.missionCount > 0) {
    score += 1;
  }
  if (summary.completedMissionCount > 0) score += 1;

  if (summary.uniqueSupporterCount > 0 || summary.acceptedCollaboratorCount > 0) score += 1;
  if (summary.missionCount > 0 && summary.proposalCount > 0) score += 1;

  const completedCycles = summary.completedMissionCount;
  if (completedCycles > 0) score += 1;
  if (summary.proposalCount > 0 && completedCycles > 0) score += 1;

  return Math.min(10, score);
}

// ─── Activity level classification ──────────────────────────────────────

export type TerritorialActivityLevel =
  | "dormant"
  | "fragmented"
  | "reactivating"
  | "emerging"
  | "organizing"
  | "active"
  | "resilient";

export function classifyTerritorialVitality(
  summary: TerritorialImpactSummary,
  existingClass: DistrictActivityClass,
): TerritorialActivityLevel {
  const total = summary.missionCount + summary.proposalCount;
  const conversionProxy = total > 0 ? summary.completedMissionCount / Math.max(1, total) : 0;

  // Reactivating: dormant district with recent new proposals (check before dormant)
  if (
    total > 0 &&
    summary.lastActivityAt &&
    summary.recentProposalCount &&
    summary.recentProposalCount > 0
  ) {
    const daysSince = daysAgo(summary.lastActivityAt);
    if (daysSince > 60 && summary.activeProposalCount === 0) {
      return "reactivating";
    }
  }

  // Dormant: past activity, nothing recent, no active proposals
  if (total > 0 && summary.lastActivityAt) {
    const daysSince = daysAgo(summary.lastActivityAt);
    if (daysSince > 60 && summary.activeProposalCount === 0) {
      return "dormant";
    }
  }

  // Fragmented: multiple proposals/missions with very low conversion
  if (total >= 3 && conversionProxy < 0.2) {
    return "fragmented";
  }

  // Score-based classification with continuity adjustment
  const score = computeVitalityScore(summary);

  // Low-score districts
  if (score <= 2) return "emerging";
  if (score <= 4) {
    // If there is any conversion signal, call it "organizing" not "emerging"
    if (conversionProxy > 0) return "organizing";
    return "emerging";
  }
  if (score <= 7) {
    if (conversionProxy >= 0.3) return "active";
    return "organizing";
  }
  return "resilient";
}

// ─── Coalition heuristics (10E.4) ──────────────────────────────────────

export type CoalitionDensity = "none" | "forming" | "emerging" | "consolidated";

export function classifyCoalitionDensity(summary: TerritorialImpactSummary): CoalitionDensity {
  const supporters = summary.uniqueSupporterCount;
  const collaborators = summary.acceptedCollaboratorCount;

  if (collaborators >= 3) return "consolidated";
  if (collaborators >= 1) return "emerging";
  if (supporters >= 5) return "forming";
  return "none";
}

export type RecurringSupportPattern = "none" | "some" | "strong";

export function classifyRecurringSupport(
  summary: TerritorialImpactSummary,
): RecurringSupportPattern {
  const total = summary.proposalCount + summary.missionCount;
  if (total === 0 || summary.uniqueSupporterCount === 0) return "none";
  // If supporters outnumber initiatives, some people support multiple things
  const supportRatio = summary.uniqueSupporterCount / total;
  if (supportRatio >= 2) return "strong";
  if (supportRatio > 1) return "some";
  return "none";
}

export type OrganizerContinuityLevel = "none" | "early" | "established";

export function classifyOrganizerContinuity(
  summary: TerritorialImpactSummary,
): OrganizerContinuityLevel {
  if (summary.missionCount === 0 && summary.proposalCount === 0) return "none";
  // Ratio of completed cycles to total initiatives
  const total = summary.missionCount + summary.proposalCount;
  const completionRate = total > 0 ? summary.completedMissionCount / total : 0;
  if (completionRate >= 0.5 && summary.completedMissionCount >= 2) return "established";
  if (completionRate > 0) return "early";
  return "none";
}

export type InitiativeReinforcement = "none" | "some" | "converging";

export function classifyInitiativeReinforcement(
  summary: TerritorialImpactSummary,
): InitiativeReinforcement {
  const total = summary.proposalCount + summary.missionCount;
  if (total === 0) return "none";
  // When supporters and collaborators both exist, initiatives reinforce each other
  if (summary.uniqueSupporterCount > 0 && summary.acceptedCollaboratorCount > 0 && total >= 2) {
    return "converging";
  }
  if (total >= 2) return "some";
  return "none";
}

// ─── Dormancy detection ─────────────────────────────────────────────────

export type DormancyStatus = "active" | "quiet" | "dormant" | "reviving";

export function detectDormancy(summary: TerritorialImpactSummary): DormancyStatus {
  const total = summary.missionCount + summary.proposalCount;
  if (total === 0) return "quiet";

  if (!summary.lastActivityAt) return "active";

  const daysSince = daysAgo(summary.lastActivityAt);

  if (daysSince <= 30) return "active";
  if (daysSince <= 60 && summary.activeProposalCount > 0) return "active";
  if (daysSince <= 60) return "quiet";

  if (summary.activeProposalCount > 0) return "quiet";
  if (summary.recentProposalCount && summary.recentProposalCount > 0) return "reviving";

  return "dormant";
}

// ─── Initiative persistence ─────────────────────────────────────────────

export type InitiativePersistence = "fragile" | "forming" | "persistent" | "established";

export function classifyInitiativePersistence(
  summary: TerritorialImpactSummary,
): InitiativePersistence {
  if (summary.proposalCount === 0 && summary.missionCount === 0) return "forming";

  const hasConversions = summary.completedMissionCount > 0;
  const hasProposals = summary.proposalCount > 0;

  if (!hasConversions && hasProposals && summary.proposalCount >= 3) return "fragile";
  if (!hasConversions) return "forming";
  if (summary.completedMissionCount >= 3) return "established";
  return "persistent";
}

// ─── Full vitality model ────────────────────────────────────────────────

export type DistrictVitality = {
  score: number;
  activityLevel: TerritorialActivityLevel;
  movementDirection: MovementDirection;
  coalitionDensity: CoalitionDensity;
  dormantStatus: DormancyStatus;
  initiativePersistence: InitiativePersistence;
  recurringSupport: RecurringSupportPattern;
  organizerContinuity: OrganizerContinuityLevel;
  initiativeReinforcement: InitiativeReinforcement;
  activeInitiatives: number;
  dormantDays: number | null;
  narrative: string;
};

export function deriveDistrictVitality(
  summary: TerritorialImpactSummary,
  existingClass: DistrictActivityClass,
  existingDirection: MovementDirection,
  spatialContext?: SpatialContext,
): DistrictVitality {
  const activityLevel = classifyTerritorialVitality(summary, existingClass);
  const coalitionDensity = classifyCoalitionDensity(summary);
  const dormantStatus = detectDormancy(summary);
  const initiativePersistence = classifyInitiativePersistence(summary);
  const recurringSupport = classifyRecurringSupport(summary);
  const organizerContinuity = classifyOrganizerContinuity(summary);
  const initiativeReinforcement = classifyInitiativeReinforcement(summary);

  const dormantDays = summary.lastActivityAt ? daysAgo(summary.lastActivityAt) : null;

  const activeInitiatives =
    summary.activeProposalCount + summary.missionCount - summary.completedMissionCount;

  const baseNarrative = buildVitalityNarrative({
    activityLevel,
    coalitionDensity,
    dormantStatus,
    initiativePersistence,
    movementDirection: existingDirection,
    activeInitiatives: Math.max(0, activeInitiatives),
    recurringSupport,
    organizerContinuity,
    initiativeReinforcement,
  });

  const spatialNarrative = spatialContext
    ? buildSpatialNarrative(deriveSpatialSignals(spatialContext))
    : null;

  const narrative = spatialNarrative ? `${baseNarrative} ${spatialNarrative}` : baseNarrative;

  return {
    score: computeVitalityScore(summary),
    activityLevel,
    movementDirection: existingDirection,
    coalitionDensity,
    dormantStatus,
    initiativePersistence,
    recurringSupport,
    organizerContinuity,
    initiativeReinforcement,
    activeInitiatives: Math.max(0, activeInitiatives),
    dormantDays,
    narrative,
  };
}

// ─── Narrative engine (10E.5) ───────────────────────────────────────────

type NarrativeInput = {
  activityLevel: TerritorialActivityLevel;
  coalitionDensity: CoalitionDensity;
  dormantStatus: DormancyStatus;
  initiativePersistence: InitiativePersistence;
  movementDirection: MovementDirection;
  activeInitiatives: number;
  recurringSupport: RecurringSupportPattern;
  organizerContinuity: OrganizerContinuityLevel;
  initiativeReinforcement: InitiativeReinforcement;
};

export function buildVitalityNarrative(input: NarrativeInput): string {
  if (input.dormantStatus === "dormant") {
    if (input.organizerContinuity !== "none") {
      return "Este distrito tuvo organización en el pasado, pero hoy está en silencio. La experiencia que se construyó puede despertar de nuevo.";
    }
    return "Este distrito tuvo actividad anterior, pero hace tiempo que no se registran movimientos. Las semillas que se plantaron esperan nuevas manos.";
  }

  if (input.dormantStatus === "quiet") {
    if (input.initiativePersistence === "fragile") {
      return "Hay iniciativas registradas, pero ninguna ha completado su ciclo todavía. La comunidad está encontrando su rumbo.";
    }
    if (input.organizerContinuity === "established") {
      return "El distrito está en calma, pero su historial muestra que la organización es posible cuando la comunidad se moviliza.";
    }
    return "El distrito está en calma. Las iniciativas anteriores dejaron experiencia.";
  }

  if (input.dormantStatus === "reviving") {
    if (input.initiativeReinforcement !== "none") {
      return "El distrito vuelve a moverse y las iniciativas empiezan a conectarse entre sí. Hay señales de un nuevo ciclo.";
    }
    return "Después de un tiempo de calma, el distrito vuelve a moverse. Nuevas iniciativas están tomando forma.";
  }

  if (input.activityLevel === "reactivating") {
    return "Después de un tiempo de calma, el distrito vuelve a moverse. Nuevas iniciativas están retomando el camino.";
  }

  if (input.activityLevel === "emerging") {
    if (input.coalitionDensity !== "none") {
      return "Las primeras personas están colaborando en las iniciativas. Este distrito empieza a organizarse.";
    }
    if (input.recurringSupport !== "none") {
      return "Aparecen las primeras iniciativas y hay personas que ya apoyan más de una. El interés crece.";
    }
    return "Aparecen las primeras iniciativas. La semilla cívica está germinando.";
  }

  if (input.activityLevel === "fragmented") {
    if (input.initiativeReinforcement !== "none") {
      return "Hay varias iniciativas, pero pocas logran completar su ciclo. Sin embargo, las personas están conectando unas con otras.";
    }
    return "Existen iniciativas dispersas que aún no encuentran continuidad. Haría falta apoyo para que algunas florezcan.";
  }

  if (input.activityLevel === "organizing") {
    if (input.initiativePersistence === "fragile") {
      return "Hay ideas y propuestas, pero ninguna ha logrado consolidarse aún. Se necesita apoyo para que florezcan.";
    }
    if (input.coalitionDensity === "consolidated") {
      return "Hay un grupo de personas organizándose en torno a varias iniciativas. La colaboración está tomando forma.";
    }
    if (input.recurringSupport === "strong") {
      return "Varias iniciativas están en marcha y hay personas que apoyan múltiples propuestas. La red crece.";
    }
    return "El distrito se está organizando. Varias iniciativas están tomando forma al mismo tiempo.";
  }

  if (input.activityLevel === "active") {
    if (input.coalitionDensity === "consolidated") {
      return "Hay una red de personas colaborando en múltiples iniciativas. La organización ciudadana es sólida y activa.";
    }
    if (input.initiativePersistence === "established") {
      return "Este distrito tiene un historial comprobado de propuestas que se convierten en acción. La comunidad sabe organizarse.";
    }
    if (input.recurringSupport === "strong") {
      return "El distrito está en movimiento. Las mismas personas aparecen en diferentes iniciativas, lo que habla de una comunidad que se reconoce.";
    }
    return "El distrito está en movimiento. Hay propuestas activas y personas participando.";
  }

  if (input.activityLevel === "resilient") {
    if (input.activeInitiatives >= 5) {
      return "Es un distrito con memoria cívica sólida. Múltiples iniciativas conviven y se apoyan entre sí, generando cambio real en el territorio.";
    }
    if (input.organizerContinuity === "established") {
      return "La comunidad ha demostrado capacidad de organización a lo largo del tiempo. Hay confianza y experiencia cívica acumulada.";
    }
    return "La comunidad ha demostrado su capacidad de organización a lo largo del tiempo. Hay confianza y experiencia cívica.";
  }

  return "La comunidad está definiendo su camino.";
}

// ─── Event coherence: InitiativeEvent[] → TerritorialImpactSummary ──

/**
 * Canonical projection: InitiativeEvent[] → TerritorialImpactSummary.
 */
export function summarizeInitiativeEvents(
  events: InitiativeEvent[],
): Partial<TerritorialImpactSummary> {
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  let lastActivityAt: string | null = null;
  let recentProposalCount = 0;
  const uniqueSupporters = new Set<string>();
  const uniqueCollaborators = new Set<string>();
  const proposals = new Set<string>();
  const missions = new Set<string>();

  for (const ev of events) {
    if (!lastActivityAt || ev.timestamp > lastActivityAt) {
      lastActivityAt = ev.timestamp;
    }

    const age = now - new Date(ev.timestamp).getTime();
    const isRecent = age < thirtyDays;

    switch (ev.type) {
      case "ProposalCreated":
        proposals.add(ev.proposalId);
        if (isRecent) recentProposalCount++;
        break;
      case "ProposalSupported":
        proposals.add(ev.proposalId);
        if (ev.supporterId) uniqueSupporters.add(ev.supporterId);
        break;
      case "ProposalUnsuspended":
        if (ev.supporterId) uniqueSupporters.add(ev.supporterId);
        break;
      case "ProposalCommentAdded":
        proposals.add(ev.proposalId);
        break;
      case "ProposalCollaboratorJoined":
        proposals.add(ev.proposalId);
        if (ev.collaboratorId) uniqueCollaborators.add(ev.collaboratorId);
        break;
      case "ProposalThresholdReached":
        proposals.add(ev.proposalId);
        break;
      case "ProposalConvertedToMission":
        proposals.add(ev.proposalId);
        if (ev.missionId) missions.add(ev.missionId);
        break;
      case "ProposalReopened":
        proposals.add(ev.proposalId);
        break;
      case "ProposalLocked":
        proposals.add(ev.proposalId);
        break;
      case "MissionJoined":
        missions.add(ev.missionId);
        break;
      case "EvidenceSubmitted":
        missions.add(ev.missionId);
        break;
      case "EvidenceVerified":
        missions.add(ev.missionId);
        break;
      case "EvidenceRejected":
        missions.add(ev.missionId);
        break;
      case "EvidenceFlagged":
        missions.add(ev.missionId);
        break;
      case "MissionStateUpdated":
        missions.add(ev.missionId);
        break;
      case "MissionCompleted":
        missions.add(ev.missionId);
        break;
      case "DistrictFirstMovement":
      case "CommunityTrustChanged":
      case "CommunityProfileMilestone":
        break;
    }
  }

  return {
    missionCount: missions.size,
    proposalCount: proposals.size,
    uniqueSupporterCount: uniqueSupporters.size,
    acceptedCollaboratorCount: uniqueCollaborators.size,
    lastActivityAt,
    recentProposalCount: recentProposalCount > 0 ? recentProposalCount : undefined,
    recentCompletionCount: undefined,
    activeProposalCount: undefined,
    completedMissionCount: undefined,
  };
}

// ─── Utility ────────────────────────────────────────────────────────────

function daysAgo(isoString: string): number {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}
