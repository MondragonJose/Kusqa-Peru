/**

 * Central query key factory — single source for React Query cache identity.

 */

const MISSIONS_ROOT = "missions" as const;

const USER_ROOT = "user" as const;

const USER_MISSIONS_ROOT = "user-missions" as const;

const USER_PROGRESS_ROOT = "user-progress" as const;

const NOTIFICATIONS_ROOT = "notifications" as const;

const EVIDENCE_ROOT = "mission-evidence" as const;

const PROPOSALS_ROOT = "proposals" as const;
const PROPOSAL_SUPPORTS_ROOT = "proposal-supports" as const;
const PROPOSAL_COLLABORATORS_ROOT = "proposal-collaborators" as const;
const PROPOSAL_COMMENTS_ROOT = "proposal-comments" as const;
const PROPOSAL_COALITION_ROOT = "proposal-coalition" as const;
const PROPOSAL_LIFECYCLE_ROOT = "proposal-lifecycle" as const;
const DISTRICTS_ROOT = "districts" as const;
const DISTRICT_STATS_ROOT = "district-stats" as const;
const DISTRICT_ACTIVITY_ROOT = "district-activity" as const;
const DISTRICT_FEED_ROOT = "district-feed" as const;

const PUBLIC_PROFILES_ROOT = "public-profiles" as const;
const CIVIC_EVENTS_ROOT = "civic-events" as const;

export const missionKeys = {
  all: [MISSIONS_ROOT] as const,

  detail: (missionId: string) => [MISSIONS_ROOT, "detail", missionId] as const,
};

export const userKeys = {
  session: [USER_ROOT, "session"] as const,

  current: [USER_ROOT, "current"] as const,

  profileRow: (userId: string) => [USER_ROOT, "profile", userId] as const,
};

export const publicProfileKeys = {
  root: [PUBLIC_PROFILES_ROOT] as const,
  byId: (userId: string) => [PUBLIC_PROFILES_ROOT, userId] as const,
};

export const civicEventKeys = {
  root: [CIVIC_EVENTS_ROOT] as const,
  forUser: (userId: string, limit: number) => [CIVIC_EVENTS_ROOT, userId, limit] as const,
};

export const userMissionKeys = {
  root: [USER_MISSIONS_ROOT] as const,

  all: (userId: string) => [USER_MISSIONS_ROOT, userId, "all"] as const,

  completed: (userId: string) => [USER_MISSIONS_ROOT, userId, "completed"] as const,
};

export const userProgressKeys = {
  root: [USER_PROGRESS_ROOT] as const,

  territory: (scope: string) => [USER_PROGRESS_ROOT, "territory", scope] as const,

  enrichment: (missionIds: readonly string[]) =>
    [USER_PROGRESS_ROOT, "enrichment", [...missionIds].sort().join(",")] as const,
};

export const notificationKeys = {
  root: [NOTIFICATIONS_ROOT] as const,

  inbox: (userId: string) => [NOTIFICATIONS_ROOT, userId, "inbox"] as const,

  unreadCount: (userId: string) => [NOTIFICATIONS_ROOT, userId, "unread-count"] as const,
};

export const evidenceKeys = {
  root: [EVIDENCE_ROOT] as const,

  byMission: (missionId: string) => [EVIDENCE_ROOT, "mission", missionId] as const,

  byUserMission: (userId: string, missionId: string) => [EVIDENCE_ROOT, userId, missionId] as const,

  byUser: (userId: string) => [EVIDENCE_ROOT, "user", userId] as const,

  completionState: (userId: string, missionId: string) =>
    [EVIDENCE_ROOT, "completion", userId, missionId] as const,
};

export const proposalKeys = {
  all: (filters?: {
    region?: "costa" | "sierra" | "selva";
    status?: "pending" | "active" | "resolved" | "rejected";
    district?: string;
  }) => [PROPOSALS_ROOT, "all", filters] as const,

  detail: (proposalId: string) => [PROPOSALS_ROOT, "detail", proposalId] as const,

  userProposals: (userId: string) => [PROPOSALS_ROOT, "user", userId] as const,
};

