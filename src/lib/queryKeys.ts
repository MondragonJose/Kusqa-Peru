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



export const missionKeys = {

  all: [MISSIONS_ROOT] as const,

  detail: (missionId: string) => [MISSIONS_ROOT, "detail", missionId] as const,

};



export const userKeys = {

  session: [USER_ROOT, "session"] as const,

  current: [USER_ROOT, "current"] as const,

  profileRow: (userId: string) => [USER_ROOT, "profile", userId] as const,

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

  byUserMission: (userId: string, missionId: string) =>

    [EVIDENCE_ROOT, userId, missionId] as const,

  byUser: (userId: string) => [EVIDENCE_ROOT, "user", userId] as const,

  completionState: (userId: string, missionId: string) =>

    [EVIDENCE_ROOT, "completion", userId, missionId] as const,

};



export const proposalKeys = {

  all: (filters?: { region?: "costa" | "sierra" | "selva"; status?: "pending" | "active" | "resolved" | "rejected"; district?: string }) =>
    [PROPOSALS_ROOT, "all", filters] as const,

  detail: (proposalId: string) => [PROPOSALS_ROOT, "detail", proposalId] as const,

  userProposals: (userId: string) => [PROPOSALS_ROOT, "user", userId] as const,

};

export const proposalSupportKeys = {
  root: [PROPOSAL_SUPPORTS_ROOT] as const,
  byUser: (userId: string) => [PROPOSAL_SUPPORTS_ROOT, "user", userId] as const,
  byProposal: (proposalId: string) => [PROPOSAL_SUPPORTS_ROOT, "proposal", proposalId] as const,
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


