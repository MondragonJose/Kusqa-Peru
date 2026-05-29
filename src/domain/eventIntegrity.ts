/**
 * KUSQA Event Integrity — divergence detection and optional repair.
 *
 * This layer compares the in-memory eventRegistry against the DB event_log
 * to detect silent divergence. It is a safety net for observability, NOT a
 * consistency guarantor — the app runs correctly regardless of divergence.
 *
 * Design principle:
 *   Registry = source of UI truth
 *   DB      = audit substrate only
 *   Repair  = never affects live user flow
 */

import type { KusqaDomainEvent } from "@/domain/events";
import { seedRegistry, REGISTRY_MAX_SIZE } from "@/domain/eventRegistry";
import { appendEventToStore } from "@/domain/eventStore";

// ─── Types ────────────────────────────────────────────────────────────────

export type IntegrityDiff = {
  /** Events in the registry that are not in the DB */
  missingInDB: readonly KusqaDomainEvent[];
  /** Events in the DB that are not in the registry */
  missingInRegistry: readonly KusqaDomainEvent[];
  /** Total differing event count */
  divergenceCount: number;
  /** ISO timestamp of the comparison */
  lastSyncTimestamp: string;
};

export type ReconciliationMode = "observe" | "repair-registry" | "repair-db";

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Compare two event streams and return the diff.
 *
 * Matching rule: composite key of (type + actorId + entityId + timestamp).
 * Both streams are treated as unordered sets for comparison.
 */
export function compareEventStreams(
  registryEvents: readonly KusqaDomainEvent[],
  dbEvents: readonly KusqaDomainEvent[]
): IntegrityDiff {
  const registryKeys = new Set(registryEvents.map(compositeKey));
  const dbKeys = new Set(dbEvents.map(compositeKey));

  const missingInDB = registryEvents.filter((e) => !dbKeys.has(compositeKey(e)));
  const missingInRegistry = dbEvents.filter((e) => !registryKeys.has(compositeKey(e)));

  return {
    missingInDB,
    missingInRegistry,
    divergenceCount: missingInDB.length + missingInRegistry.length,
    lastSyncTimestamp: new Date().toISOString(),
  };
}

/**
 * Reconcile divergence between registry and DB.
 *
 *   "observe"         → return diff only (no mutation)
 *   "repair-registry" → overwrite registry from DB (safe seedRegistry)
 *   "repair-db"       → fire-and-forget insert missing events into DB
 *
 * All repair modes are non-blocking and never throw.
 */
export function reconcileEventStreams(
  registryEvents: readonly KusqaDomainEvent[],
  dbEvents: readonly KusqaDomainEvent[],
  mode: ReconciliationMode
): IntegrityDiff {
  const diff = compareEventStreams(registryEvents, dbEvents);

  if (mode === "repair-registry" && dbEvents.length > 0) {
    seedRegistry(dbEvents);
    if (import.meta.env.DEV) {
      console.log(`[KUSQA] Repaired registry from DB (${dbEvents.length} events)`);
    }
  }

  if (mode === "repair-db" && diff.missingInDB.length > 0) {
    for (const event of diff.missingInDB) {
      try {
        appendEventToStore(event);
      } catch {
        // Fire-and-forget — never throw
      }
    }
    if (import.meta.env.DEV) {
      console.log(`[KUSQA] Dispatched ${diff.missingInDB.length} missing events to DB`);
    }
  }

  return diff;
}

// ─── Composite key ────────────────────────────────────────────────────────

function compositeKey(event: KusqaDomainEvent): string {
  const actorId = extractActorId(event);
  const entityId = extractEntityId(event);
  return `${event.type}:${actorId}:${entityId}:${event.timestamp}`;
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
