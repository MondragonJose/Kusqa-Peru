/**
 * KUSQA Event Causality — causal chain construction for domain events.
 *
 * This module enriches raw domain events with causal metadata:
 *   - causalId: unique identifier for each event's position in a chain
 *   - parentEventId: the causalId of this event's immediate predecessor
 *   - causalGroupId: groups causally-related events by entity
 *
 * Design:
 *   - Causal fields are optional and only populated during enrichment
 *   - Enrichment is a pure function with no side effects
 *   - Links are deterministic: same input → same causal output
 *   - FIFO fallback for events with identical timestamps
 */

import type { KusqaDomainEvent, CausalEnrichedEvent } from "@/domain/events";

// ─── Helpers ───────────────────────────────────────────────────────────────

function tsSort(a: { timestamp: string }, b: { timestamp: string }): number {
  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
}

function extractEntityId(event: KusqaDomainEvent): string | null {
  if ("evidenceId" in event && typeof (event as any).evidenceId === "string") return (event as any).evidenceId;
  if ("missionId" in event && typeof (event as any).missionId === "string") return (event as any).missionId;
  return null;
}

function extractEvidenceId(event: KusqaDomainEvent): string | null {
  if ("evidenceId" in event && typeof (event as any).evidenceId === "string") return (event as any).evidenceId;
  return null;
}

function makeCausalId(event: KusqaDomainEvent): string {
  const entity = extractEntityId(event) ?? "unknown";
  return `${event.type}:${entity}:${event.timestamp}`;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Build a causally-ordered event list.
 *
 * Groups events by entity, sorts each group by timestamp,
 * and concatenates groups in a stable flat list.
 */
export function buildCausalChain(
  events: readonly KusqaDomainEvent[]
): CausalEnrichedEvent[] {
  const enriched = assignCausalLinks(events);

  // Sort by causalGroupId first (so same-entity events cluster),
  // then by timestamp, with FIFO fallback for ties.
  const sorted = [...enriched].sort((a, b) => {
    const gA = a.causalGroupId ?? "";
    const gB = b.causalGroupId ?? "";
    if (gA < gB) return -1;
    if (gA > gB) return 1;
    return tsSort(a, b);
  });

  return sorted;
}

/**
 * Enrich a list of events with causal relationship fields.
 *
 * For each entity group:
 *   - The first event starts a causal chain (no parent)
 *   - Each subsequent event in the same group links to its immediate predecessor
 *   - causalGroupId = evidenceId for evidence events, missionId for mission events
 *
 * Idempotent: re-running on already-enriched events overwrites fields.
 */
export function assignCausalLinks(
  events: readonly KusqaDomainEvent[]
): CausalEnrichedEvent[] {
  const sorted = [...events].sort(tsSort);

  // Track the latest event per entity (evidenceId or missionId) for parent linkage
  const lastByEntity = new Map<string, CausalEnrichedEvent>();

  const enriched: CausalEnrichedEvent[] = [];

  for (const event of sorted) {
    const entityId = extractEntityId(event);
    const causalGroupId = entityId ?? undefined;
    const causalId = makeCausalId(event);

    let parentEventId: string | undefined;

    if (entityId) {
      const predecessor = lastByEntity.get(entityId);
      if (predecessor) {
        parentEventId = predecessor.causalId;
      }
    }

    // Special case: MissionCompleted links to the last EvidenceVerified
    // for the same evidenceId (not the mission group).
    if (event.type === "MissionCompleted") {
      const evidenceId = extractEvidenceId(event);
      if (evidenceId) {
        const evidencePredecessor = [...enriched].reverse().find(
          (e) =>
            e.type === "EvidenceVerified" &&
            extractEvidenceId(e) === evidenceId
        );
        if (evidencePredecessor) {
          parentEventId = evidencePredecessor.causalId;
        }
      }
    }

    const enrichedEvent: CausalEnrichedEvent = {
      ...event,
      causalId,
      parentEventId,
      causalGroupId,
    };

    enriched.push(enrichedEvent);

    if (entityId) {
      lastByEntity.set(entityId, enrichedEvent);
    }
  }

  return enriched;
}

/**
 * Find the causal parent of a given event, scanning eventHistory
 * (which should already be sorted in causal order).
 *
 * Returns the `causalId` of the nearest predecessor in the same entity group,
 * or `undefined` if no predecessor exists.
 */
export function resolveCausalParent(
  event: KusqaDomainEvent,
  eventHistory: readonly CausalEnrichedEvent[]
): string | undefined {
  const entityId = extractEntityId(event);
  if (!entityId) return undefined;

  const predecessors = eventHistory.filter((e) => {
    const eEntity = extractEntityId(e);
    return eEntity === entityId;
  });

  return predecessors.length > 0
    ? predecessors[predecessors.length - 1].causalId
    : undefined;
}
