/**
 * KUSQA Event Store — durable append-only persistence for domain events.
 *
 * This layer mirrors emitted events into the event_log Supabase table.
 * It is an eventual-consistency mirror, NOT a dependency:
 * the app works correctly even if the DB is unreachable.
 *
 * Responsibilities:
 *   - Fire-and-forget append on emit (never blocks, never throws)
 *   - Query helpers for entity-scoped and time-scoped reads
 *   - replayEntityState — pure function for deterministic reconstruction
 */

import { supabase } from "@/lib/supabase";
import type { KusqaDomainEvent, CausalEnrichedEvent } from "@/domain/events";
import { assignCausalLinks, buildCausalChain } from "@/domain/eventCausality";

// ─── DB row shape (matches migration) ─────────────────────────────────────

type EventLogRow = {
  id: string;
  type: string;
  actor_id: string;
  entity_id: string | null;
  mission_id: string | null;
  evidence_id: string | null;
  payload: KusqaDomainEvent;
  created_at: string;
};

// ─── Fire-and-forget append ───────────────────────────────────────────────

/**
 * Persist an event to the event_log table.
 * Fire-and-forget — never blocks emit(), never throws.
 * Errors are silently swallowed (mirror is not a dependency).
 */
export function appendEventToStore(event: KusqaDomainEvent): void {
  const row = eventToDbRow(event);
  supabase
    .from("event_log")
    .insert(row as Record<string, unknown>)
    .then(noop, noop);
}

const noop = () => {};

// ─── Query helpers ────────────────────────────────────────────────────────

/**
 * Fetch all events referencing a given entity ID.
 * Returns events ordered by created_at ascending.
 */
export async function fetchEventsByEntity(entityId: string): Promise<readonly KusqaDomainEvent[]> {
  const { data, error } = await supabase
    .from("event_log")
    .select("*")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[eventStore] fetchEventsByEntity error:", error);
    return [];
  }

  return (data ?? []).map((row: EventLogRow) => row.payload);
}

/**
 * Fetch all events for a mission, ordered by created_at ascending.
 */
export async function fetchEventsByMission(
  missionId: string,
): Promise<readonly KusqaDomainEvent[]> {
  const { data, error } = await supabase
    .from("event_log")
    .select("*")
    .eq("mission_id", missionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[eventStore] fetchEventsByMission error:", error);
    return [];
  }

  return (data ?? []).map((row: EventLogRow) => row.payload);
}

/**
 * Fetch the most recent N events for the current authenticated user (actor_id).
 */
export async function fetchRecentEvents(limit: number = 200): Promise<readonly KusqaDomainEvent[]> {
  const { data: user } = await supabase.auth.getUser();
  const actorId = user?.user?.id;
  if (!actorId) return [];

  const { data, error } = await supabase
    .from("event_log")
    .select("*")
    .eq("actor_id", actorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn("[eventStore] fetchRecentEvents error:", error);
    return [];
  }

  return (data ?? []).reverse().map((row: EventLogRow) => row.payload);
}

/**
 * Fetch all events for an entity, enriched with causal links.
 *
 * Returns events ordered causally (by causalGroupId then created_at).
 * Falls back to raw events if enrichment fails (non-blocking).
 */
export async function getCausalChain(entityId: string): Promise<readonly CausalEnrichedEvent[]> {
  const raw = await fetchEventsByEntity(entityId);
  if (raw.length === 0) return [];

  try {
    return buildCausalChain(raw);
  } catch (err) {
    console.warn("[eventStore] getCausalChain enrichment failed, returning raw events:", err);
    const fallback: CausalEnrichedEvent[] = [...raw];
    return fallback;
  }
}

// ─── Replay ───────────────────────────────────────────────────────────────

/**
 * Deterministic reconstruction of an entity's event timeline.
 *
 * Pure function — takes events, returns ordered sequence.
 * No DB writes, no side effects.
 *
 * The caller decides how to derive state from the sequence
 * using existing domain functions (e.g. deriveCompletionState).
 */
export function replayEntityState(
  events: readonly KusqaDomainEvent[],
): readonly KusqaDomainEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

// ─── Mapping ──────────────────────────────────────────────────────────────

function eventToDbRow(event: KusqaDomainEvent): Omit<EventLogRow, "id"> {
  return {
    type: event.type,
    actor_id: extractActorId(event),
    entity_id: extractEntityId(event),
    mission_id: extractMissionId(event),
    evidence_id: extractEvidenceId(event),
    payload: event,
    created_at: event.timestamp,
  };
}

function extractActorId(event: KusqaDomainEvent): string {
  switch (event.type) {
    case "EvidenceSubmitted":
      return event.actorId;
    case "EvidenceVerified":
      return event.verifierId;
    case "EvidenceRejected":
      return event.verifierId;
    case "EvidenceFlagged":
      return event.flaggerId;
    case "MissionCompleted":
      return event.userId;
    case "MissionStateUpdated":
      return event.actorId;
  }
}

function extractEntityId(event: KusqaDomainEvent): string | null {
  switch (event.type) {
    case "EvidenceSubmitted":
    case "EvidenceVerified":
    case "EvidenceRejected":
    case "EvidenceFlagged":
      return event.evidenceId;
    case "MissionCompleted":
    case "MissionStateUpdated":
      return event.missionId;
  }
}

function extractMissionId(event: KusqaDomainEvent): string | null {
  switch (event.type) {
    case "EvidenceSubmitted":
    case "EvidenceVerified":
    case "EvidenceRejected":
    case "EvidenceFlagged":
    case "MissionCompleted":
    case "MissionStateUpdated":
      return event.missionId;
  }
}

function extractEvidenceId(event: KusqaDomainEvent): string | null {
  switch (event.type) {
    case "EvidenceSubmitted":
    case "EvidenceVerified":
    case "EvidenceRejected":
    case "EvidenceFlagged":
    case "MissionCompleted":
      return event.evidenceId;
    case "MissionStateUpdated":
      return null;
  }
}
