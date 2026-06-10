/**
 * TerritorialEvent — Canonical civic event model.
 *
 * Phase 10C unified event shape. Every civic action (support, comment,
 * lifecycle transition, mission completion) normalizes to this shape.
 *
 * Three source systems produce events:
 *   - civic_events (profile timeline, realtime bridge)
 *   - proposal_lifecycle_events (proposal state machine)
 *   - get_district_recent_activity RPC (district feed)
 *
 * Adapters in this file convert each source type into TerritorialEvent
 * so consumers (feed, timeline, lifecycle timeline) share one pipeline.
 */

// ─── Canonical types ─────────────────────────────────────────────────────

export type TerritorialEventType =
  | "proposal.created"
  | "proposal.supported"
  | "proposal.unsupported"
  | "proposal.comment_added"
  | "proposal.collaborator_joined"
  | "proposal.threshold_reached"
  | "proposal.converted_to_mission"
  | "proposal.reopened"
  | "mission.joined"
  | "mission.completed"
  | "mission.evidence_submitted"
  | "mission.evidence_verified"
  | "district.first_movement"
  | "community.trust_changed"
  | "community.profile_milestone";

export type TerritorialEntityType =
  | "proposal"
  | "mission"
  | "comment"
  | "district"
  | "profile"
  | "evidence";

export type TerritorialActor = {
  id: string;
  username: string;
  firstName: string;
  avatarUrl: string | null;
};

export type TerritorialEvent = {
  id: string;
  type: TerritorialEventType;
  actor: TerritorialActor;
  entityType: TerritorialEntityType;
  entityId: string;
  entityTitle: string | null;
  districtId: string | null;
  region: "costa" | "sierra" | "selva" | null;
  createdAt: string;
  metadata: Record<string, unknown>;
};

// ─── UI copy map (replaces both CIVIC_EVENT_COPY and ACTIVITY_LABELS) ────

export type TerritorialEventIcon =
  | "support"
  | "comment"
  | "check"
  | "spark"
  | "people"
  | "flag"
  | "shield"
  | "activity";

export const TERRITORIAL_EVENT_COPY: Record<
  TerritorialEventType,
  { title: string; icon: TerritorialEventIcon }
> = {
  "proposal.created": { title: "Creó una propuesta", icon: "spark" },
  "proposal.supported": { title: "Apoyó una propuesta", icon: "support" },
  "proposal.unsupported": { title: "Retiró su apoyo", icon: "support" },
  "proposal.comment_added": { title: "Comentó en una propuesta", icon: "comment" },
  "proposal.collaborator_joined": { title: "Se sumó a co-organizar", icon: "people" },
  "proposal.threshold_reached": { title: "Cruzó el umbral de apoyo", icon: "spark" },
  "proposal.converted_to_mission": { title: "Convirtió en misión", icon: "check" },
  "proposal.reopened": { title: "Reabrió la propuesta", icon: "flag" },
  "mission.joined": { title: "Se sumó a una misión", icon: "people" },
  "mission.completed": { title: "Completó una misión", icon: "check" },
  "mission.evidence_submitted": { title: "Envió evidencia", icon: "comment" },
  "mission.evidence_verified": { title: "Evidencia verificada", icon: "shield" },
  "district.first_movement": { title: "Primer movimiento en el distrito", icon: "spark" },
  "community.trust_changed": { title: "Avanzó en confianza", icon: "shield" },
  "community.profile_milestone": { title: "Alcanzó un hito", icon: "spark" },
};

/** Short verb for inline feed items (e.g. "apoyó", "comentó", "completó"). */
export const TERRITORIAL_EVENT_VERB: Record<TerritorialEventType, string> = {
  "proposal.created": "creó",
  "proposal.supported": "apoyó",
  "proposal.unsupported": "retiró apoyo",
  "proposal.comment_added": "comentó",
  "proposal.collaborator_joined": "co-organiza",
  "proposal.threshold_reached": "alcanzó umbral",
  "proposal.converted_to_mission": "convirtió",
  "proposal.reopened": "reabrió",
  "mission.joined": "se sumó",
  "mission.completed": "completó",
  "mission.evidence_submitted": "envió evidencia",
  "mission.evidence_verified": "verificó evidencia",
  "district.first_movement": "inició movimiento",
  "community.trust_changed": "mejoró confianza",
  "community.profile_milestone": "nuevo hito",
};

// ─── Adapter: CivicProfileEvent → TerritorialEvent ──────────────────────

import type { CivicProfileEvent } from "@/services/civicEventsRepository";

export function civicEventToTerritorial(civic: CivicProfileEvent): TerritorialEvent {
  return {
    id: civic.id,
    type: civic.kind,
    actor: {
      id: "",
      username: "",
      firstName: "",
      avatarUrl: null,
    },
    entityType: civic.targetType,
    entityId: civic.targetId,
    entityTitle: (civic.payload?.entityTitle as string) ?? null,
    districtId: civic.districtId,
    region: null,
    createdAt: civic.occurredAt,
    metadata: civic.payload,
  };
}

// ─── Adapter: ProposalLifecycleEvent → TerritorialEvent ─────────────────

import type { ProposalLifecycleEvent } from "@/services/proposalConversionRepository";

const LIFECYCLE_TO_TERRITORIAL_TYPE: Record<string, TerritorialEventType> = {
  coalition_threshold_reached: "proposal.threshold_reached",
  organizer_confirmed: "proposal.collaborator_joined",
  mission_created: "proposal.converted_to_mission",
  proposal_locked: "proposal.reopened",
  proposal_reopened: "proposal.reopened",
};

export function lifecycleEventToTerritorial(
  lc: ProposalLifecycleEvent,
  proposalId: string,
): TerritorialEvent {
  const type = LIFECYCLE_TO_TERRITORIAL_TYPE[lc.eventType] ?? "proposal.threshold_reached";
  return {
    id: lc.id,
    type,
    actor: {
      id: "",
      username: lc.actorUsername,
      firstName: lc.actorFirstName,
      avatarUrl: lc.actorAvatarUrl,
    },
    entityType: "proposal",
    entityId: proposalId,
    entityTitle: lc.detail,
    districtId: null,
    region: null,
    createdAt: lc.createdAt,
    metadata: {
      fromStatus: lc.fromStatus,
      toStatus: lc.toStatus,
      convertedMissionId: lc.convertedMissionId,
    },
  };
}

// ─── Adapter: DistrictActivity → TerritorialEvent ───────────────────────

import type { DistrictActivity } from "@/services/districtRepository";

const ACTIVITY_TO_TERRITORIAL_TYPE: Record<string, TerritorialEventType> = {
  join: "mission.joined",
  join_idempotent: "mission.joined",
  complete: "mission.completed",
  complete_idempotent: "mission.completed",
  xp_granted: "mission.completed",
  rollback_critical: "mission.completed",
  comment: "proposal.comment_added",
  support: "proposal.supported",
};

export function districtActivityToTerritorial(
  da: DistrictActivity,
  districtId: string | null,
  region: "costa" | "sierra" | "selva" | null,
): TerritorialEvent {
  const type = ACTIVITY_TO_TERRITORIAL_TYPE[da.activityType] ?? "proposal.supported";
  return {
    id: da.id,
    type,
    actor: {
      id: "",
      username: da.actorUsername,
      firstName: da.actorFirstName,
      avatarUrl: da.actorAvatarUrl,
    },
    entityType: da.entityType,
    entityId: da.entityId,
    entityTitle: da.detail,
    districtId,
    region,
    createdAt: da.occurredAt,
    metadata: { originalActivityType: da.activityType },
  };
}