export const proposalSupportKeys = {
  root: [PROPOSAL_SUPPORTS_ROOT] as const,
  byUser: (userId: string) => [PROPOSAL_SUPPORTS_ROOT, "user", userId] as const,
  byProposal: (proposalId: string) => [PROPOSAL_SUPPORTS_ROOT, "proposal", proposalId] as const,
  count: (proposalId: string) => [PROPOSAL_SUPPORTS_ROOT, "proposal", proposalId, "count"] as const,
  supportersPreview: (proposalId: string, limit: number) =>
    [PROPOSAL_SUPPORTS_ROOT, "proposal", proposalId, "preview", limit] as const,
};

export const proposalCollaboratorKeys = {
  root: [PROPOSAL_COLLABORATORS_ROOT] as const,
  accepted: (proposalId: string) =>
    [PROPOSAL_COLLABORATORS_ROOT, "proposal", proposalId, "accepted"] as const,
  pendingForUser: (userId: string) =>
    [PROPOSAL_COLLABORATORS_ROOT, "user", userId, "pending"] as const,
};

export const proposalCommentKeys = {
  root: [PROPOSAL_COMMENTS_ROOT] as const,
  list: (proposalId: string, page: number) =>
    [PROPOSAL_COMMENTS_ROOT, "proposal", proposalId, "list", page] as const,
};
export const proposalCoalitionKeys = {
  root: [PROPOSAL_COALITION_ROOT] as const,
  byProposal: (proposalId: string) => [PROPOSAL_COALITION_ROOT, "proposal", proposalId] as const,
  stats: (proposalId: string) => [PROPOSAL_COALITION_ROOT, "stats", proposalId] as const,
};

export const proposalLifecycleKeys = {
  root: [PROPOSAL_LIFECYCLE_ROOT] as const,
  byProposal: (proposalId: string) => [PROPOSAL_LIFECYCLE_ROOT, "proposal", proposalId] as const,
};

export const districtKeys = {
  root: [DISTRICTS_ROOT] as const,
  all: (region?: "costa" | "sierra" | "selva") => [DISTRICTS_ROOT, "all", region ?? "all"] as const,
  bySlug: (slug: string) => [DISTRICTS_ROOT, "slug", slug] as const,
};

export const districtStatsKeys = {
  root: [DISTRICT_STATS_ROOT] as const,
  byId: (districtId: string) => [DISTRICT_STATS_ROOT, districtId] as const,
};

export const districtActivityKeys = {
  root: [DISTRICT_ACTIVITY_ROOT] as const,
  byId: (districtId: string, limit: number) => [DISTRICT_ACTIVITY_ROOT, districtId, limit] as const,
};

export const districtFeedKeys = {
  root: [DISTRICT_FEED_ROOT] as const,
  bySlug: (slug: string) => [DISTRICT_FEED_ROOT, "slug", slug] as const,
};

/** Ensures legacy key shapes remain prefixes of the central factory (dev-time guard). */

export function assertQueryKeyConsistency(): void {
  const sampleUserId = "00000000-0000-4000-8000-000000000001";

  const sampleMissionId = "00000000-0000-4000-8000-000000000002";

  if (missionKeys.all[0] !== MISSIONS_ROOT) {
    throw new Error("missionKeys.all root mismatch");
  }

  if (userMissionKeys.completed(sampleUserId)[0] !== USER_MISSIONS_ROOT) {
    throw new Error("userMissionKeys root mismatch");
  }

  if (userProgressKeys.territory("live")[0] !== USER_PROGRESS_ROOT) {
    throw new Error("userProgressKeys root mismatch");
  }

  if (!missionKeys.detail(sampleMissionId).includes(sampleMissionId)) {
    throw new Error("missionKeys.detail must include missionId");
  }

  if (notificationKeys.inbox(sampleUserId)[0] !== NOTIFICATIONS_ROOT) {
    throw new Error("notificationKeys root mismatch");
  }
}
