/**
 * Realtime domain events + reconciliation planning.
 */

import type { InvalidateRequest } from "@/features/auth/mutations/missionMutationEngine";

export const MISSION_REALTIME_CHANNELS = {
  userMissions: (userId: string) => `kusqa:user-missions:${userId}`,
  userProgress: (userId: string) => `kusqa:user-progress:${userId}`,
  missionCatalog: "kusqa:missions:catalog",
  notifications: (userId: string) => `kusqa:notifications:${userId}`,
  proposalSupport: (proposalId: string) => `kusqa:proposal-support:${proposalId}`,
} as const;

export type MissionDomainEventType =
  | "mission.joined"
  | "mission.completed"
  | "progress.updated"
  | "profile.xp_updated"
  | "notification.received"
  | "mission.catalog_updated"
  | "proposal.support_changed";

export type MissionDomainEvent = {
  type: MissionDomainEventType;
  actorId: string;
  missionId?: string;
  /** Phase 4B: when the event is a proposal support change, this is
   *  the proposal id. The bridge's reconciliation invalidates the
   *  proposal detail + coalition keys. */
  proposalId?: string;
  occurredAt: string;
  xpGranted?: number;
  idempotent?: boolean;
  sourceTable?: string;
};

export type RealtimeReconciliationDecision =
  | { action: "invalidate"; scope: InvalidateRequest }
  | { action: "ignore"; reason: "local_write_in_flight" | "optimistic_pin_active" };

export function planRealtimeReconciliation(
  event: MissionDomainEvent,
  options: { hasLocalWriteInFlight: boolean },
): RealtimeReconciliationDecision {
  if (options.hasLocalWriteInFlight) {
    return { action: "ignore", reason: "local_write_in_flight" };
  }

  const scope: InvalidateRequest = {
    userId: event.actorId,
    missionIds: event.missionId ? [event.missionId] : undefined,
  };

  if (event.type === "mission.catalog_updated") {
    return {
      action: "invalidate",
      scope: { missionIds: event.missionId ? [event.missionId] : [] },
    };
  }

  if (event.type === "notification.received") {
    return { action: "invalidate", scope: { userId: event.actorId } };
  }

  if (event.type === "proposal.support_changed") {
    // The bridge invalidates proposal detail + coalition stats.
    // missionIds is unused for proposal events; proposalId is carried
    // on the event for the bridge to compose the right query key.
    return { action: "invalidate", scope: { userId: event.actorId } };
  }

  return { action: "invalidate", scope };
}

export type RealtimePayload = {
  eventType: string;
  new: Record<string, unknown> | null;
  old: Record<string, unknown> | null;
};

export function mapRealtimePayloadToDomainEvent(
  table: string,
  payload: RealtimePayload,
  actorId: string,
): MissionDomainEvent | null {
  const occurredAt = new Date().toISOString();
  const row = payload.new ?? payload.old;

  // user_missions table may not exist — skip mapping
  // if (table === "user_missions" && row) {
  //   const missionId = String(row.mission_id ?? "");
  //   const status = String(row.status ?? "");
  //   if (status === "completed") {
  //     return {
  //       type: "mission.completed",
  //       actorId,
  //       missionId,
  //       occurredAt,
  //       xpGranted: typeof row.xp_earned === "number" ? row.xp_earned : undefined,
  //       sourceTable: table,
  //     };
  //   }
  //   return { type: "mission.joined", actorId, missionId, occurredAt, sourceTable: table };
  // }

  // user_progress table may not exist — skip mapping
  // if (table === "user_progress") {
  //   return { type: "progress.updated", actorId, occurredAt, sourceTable: table };
  // }

  if (table === "user_notifications") {
    const missionId =
      payload.new && typeof payload.new.payload === "object" && payload.new.payload !== null
        ? String((payload.new.payload as Record<string, unknown>).mission_id ?? "")
        : undefined;
    return {
      type: "notification.received",
      actorId,
      missionId: missionId || undefined,
      occurredAt,
      sourceTable: table,
    };
  }

  if (table === "missions" && row?.id) {
    return {
      type: "mission.catalog_updated",
      actorId,
      missionId: String(row.id),
      occurredAt,
      sourceTable: table,
    };
  }

  return null;
}

/**
 * Phase 4B: map a `civic_events` payload to a `proposal.support_changed`
 * domain event. Only `kind = 'proposal.supported'` and
 * `target_type = 'proposal'` are mapped; everything else returns null
 * so the bridge does not dispatch spurious invalidations.
 *
 * Returned events flow into the same `planRealtimeReconciliation`
 * pipeline as mission events, with `proposalId` carrying the target.
 */
export function mapCivicEventPayloadToProposalSupport(
  payload: RealtimePayload,
  fallbackActorId: string,
): MissionDomainEvent | null {
  const row = payload.new;
  if (!row) return null;
  if (row.target_type !== "proposal") return null;
  if (row.kind !== "proposal.supported") return null;
  if (!row.target_id) return null;

  return {
    type: "proposal.support_changed",
    actorId:
      typeof row.actor_id === "string" && row.actor_id.length > 0
        ? String(row.actor_id)
        : fallbackActorId,
    proposalId: String(row.target_id),
    occurredAt: typeof row.occurred_at === "string" ? row.occurred_at : new Date().toISOString(),
    sourceTable: "civic_events",
  };
}
