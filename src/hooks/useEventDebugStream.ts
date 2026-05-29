/**
 * useEventDebugStream — dev-only hook for inspecting domain events by entity.
 *
 * Returns ordered events referencing a given entity ID (missionId, evidenceId, userId, etc.).
 * Only active in development mode. No production UI dependency.
 */

import { useSyncExternalStore } from "react";
import {
  getEventsByEntity,
  getAllEvents,
  subscribeRegistry,
  getRegistryGeneration,
} from "@/domain/eventRegistry";
import type { KusqaDomainEvent } from "@/domain/events";

/**
 * Subscribe to registry changes and return events matching the given entityId.
 * Pass undefined to get ALL events.
 */
export function useEventDebugStream(entityId?: string): readonly KusqaDomainEvent[] {
  useSyncExternalStore(subscribeRegistry, getRegistryGeneration, () => 0);

  if (!import.meta.env.DEV) return [];

  return entityId ? getEventsByEntity(entityId) : getAllEvents();
}
