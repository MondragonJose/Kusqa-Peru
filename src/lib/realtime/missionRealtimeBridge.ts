/**
 * Supabase Realtime → React Query reconciliation (debounced, pin-aware).
 */

import type { QueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  hasLocalWriteInFlight,
  reconcileCache,
} from "@/features/auth/mutations/missionMutationEngine";
import { supabase } from "@/lib/supabase";
import { trackOperationalMetric } from "@/lib/telemetry";
import {
  mapRealtimePayloadToDomainEvent,
  planRealtimeReconciliation,
  type MissionDomainEvent,
} from "@/lib/realtime/missionRealtime";

const RECONCILE_DEBOUNCE_MS = 400;

type BridgeState = {
  channel: RealtimeChannel | null;
  debounceTimer: ReturnType<typeof setTimeout> | null;
  pendingEvents: MissionDomainEvent[];
  generation: number;
};

const bridges = new WeakMap<QueryClient, BridgeState>();

function getBridgeState(queryClient: QueryClient): BridgeState {
  let state = bridges.get(queryClient);
  if (!state) {
    state = { channel: null, debounceTimer: null, pendingEvents: [], generation: 0 };
    bridges.set(queryClient, state);
  }
  return state;
}

function flushPendingEvents(queryClient: QueryClient, userId: string): void {
  const state = getBridgeState(queryClient);
  const events = [...state.pendingEvents];
  state.pendingEvents = [];

  for (const event of events) {
    const scope = {
      userId: event.actorId,
      missionIds: event.missionId ? [event.missionId] : undefined,
    };

    if (hasLocalWriteInFlight(queryClient, scope)) {
      trackOperationalMetric("realtime.reconcile.skipped", {
        reason: "local_write_in_flight",
        type: event.type,
      });
      continue;
    }

    const decision = planRealtimeReconciliation(event, { hasLocalWriteInFlight: false });
    if (decision.action === "invalidate") {
      reconcileCache(queryClient, decision.scope, "schedule");
      trackOperationalMetric("realtime.reconcile.applied", { type: event.type });
    }
  }

  void reconcileCache(queryClient, { userId }, "flush");
}

function scheduleReconcile(queryClient: QueryClient, userId: string): void {
  const state = getBridgeState(queryClient);
  if (state.debounceTimer) clearTimeout(state.debounceTimer);

  state.debounceTimer = setTimeout(() => {
    state.debounceTimer = null;
    flushPendingEvents(queryClient, userId);
  }, RECONCILE_DEBOUNCE_MS);
}

function enqueueRemoteEvent(
  queryClient: QueryClient,
  userId: string,
  event: MissionDomainEvent,
): void {
  const state = getBridgeState(queryClient);
  state.pendingEvents.push(event);
  scheduleReconcile(queryClient, userId);
}

export function subscribeMissionRealtime(queryClient: QueryClient, userId: string): () => void {
  const state = getBridgeState(queryClient);
  const generation = ++state.generation;

  if (state.channel) {
    void supabase.removeChannel(state.channel);
    state.channel = null;
  }

  const channel = supabase
    .channel(`kusqa-sync:${userId}`)
    // user_missions table may not exist — skip subscription to prevent 404 errors
    // .on(
    //   "postgres_changes",
    //   { event: "*", schema: "public", table: "user_missions", filter: `user_id=eq.${userId}` },
    //   (payload) => {
    //     if (generation !== state.generation) return;
    //     const event = mapRealtimePayloadToDomainEvent("user_missions", payload, userId);
    //     if (event) enqueueRemoteEvent(queryClient, userId, event);
    //   }
    // )
    // user_progress table may not exist — skip subscription to prevent 406 errors
    // .on(
    //   "postgres_changes",
    //   { event: "*", schema: "public", table: "user_progress", filter: `user_id=eq.${userId}` },
    //   (payload) => {
    //     if (generation !== state.generation) return;
    //     const event = mapRealtimePayloadToDomainEvent("user_progress", payload, userId);
    //     if (event) enqueueRemoteEvent(queryClient, userId, event);
    //   }
    // )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "user_notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (generation !== state.generation) return;
        const event = mapRealtimePayloadToDomainEvent("user_notifications", payload, userId);
        if (event) enqueueRemoteEvent(queryClient, userId, event);
      },
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, (payload) => {
      if (generation !== state.generation) return;
      const event = mapRealtimePayloadToDomainEvent("missions", payload, userId);
      if (event) enqueueRemoteEvent(queryClient, userId, event);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        trackOperationalMetric("realtime.channel.subscribed", { userId });
      }
      if (status === "CHANNEL_ERROR") {
        trackOperationalMetric("realtime.channel.error", { userId });
      }
    });

  state.channel = channel;

  return () => {
    state.generation += 1;
    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
      state.debounceTimer = null;
    }
    state.pendingEvents = [];
    void supabase.removeChannel(channel);
    if (state.channel === channel) state.channel = null;
  };
}
