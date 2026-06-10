/**
 * Activity Feed Resolver — pure transformation from TerritorialEvent[] to DistrictPulse.
 *
 * This is the ONLY place that assembles DistrictPulse objects.
 * It is a pure function with zero side effects (no DB, no RPC, no hooks).
 *
 * Data source:
 *   TerritorialEvent[] — already normalized by adapters in territorialEvent.ts
 *
 * Design principles:
 *   - Pure: same input → same output, no async, no I/O
 *   - Reuses existing domain types (ActivitySignal, DistrictPulse, TerritorialEvent)
 *   - Works with any TerritorialEvent source (district activity, civic events, lifecycle)
 *   - No new signal types — maps TerritorialEventType → ActivitySignalType
 *   - Rich messages: every signal names the actor and the initiative
 */

import type { DistrictPulse, ActivitySignal, ActivitySignalType } from "@/domain/activity";
import type { TerritorialEvent } from "@/domain/territorialEvent";

const SIGNAL_TYPE_MAP: Partial<Record<string, ActivitySignalType>> = {
  "mission.joined": "member_joined",
  "mission.completed": "initiative_completed",
  "mission.evidence_submitted": "initiative_mobilizing",
  "mission.evidence_verified": "initiative_mobilizing",
  "proposal.supported": "initiative_gained_support",
  "proposal.created": "initiative_forming",
  "proposal.threshold_reached": "initiative_mobilizing",
  "proposal.converted_to_mission": "initiative_mobilizing",
  "proposal.collaborator_joined": "initiative_gained_support",
  "district.first_movement": "district_awakening",
};

function actorName(event: TerritorialEvent): string {
  return event.actor.firstName?.trim() || event.actor.username?.trim() || "";
}

function buildMessage(event: TerritorialEvent): string {
  const name = actorName(event);
  const entity = event.entityTitle?.trim();
  const hasName = name.length > 0;
  const hasEntity = !!entity;

  switch (event.type) {
    case "mission.joined":
      if (hasName && hasEntity) return `${name} se sumó a ${entity}`;
      if (hasEntity) return `Se sumaron a ${entity}`;
      if (hasName) return `${name} se sumó a una misión`;
      return "Alguien se sumó a una misión";

    case "mission.completed":
      if (hasName && hasEntity) return `${name} completó ${entity}`;
      if (hasEntity) return `Completaron ${entity}`;
      if (hasName) return `${name} completó una misión`;
      return "Completaron una misión";

    case "mission.evidence_submitted":
      if (hasName && hasEntity) return `${name} envió evidencia de ${entity}`;
      if (hasEntity) return `Enviaron evidencia de ${entity}`;
      if (hasName) return `${name} envió evidencia`;
      return "Enviaron evidencia";

    case "mission.evidence_verified":
      if (hasEntity) return `Verificaron evidencia de ${entity}`;
      return "Verificaron evidencia";

    case "proposal.supported":
      if (hasName && hasEntity) return `${name} apoyó ${entity}`;
      if (hasEntity) return `Apoyaron ${entity}`;
      if (hasName) return `${name} apoyó una propuesta`;
      return "Apoyaron una propuesta";

    case "proposal.created":
      if (hasName && hasEntity) return `${name} creó ${entity}`;
      if (hasEntity) return `Crearon ${entity}`;
      if (hasName) return `${name} creó una propuesta`;
      return "Crearon una propuesta";

    case "proposal.collaborator_joined":
      if (hasName && hasEntity) return `${name} co-organiza ${entity}`;
      if (hasEntity) return `Se sumaron a co-organizar ${entity}`;
      if (hasName) return `${name} co-organiza una propuesta`;
      return "Alguien se sumó a co-organizar";

    case "proposal.threshold_reached":
      if (hasEntity) return `${entity} alcanzó el umbral de apoyo`;
      return "Una propuesta alcanzó el umbral de apoyo";

    case "proposal.converted_to_mission":
      if (hasEntity) return `${entity} se convirtió en misión`;
      return "Una propuesta se convirtió en misión";

    case "district.first_movement":
      return "Primer movimiento en el distrito";

    default:
      if (hasEntity) return `${entity} tiene actividad reciente`;
      return "Actividad reciente en el distrito";
  }
}

function eventToSignal(event: TerritorialEvent, districtSlug: string): ActivitySignal {
  const type = SIGNAL_TYPE_MAP[event.type] ?? "district_awakening";
  return {
    id: `pulse_${event.id}`,
    type,
    message: buildMessage(event),
    timestamp: event.createdAt,
    sourceType: event.entityType === "mission" ? "mission" : event.entityType === "proposal" ? "proposal" : "participation",
    sourceId: event.entityId,
    districtSlug,
    entityTitle: event.entityTitle ?? undefined,
  };
}

function computeVitalityScore(signalCount: number): number {
  if (signalCount === 0) return 0;
  if (signalCount <= 1) return 2;
  if (signalCount <= 3) return 5;
  if (signalCount <= 6) return 7;
  return 10;
}

function buildNarrative(
  signals: ActivitySignal[],
  events: TerritorialEvent[],
  districtName: string,
): string | null {
  if (signals.length === 0) return null;

  const completedSignal = signals.find((s) => s.type === "initiative_completed");
  if (completedSignal?.entityTitle) return `Completaron ${completedSignal.entityTitle}`;
  if (completedSignal) return "Completaron una misión";

  const joinCount = signals.filter((s) => s.type === "member_joined").length;
  if (joinCount >= 3) {
    const joinEntities = events
      .filter((e) => e.type === "mission.joined")
      .map((e) => e.entityTitle?.trim())
      .filter(Boolean) as string[];
    const unique = [...new Set(joinEntities)];
    if (unique.length === 1) return `${joinCount} personas se sumaron a ${unique[0]}`;
    return `${joinCount} personas se sumaron a iniciativas`;
  }

  const supportSignals = signals.filter((s) => s.type === "initiative_gained_support");
  const supportSignal = supportSignals[0];
  if (supportSignal?.entityTitle) return `${supportSignal.entityTitle} recibió apoyo`;
  if (supportSignals.length >= 2) return `${supportSignals.length} apoyos recibió una propuesta`;

  const joinSignal = signals.find((s) => s.type === "member_joined");
  if (joinSignal?.entityTitle) return `Sigue creciendo ${joinSignal.entityTitle}`;

  const mobilizingSignal = signals.find((s) => s.type === "initiative_mobilizing");
  if (mobilizingSignal?.entityTitle) return `${mobilizingSignal.entityTitle} avanza`;

  if (districtName) {
    if (signals.length <= 2) return `${districtName} está despertando`;
    return `${districtName} está en movimiento`;
  }
  return "El distrito está en movimiento";
}

export function buildDistrictPulse(
  events: TerritorialEvent[],
  districtSlug: string,
  districtName: string,
  vitalityOverride?: { score: number; narrative: string | null },
): DistrictPulse | null {
  if (!events || events.length === 0) return null;

  const signals: ActivitySignal[] = events
    .map((e) => eventToSignal(e, districtSlug))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const lastActivityAt = signals.length > 0 ? signals[0].timestamp : null;

  return {
    districtSlug,
    districtName,
    signals,
    vitalityScore: vitalityOverride?.score ?? computeVitalityScore(signals.length),
    lastActivityAt,
    narrative: vitalityOverride?.narrative ?? buildNarrative(signals, events, districtName),
  };
}

export const activityFeedResolver = {
  buildDistrictPulse,
};
