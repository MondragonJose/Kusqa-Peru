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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function handleEvidenceSubmitted(
  queryClient: QueryClient,
  event: KusqaDomainEvent & { type: "EvidenceSubmitted" },
): void {
  invalidateEvidenceCaches(queryClient, event.userId, event.missionId);
  reconcileCache(queryClient, { userId: event.userId, missionIds: [event.missionId] }, "both");
}

function handleEvidenceVerified(
  queryClient: QueryClient,
  event: KusqaDomainEvent & { type: "EvidenceVerified" },
): void {
  invalidateEvidenceCaches(queryClient, event.userId, event.missionId);
  reconcileCache(queryClient, { userId: event.userId, missionIds: [event.missionId] }, "both");
}

function handleEvidenceRejected(
  queryClient: QueryClient,
  event: KusqaDomainEvent & { type: "EvidenceRejected" },
): void {
  invalidateEvidenceCaches(queryClient, event.userId, event.missionId);
  reconcileCache(queryClient, { userId: event.userId, missionIds: [event.missionId] }, "both");
}

function handleEvidenceFlagged(
  queryClient: QueryClient,
  event: KusqaDomainEvent & { type: "EvidenceFlagged" },
): void {
  invalidateEvidenceCaches(queryClient, event.userId, event.missionId);
  reconcileCache(queryClient, { userId: event.userId, missionIds: [event.missionId] }, "both");
}

function handleMissionCompleted(
  queryClient: QueryClient,
  event: KusqaDomainEvent & { type: "MissionCompleted" },
): void {
  invalidateEvidenceCaches(queryClient, event.userId, event.missionId);
  reconcileCache(queryClient, { userId: event.userId, missionIds: [event.missionId] }, "both");
}

function handleMissionStateUpdated(
  queryClient: QueryClient,
  event: KusqaDomainEvent & { type: "MissionStateUpdated" },
): void {
  void queryClient.invalidateQueries({ queryKey: missionKeys.all });
  void queryClient.invalidateQueries({ queryKey: missionKeys.detail(event.missionId) });
}

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
