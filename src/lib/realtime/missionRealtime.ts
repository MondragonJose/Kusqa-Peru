/**
 * Realtime domain events + reconciliation planning.
 */

import type { InvalidateRequest } from "@/features/auth/mutations/missionMutationEngine";

export const MISSION_REALTIME_CHANNELS = {
  userMissions: (userId: string) => `kusqa:user-missions:${userId}`,
  userProgress: (userId: string) => `kusqa:user-progress:${userId}`,
  missionCatalog: "kusqa:missions:catalog",
  notifications: (userId: string) => `kusqa:notifications:${userId}`,
} as const;

export type MissionDomainEventType =
  | "mission.joined"
  | "mission.completed"
  | "progress.updated"
  | "profile.xp_updated"
  | "notification.received"
  | "mission.catalog_updated";

export type MissionDomainEvent = {
  type: MissionDomainEventType;
  actorId: string;
  missionId?: string;
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

  return { action: "invalidate", scope };
}

type RealtimePayload = {
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
