/**
 * Profile Relationship Types — directional foundation for the profile page.
 *
 * These types describe how a user relates to proposals and missions, so the
 * future profile page can render "Apoyos", "Co-organiza" and "Misiones
 * completadas" sections without a re-shape of the underlying repositories.
 *
 * This module is INTENTIONALLY small. It is not wired to any UI yet. It is
 * the contract that the profile module will consume in a later phase.
 *
 * For now:
 *   - ProposalSupportSummary: light, denormalized view of a proposal the
 *     user supports. Sourced from `proposal_supports` joined to `proposals`.
 *   - ProposalCoauthorSummary: placeholder for the future co-organizer
 *     relationship. No DB column yet — included so the profile UI can
 *     stub the section without a redesign.
 *   - MissionCompletionSummary: directional placeholder for completed
 *     missions, sourced from `user_missions` joined to `missions`.
 */

import type { ProposalRegion } from "@/services/proposalContract";

export type ProposalSupportSummary = {
  proposalId: string;
  title: string;
  category: string;
  region: ProposalRegion;
  district: string;
  status: "pending" | "active" | "resolved" | "rejected";
  supportedAt: string;
};

export type ProposalCoauthorSummary = {
  proposalId: string;
  title: string;
  role: "coorganizer" | "mentor";
  since: string;
};

export type MissionCompletionSummary = {
  missionId: string;
  title: string;
  region: ProposalRegion;
  completedAt: string;
  xpEarned: number | null;
};

export type ProfileRelationship = {
  supportedProposals: ProposalSupportSummary[];
  coauthoredProposals: ProposalCoauthorSummary[];
  completedMissions: MissionCompletionSummary[];
};
