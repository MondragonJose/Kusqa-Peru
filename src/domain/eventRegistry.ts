/**
 * KUSQA Event Registry — bounded in-memory ring buffer for domain events.
 *
 * Every emitted event is stored here for debugging and observability.
 * FIFO eviction at capacity. Synchronous. Zero impact on emitter timing.
 */

import type { KusqaDomainEvent } from "@/domain/events";

export const REGISTRY_MAX_SIZE = 1000;

let buffer: KusqaDomainEvent[] = [];

let generation = 0;
const listeners = new Set<() => void>();

function notifyListeners(): void {
  generation++;
  listeners.forEach((l) => l());
}

/**
 * Subscribe to registry mutations. Returns unsubscribe function.
 */
export function subscribeRegistry(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Current generation counter — incremented on every append.
 * Used by useSyncExternalStore to trigger re-renders.
 */
export function getRegistryGeneration(): number {
  return generation;
}

/**
 * Append an event to the registry.
 * If at capacity, the oldest event is evicted (FIFO).
 * Notifies subscribers after append.
 */
export function appendToRegistry(event: KusqaDomainEvent): void {
  if (buffer.length >= REGISTRY_MAX_SIZE) {
    buffer.shift();
  }
  buffer.push(event);
  notifyListeners();
}

/**
 * Return all stored events, oldest first.
 */
export function getAllEvents(): readonly KusqaDomainEvent[] {
  return buffer;
}

/**
 * Return all events referencing a given entity ID.
 * Scans missionId, evidenceId, userId, actorId, verifierId, flaggerId fields.
 */
export function getEventsByEntity(entityId: string): readonly KusqaDomainEvent[] {
  return buffer.filter((e) => eventReferencesEntity(e, entityId));
}

/**
 * Return all events of a given type.
 */
export function getEventsByType(type: KusqaDomainEvent["type"]): readonly KusqaDomainEvent[] {
  return buffer.filter((e) => e.type === type);
}

/**
 * Current event count.
 */
export function getRegistrySize(): number {
  return buffer.length;
}

/**
 * Clear all stored events.
 */
export function clearRegistry(): void {
  buffer = [];
}

/**
 * Seed the registry with historical events on app boot.
 * Replaces the current buffer. Does NOT notify listeners (silent hydration).
 * Respects the max size bound — oldest events are dropped if over capacity.
 */
export function seedRegistry(events: readonly KusqaDomainEvent[]): void {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  if (sorted.length > REGISTRY_MAX_SIZE) {
    buffer = sorted.slice(sorted.length - REGISTRY_MAX_SIZE);
  } else {
    buffer = sorted;
  }
}

/**
 * Extract all entity-matching fields from an event for querying.
 */
function entityFields(event: KusqaDomainEvent): string[] {
  switch (event.type) {
    case "EvidenceSubmitted":
      return [event.evidenceId, event.userId, event.missionId, event.actorId];
    case "EvidenceVerified":
      return [event.evidenceId, event.userId, event.missionId, event.verifierId];
    case "EvidenceRejected":
      return [event.evidenceId, event.userId, event.missionId, event.verifierId];
    case "EvidenceFlagged":
      return [event.evidenceId, event.userId, event.missionId, event.flaggerId];
    case "MissionCompleted":
      return [event.missionId, event.userId, event.evidenceId];
    case "MissionStateUpdated":
      return [event.missionId, event.actorId];
  }
}

function eventReferencesEntity(event: KusqaDomainEvent, entityId: string): boolean {
  return entityFields(event).some((id) => id === entityId);
}
