import { supabase } from "@/lib/supabase";
import type { KusqaDomainEvent, CausalEnrichedEvent } from "@/domain/events";
import { buildCausalChain } from "@/domain/eventCausality";

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

export function appendEventToStore(event: KusqaDomainEvent): void {
  const row = eventToDbRow(event);
  supabase
    .from("event_log")
    .insert(row as Record<string, unknown>)
    .then(() => {}, () => {});
}

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

export async function getCausalChain(entityId: string): Promise<readonly CausalEnrichedEvent[]> {
  const raw = await fetchEventsByEntity(entityId);
  if (raw.length === 0) return [];

  try {
    return buildCausalChain(raw);
  } catch {
    const fallback: CausalEnrichedEvent[] = [...raw];
    return fallback;
  }
}

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
      return event.evidenceId;
    case "EvidenceVerified":
      return event.evidenceId;
    case "EvidenceRejected":
      return event.evidenceId;
    case "EvidenceFlagged":
      return event.evidenceId;
    case "MissionCompleted":
      return event.evidenceId;
    case "MissionStateUpdated":
      return null;
  }
}
