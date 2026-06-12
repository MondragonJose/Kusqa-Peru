/**
 * InitiativeEvent — unified catalog for Initiative aggregate events.
 *
 * After Phase 6, this is the ONE event vocabulary. All legacy sources
 * (KusqaDomainEvent, TerritorialEvent, proposal_lifecycle_events) have
 * been retired. Only InitiativeEvent remains.
 *
 * Lifecycle mapping:
 *   Forming   (idea)       → ProposalCreated, ProposalSupported, etc.
 *   Gathering (recruiting) → MissionJoined, ProposalCollaboratorJoined
 *   Active    (execution)  → EvidenceSubmitted, EvidenceVerified, etc.
 *   Completed              → MissionCompleted
 *   Dormant                → derived from absence of recent events
 */

// ─── Idea phase ────────────────────────────────────────────────────────────

export type InitiativeProposalCreated = {
  type: "ProposalCreated";
  proposalId: string;
  actorId: string;
  timestamp: string;
};

export type InitiativeProposalSupported = {
  type: "ProposalSupported";
  proposalId: string;
  supporterId: string;
  timestamp: string;
};

export type InitiativeProposalUnsuspended = {
  type: "ProposalUnsuspended";
  proposalId: string;
  supporterId: string;
  timestamp: string;
};

export type InitiativeProposalCommentAdded = {
  type: "ProposalCommentAdded";
  proposalId: string;
  commentId: string;
  actorId: string;
  timestamp: string;
};

export type InitiativeProposalCollaboratorJoined = {
  type: "ProposalCollaboratorJoined";
  proposalId: string;
  collaboratorId: string;
  timestamp: string;
};

export type InitiativeProposalThresholdReached = {
  type: "ProposalThresholdReached";
  proposalId: string;
  fromStatus: string | null;
  toStatus: string | null;
  timestamp: string;
};

export type InitiativeProposalConvertedToMission = {
  type: "ProposalConvertedToMission";
  proposalId: string;
  missionId: string;
  timestamp: string;
};

export type InitiativeProposalReopened = {
  type: "ProposalReopened";
  proposalId: string;
  reason: string | null;
  timestamp: string;
};

export type InitiativeProposalLocked = {
  type: "ProposalLocked";
  proposalId: string;
  timestamp: string;
};

// ─── Gathering phase ───────────────────────────────────────────────────────

export type InitiativeMissionJoined = {
  type: "MissionJoined";
  missionId: string;
  userId: string;
  timestamp: string;
};

// ─── Active phase ──────────────────────────────────────────────────────────

export type InitiativeEvidenceSubmitted = {
  type: "EvidenceSubmitted";
  evidenceId: string;
  missionId: string;
  userId: string;
  actorId: string;
  timestamp: string;
};

export type InitiativeEvidenceVerified = {
  type: "EvidenceVerified";
  evidenceId: string;
  missionId: string;
  userId: string;
  verifierId: string;
  timestamp: string;
};

export type InitiativeEvidenceRejected = {
  type: "EvidenceRejected";
  evidenceId: string;
  missionId: string;
  userId: string;
  verifierId: string;
  rejectionReason: string | null;
  timestamp: string;
};

export type InitiativeEvidenceFlagged = {
  type: "EvidenceFlagged";
  evidenceId: string;
  missionId: string;
  userId: string;
  flaggerId: string;
  timestamp: string;
};

export type InitiativeMissionStateUpdated = {
  type: "MissionStateUpdated";
  missionId: string;
  actorId: string;
  timestamp: string;
};

// ─── Completion phase ──────────────────────────────────────────────────────

export type InitiativeMissionCompleted = {
  type: "MissionCompleted";
  missionId: string;
  userId: string;
  evidenceId: string;
  timestamp: string;
};

// ─── Institution events (Phase 3) ─────────────────────────────────────────

export type InitiativeInstitutionEndorsed = {
  type: "InstitutionEndorsed";
  institutionId: string;
  timestamp: string;
};

// ─── Community / territory events ──────────────────────────────────────────

export type InitiativeDistrictFirstMovement = {
  type: "DistrictFirstMovement";
  districtId: string;
  timestamp: string;
};

export type InitiativeCommunityTrustChanged = {
  type: "CommunityTrustChanged";
  profileId: string;
  timestamp: string;
};

export type InitiativeCommunityProfileMilestone = {
  type: "CommunityProfileMilestone";
  profileId: string;
  milestone: string;
  timestamp: string;
};

// ─── Discriminated union — every Initiative event ─────────────────────────

export type InitiativeEvent =
  | InitiativeProposalCreated
  | InitiativeProposalSupported
  | InitiativeProposalUnsuspended
  | InitiativeProposalCommentAdded
  | InitiativeProposalCollaboratorJoined
  | InitiativeProposalThresholdReached
  | InitiativeProposalConvertedToMission
  | InitiativeProposalReopened
  | InitiativeProposalLocked
  | InitiativeMissionJoined
  | InitiativeEvidenceSubmitted
  | InitiativeEvidenceVerified
  | InitiativeEvidenceRejected
  | InitiativeEvidenceFlagged
  | InitiativeMissionStateUpdated
  | InitiativeMissionCompleted
  | InitiativeInstitutionEndorsed
  | InitiativeDistrictFirstMovement
  | InitiativeCommunityTrustChanged
  | InitiativeCommunityProfileMilestone;

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Returns true when the event relates to a mission (has a missionId). */
export function isMissionEvent(
  event: InitiativeEvent,
): event is InitiativeEvent & { missionId: string } {
  return "missionId" in event;
}

/** Returns the entity id (proposal or mission id) of a domain-relevant event. */
export function getAggregateId(event: InitiativeEvent): string | null {
  if ("proposalId" in event) return event.proposalId as string;
  if ("missionId" in event) return event.missionId as string;
  if ("districtId" in event) return (event as { districtId: string }).districtId;
  if ("profileId" in event) return (event as { profileId: string }).profileId;
  return null;
}
