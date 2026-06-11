import { supabase } from "@/lib/supabase";
import type { InitiativeEvent } from "@/domain/initiativeEventCatalog";

function extractActor(event: InitiativeEvent): string {
  switch (event.type) {
    case "ProposalCreated":
      return event.actorId;
    case "ProposalSupported":
      return event.supporterId;
    case "ProposalUnsuspended":
      return event.supporterId;
    case "ProposalCommentAdded":
      return event.actorId;
    case "ProposalCollaboratorJoined":
      return event.collaboratorId;
    case "ProposalThresholdReached":
      return "";
    case "ProposalConvertedToMission":
      return "";
    case "ProposalReopened":
      return "";
    case "ProposalLocked":
      return "";
    case "MissionJoined":
      return event.userId;
    case "EvidenceSubmitted":
      return event.actorId;
    case "EvidenceVerified":
      return event.verifierId;
    case "EvidenceRejected":
      return event.verifierId;
    case "EvidenceFlagged":
      return event.flaggerId;
    case "MissionStateUpdated":
      return event.actorId;
    case "MissionCompleted":
      return event.userId;
    case "DistrictFirstMovement":
    case "CommunityTrustChanged":
    case "CommunityProfileMilestone":
      return "";
  }
}

function extractEntity(event: InitiativeEvent): string | null {
  switch (event.type) {
    case "ProposalCreated":
    case "ProposalSupported":
    case "ProposalUnsuspended":
    case "ProposalCommentAdded":
    case "ProposalCollaboratorJoined":
    case "ProposalThresholdReached":
    case "ProposalConvertedToMission":
    case "ProposalReopened":
    case "ProposalLocked":
      return event.proposalId;
    case "MissionJoined":
    case "MissionStateUpdated":
      return event.missionId;
    case "EvidenceSubmitted":
    case "EvidenceFlagged":
      return event.evidenceId;
    case "EvidenceVerified":
      return event.evidenceId;
    case "EvidenceRejected":
      return event.evidenceId;
    case "MissionCompleted":
      return event.missionId;
    case "DistrictFirstMovement":
      return event.districtId;
    case "CommunityTrustChanged":
    case "CommunityProfileMilestone":
      return event.profileId;
  }
}

function extractMission(event: InitiativeEvent): string | null {
  switch (event.type) {
    case "EvidenceSubmitted":
    case "EvidenceVerified":
    case "EvidenceRejected":
    case "EvidenceFlagged":
    case "MissionCompleted":
    case "MissionStateUpdated":
    case "MissionJoined":
      return event.missionId;
    case "ProposalConvertedToMission":
      return event.missionId;
    default:
      return null;
  }
}

export function emitInitiativeEvent(event: InitiativeEvent): void {
  if (import.meta.env.DEV) {
    console.debug("[kusqa:initiative-event]", event.type, event);
  }
  supabase
    .from("event_log")
    .insert({
      type: event.type,
      actor_id: extractActor(event),
      entity_id: extractEntity(event),
      mission_id: extractMission(event),
      evidence_id: null,
      payload: event as Record<string, unknown>,
      created_at: event.timestamp,
    })
    .then(
      () => {},
      () => {},
    );
}
