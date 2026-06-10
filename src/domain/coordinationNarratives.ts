import type { RelatedTerritorialActivity } from "./nearbyCoordination";
import type {
  CoalitionProximity,
  NeighboringDistrictAwareness,
  TemporalContinuity,
} from "./civicPresence";
import type {
  AdjacentCoalitionEmergence,
  NeighboringMissionContinuity,
} from "./nearbyCoordination";

export type CoordinationNarrative = {
  category:
    | "nearby_activity"
    | "coalition_proximity"
    | "temporal_pattern"
    | "territorial_awareness"
    | "coordination_signal";
  message: string;
  priority: number;
};

export function buildNearbyActivityNarrative(
  related: RelatedTerritorialActivity,
): CoordinationNarrative | null {
  if (related.activityCount === 0) return null;

  let message: string;
  if (related.recentActivity && related.coordinationSignal) {
    message = "Distritos vecinos mantienen actividad y comienzan a coordinarse entre sí.";
  } else if (related.recentActivity) {
    message = "Hay movimiento en distritos vecinos. La actividad territorial se extiende.";
  } else {
    message = "Distritos cercanos tienen actividad registrada, aunque no reciente.";
  }

  return {
    category: "nearby_activity",
    message,
    priority: related.recentActivity ? 2 : 1,
  };
}

export function buildCoalitionProximityNarrative(
  proximity: CoalitionProximity,
): CoordinationNarrative | null {
  if (proximity.nearbyCoalitions === 0) return null;

  let message: string;
  if (proximity.closestCoalitionDistance === "near") {
    message = "Hay coaliciones activas en distritos muy cercanos. La colaboración está cerca.";
  } else if (proximity.closestCoalitionDistance === "moderate") {
    message = "Coaliciones vecinas están organizándose. El territorio se articula.";
  } else {
    message = "Existen coaliciones en la zona, aunque dispersas en el territorio.";
  }

  return {
    category: "coalition_proximity",
    message,
    priority: proximity.nearbyCoalitions >= 2 ? 2 : 1,
  };
}

export function buildTemporalContinuityNarrative(
  continuity: TemporalContinuity,
): CoordinationNarrative | null {
  let message: string;

  switch (continuity.pattern) {
    case "continuous":
      message = "La actividad en este territorio se mantiene en el tiempo. Hay continuidad cívica.";
      break;
    case "intermittent":
      message = "La actividad tiene pausas, pero reaparece. El territorio retoma su movimiento.";
      break;
    case "resurging":
      message = "Después de un periodo sin actividad, el movimiento vuelve a este territorio.";
      break;
    case "first_steps":
      return null;
    default:
      return null;
  }

  return {
    category: "temporal_pattern",
    message,
    priority: continuity.pattern === "continuous" ? 2 : 1,
  };
}

export function buildNeighboringAwarenessNarrative(
  awareness: NeighboringDistrictAwareness,
): CoordinationNarrative | null {
  if (awareness.totalNeighbors === 0) return null;

  let message: string;
  if (awareness.neighborActivityRatio >= 0.5) {
    message = `La mayoría de los distritos vecinos tienen actividad. El movimiento abarca el territorio.`;
  } else if (awareness.activeNeighbors > 0) {
    message = `${awareness.activeNeighbors} de ${awareness.totalNeighbors} distritos vecinos están activos.`;
  } else {
    message = "Ningún distrito vecino tiene actividad registrada aún.";
  }

  return {
    category: "territorial_awareness",
    message,
    priority: awareness.activeNeighbors > 0 ? 1 : 0,
  };
}

export function buildAdjacentCoalitionNarrative(
  emergence: AdjacentCoalitionEmergence,
): CoordinationNarrative | null {
  if (!emergence.hasAdjacentCoalitions) return null;

  const message =
    emergence.emergingCoalitions === 1
      ? "Un distrito vecino está formando una coalición. La organización se expande."
      : `${emergence.emergingCoalitions} distritos vecinos están formando coaliciones. El territorio se organiza.`;

  return {
    category: "coordination_signal",
    message,
    priority: emergence.emergingCoalitions >= 2 ? 2 : 1,
  };
}

export function buildMissionContinuityNarrative(
  continuity: NeighboringMissionContinuity,
): CoordinationNarrative | null {
  if (!continuity.hasContinuity) return null;

  let message: string;
  if (continuity.corridorForming) {
    message =
      "Las misiones se extienden a través de distritos vecinos. Se forma un corredor cívico.";
  } else {
    message = "Misiones activas en distritos vecinos mantienen continuidad territorial.";
  }

  return {
    category: "coordination_signal",
    message,
    priority: continuity.corridorForming ? 3 : 2,
  };
}

export function deriveCoordinationNarratives(
  related: RelatedTerritorialActivity,
  proximity: CoalitionProximity,
  continuity: TemporalContinuity,
  awareness: NeighboringDistrictAwareness,
  emergence: AdjacentCoalitionEmergence,
  missionContinuity: NeighboringMissionContinuity,
): CoordinationNarrative[] {
  const narratives: CoordinationNarrative[] = [];

  const builders = [
    () => buildNearbyActivityNarrative(related),
    () => buildCoalitionProximityNarrative(proximity),
    () => buildTemporalContinuityNarrative(continuity),
    () => buildNeighboringAwarenessNarrative(awareness),
    () => buildAdjacentCoalitionNarrative(emergence),
    () => buildMissionContinuityNarrative(missionContinuity),
  ];

  for (const build of builders) {
    const n = build();
    if (n) narratives.push(n);
  }

  return narratives.sort((a, b) => b.priority - a.priority);
}
