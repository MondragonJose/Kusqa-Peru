/**
 * KUSQA Domain Event Handlers — central propagation layer.
 *
 * ALL cache invalidation and state propagation triggered by domain events
 * lives HERE. No inline invalidation in hooks or services.
 *
 * Handlers are registered once via useEventPropagation() at app boot.
 */

import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import {
  evidenceKeys,
  userMissionKeys,
  userKeys,
  userProgressKeys,
  missionKeys,
} from "@/lib/queryKeys";
import { reconcileCache } from "@/features/auth/mutations/missionMutationEngine";
import type { KusqaDomainEvent } from "@/domain/events";
import { subscribe, unsubscribe } from "@/domain/eventEmitter";

let registered = false;

export function useEventPropagation(queryClient: QueryClient): void {
  useEffect(() => {
    if (registered) return;
    registered = true;

    const handler = (event: KusqaDomainEvent) => {
      switch (event.type) {
        case "EvidenceSubmitted":
          handleEvidenceSubmitted(queryClient, event);
          break;
        case "EvidenceVerified":
          handleEvidenceVerified(queryClient, event);
          break;
        case "EvidenceRejected":
          handleEvidenceRejected(queryClient, event);
          break;
        case "EvidenceFlagged":
          handleEvidenceFlagged(queryClient, event);
          break;
        case "MissionCompleted":
          handleMissionCompleted(queryClient, event);
          break;
        case "MissionStateUpdated":
          handleMissionStateUpdated(queryClient, event);
          break;
      }
    };

    subscribe(handler);

    return () => {
      unsubscribe(handler);
      registered = false;
    };
    // queryClient reference is stable — register once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// ─── EvidenceSubmitted ────────────────────────────────────────────────────

function handleEvidenceSubmitted(
  queryClient: QueryClient,
  event: KusqaDomainEvent & { type: "EvidenceSubmitted" },
): void {
  invalidateEvidenceCaches(queryClient, event.userId, event.missionId);
  reconcileCache(queryClient, { userId: event.userId, missionIds: [event.missionId] }, "both");
}

// ─── EvidenceVerified ─────────────────────────────────────────────────────

function handleEvidenceVerified(
  queryClient: QueryClient,
  event: KusqaDomainEvent & { type: "EvidenceVerified" },
): void {
  invalidateEvidenceCaches(queryClient, event.userId, event.missionId);
  reconcileCache(queryClient, { userId: event.userId, missionIds: [event.missionId] }, "both");
}

// ─── EvidenceRejected ─────────────────────────────────────────────────────

function handleEvidenceRejected(
  queryClient: QueryClient,
  event: KusqaDomainEvent & { type: "EvidenceRejected" },
): void {
  invalidateEvidenceCaches(queryClient, event.userId, event.missionId);
  reconcileCache(queryClient, { userId: event.userId, missionIds: [event.missionId] }, "both");
}

// ─── EvidenceFlagged ──────────────────────────────────────────────────────

function handleEvidenceFlagged(
  queryClient: QueryClient,
  event: KusqaDomainEvent & { type: "EvidenceFlagged" },
): void {
  invalidateEvidenceCaches(queryClient, event.userId, event.missionId);
  reconcileCache(queryClient, { userId: event.userId, missionIds: [event.missionId] }, "both");
}

// ─── MissionCompleted ─────────────────────────────────────────────────────

function handleMissionCompleted(
  queryClient: QueryClient,
  event: KusqaDomainEvent & { type: "MissionCompleted" },
): void {
  invalidateEvidenceCaches(queryClient, event.userId, event.missionId);
  reconcileCache(queryClient, { userId: event.userId, missionIds: [event.missionId] }, "both");
}

// ─── MissionStateUpdated ───────────────────────────────────────────────────

function handleMissionStateUpdated(
  queryClient: QueryClient,
  event: KusqaDomainEvent & { type: "MissionStateUpdated" },
): void {
  void queryClient.invalidateQueries({ queryKey: missionKeys.all });
  void queryClient.invalidateQueries({ queryKey: missionKeys.detail(event.missionId) });
}

// ─── Shared invalidation helpers ──────────────────────────────────────────

function invalidateEvidenceCaches(
  queryClient: QueryClient,
  userId: string,
  missionId: string,
): void {
  void queryClient.invalidateQueries({ queryKey: evidenceKeys.byMission(missionId) });
  void queryClient.invalidateQueries({ queryKey: evidenceKeys.byUserMission(userId, missionId) });
  void queryClient.invalidateQueries({ queryKey: evidenceKeys.byUser(userId) });
  void queryClient.invalidateQueries({ queryKey: evidenceKeys.completionState(userId, missionId) });
}

export function resetEventPropagationRegistration(): void {
  registered = false;
}
