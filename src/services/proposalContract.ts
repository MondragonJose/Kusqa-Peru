/**
 * Proposal Contract — Canonical domain types for the proposal system.
 *
 * This is the SINGLE SOURCE OF TRUTH for proposal data shapes.
 * All layers (UI, hook, repository) reference these types.
 *
 * Naming convention:
 *   - Domain types use camelCase (what the app works with)
 *   - DB types use snake_case (internal to repository only)
 *   - UI never sees DB shape, repository never leaks DB types
 *
 * TYPE BOUNDARY RISK: supabase.generated.ts does not contain the
 * proposals table. DbProposalRow is defined manually from the SQL
 * migration. Regenerate with:
 *   supabase gen types typescript --local > src/types/supabase.generated.ts
 */

// ─── Region / Category literals (shared across system) ─────────────────────

import type { Region } from "@/domain/regions";

export {
  CATEGORIES as PROPOSAL_CATEGORIES,
  type MissionCategory as ProposalCategory,
} from "@/domain/categories";

export const PROPOSAL_STATUSES = ["pending", "active", "resolved", "rejected"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

// ─── DB row type (snake_case, matches SQL schema exactly) ──────────────────
// Source: supabase/migrations/20260524130000_create_proposals.sql
//   team_size: integer not null check (team_size >= 3 and team_size <= 80)
//   images: text[] default '{}'
//   status: text not null default 'pending'

export type DbProposalRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  district: string;
  region: Region;
  team_size: number;
  images: string[] | null;
  status: ProposalStatus;
  /** PostgreSQL `numeric` → Supabase JS returns string, not number */
  latitude: string | null;
  /** PostgreSQL `numeric` → Supabase JS returns string, not number */
  longitude: string | null;
  proposed_date: string | null;
  /** FK to districts (Phase 3A). Nullable — text `district` remains source of truth. */
  district_id: string | null;
  /** Optional 280-char preview used in cards and feeds. */
  summary: string | null;
  /** Optional author voice: why this matters in the author's district. */
  why: string | null;
  /** Optional human-readable place label. */
  location_label: string | null;
  created_at: string;
  updated_at: string;
  /** Phase 10B: lifecycle timestamp — when support threshold was first met. */
  ready_at: string | null;
  /** Phase 10B: lifecycle timestamp — when proposal was converted to mission. */
  converted_at: string | null;
  /** Phase 10B: lifecycle timestamp — when the mission was completed. */
  completed_at: string | null;
  /** Phase 3B: FK to the mission created from this proposal. */
  has_converted_mission_id: string | null;
};

// ─── Domain model (camelCase, what the app works with) ─────────────────────

export type Proposal = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: string;
  district: string;
  region: Region;
  teamSize: number;
  images: string[];
  status: ProposalStatus;
  latitude: number | null;
  longitude: number | null;
  proposedDate: string | null;
  /** FK to districts (Phase 3A). */
  districtId: string | null;
  /** Optional 280-char preview. Falls back to description at render time. */
  summary: string | null;
  /** Optional author voice. Falls back to a neutral prompt when null. */
  why: string | null;
  /** Optional human place label. Independent from lat/lng. */
  locationLabel: string | null;
  createdAt: string;
  updatedAt: string;
  /** Phase 10B: persisted lifecycle timestamps. Null before milestone is reached. */
  readyAt: string | null;
  convertedAt: string | null;
  completedAt: string | null;
  /** FK to the mission created from this proposal (Phase 3B). */
  hasConvertedMissionId: string | null;
};

// ─── Input DTOs (what UI sends — no user_id, no DB concerns) ──────────────

export type CreateProposalDTO = {
  title: string;
  description?: string;
  category: string;
  district: string;
  region: Region;
  teamSize?: number;
  images?: string[];
  latitude?: number;
  longitude?: number;
  proposedDate?: string;
  summary?: string;
  why?: string;
  locationLabel?: string;
};

export type UpdateProposalDTO = Partial<{
  title: string;
  description: string;
  category: string;
  district: string;
  region: Region;
  teamSize: number;
  images: string[];
  status: ProposalStatus;
  latitude: number;
  longitude: number;
  proposedDate: string;
  summary: string;
  why: string;
  locationLabel: string;
}>;

// ─── Result type (deterministic outcome for every operation) ───────────────

export type ProposalResult<T = Proposal> =
  | { status: "success"; data: T }
  | { status: "partial_success"; data: T; warnings: string[] }
  | { status: "error"; error: string };

// ─── Proposal support types ─────────────────────────────────────────────────

export type ProposalSupporterPreview = {
  userId: string;
  username: string;
  firstName: string;
  avatarUrl: string | null;
  supportedAt: string;
};

// ─── DB defaults derived from SQL schema constraints ───────────────────────

export const DB_DEFAULTS = {
  /** SQL: check (team_size >= 3 and team_size <= 80) */
  TEAM_SIZE_MIN: 3,
  TEAM_SIZE_MAX: 80,
  TEAM_SIZE_FALLBACK: 3,
  STATUS_DEFAULT: "pending" as ProposalStatus,
  /** SQL: proposals_summary_length_chk */
  SUMMARY_MAX: 280,
  /** SQL: proposals_why_length_chk */
  WHY_MAX: 600,
  /** SQL: proposals_location_label_length_chk */
  LOCATION_LABEL_MAX: 200,
  /** SQL: proposal_collaborators.message check */
  COLLABORATOR_MESSAGE_MAX: 600,
  /** SQL: proposal_comments.content check */
  COMMENT_MIN: 1,
  COMMENT_MAX: 1200,
  /** Edit window for a comment (24h) — enforced at the service layer */
  COMMENT_EDIT_WINDOW_MS: 24 * 60 * 60 * 1000,
  /** Support threshold floor (lowest team_size branch) */
  SUPPORT_THRESHOLD_MIN: 3,
  /** Multiplier for default threshold: ceil(team_size * 0.3) */
  SUPPORT_THRESHOLD_RATIO: 0.3,
} as const;

// ─── Coalition: collaborators ───────────────────────────────────────────────

export type CollaboratorRole = "co_steward" | "ally";

export type CollaboratorStatus = "pending" | "accepted" | "declined";

export type ProposalCollaborator = {
  id: string;
  initiativeId: string;
  userId: string;
  username: string;
  firstName: string;
  avatarUrl: string | null;
  role: CollaboratorRole;
  status: CollaboratorStatus;
  invitedBy: string | null;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
};

export type CreateCollaboratorInvitationDTO = {
  initiativeId: string;
  /** Target user (must already be a registered KUSQA member) */
  userId: string;
  role: CollaboratorRole;
  message?: string;
};

export type RespondToInvitationDTO = {
  collaboratorId: string;
  response: "accepted" | "declined";
};

// ─── Coalition: comments (proposal-specific, legacy) ────────────────────────

export type ProposalComment = {
  id: string;
  proposalId: string;
  authorId: string;
  authorUsername: string;
  authorFirstName: string;
  authorAvatarUrl: string | null;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  /** True if the comment is editable by the current user (within 24h, not deleted) */
  isEditable: boolean;
  /** True if the comment is soft-deleted (shown as placeholder) */
  isDeleted: boolean;
};

export type CreateCommentDTO = {
  proposalId: string;
  content: string;
  parentCommentId?: string | null;
};

export type EditCommentDTO = {
  commentId: string;
  content: string;
};

export type ListCommentsResult = {
  comments: ProposalComment[];
  total: number;
  hasMore: boolean;
};

// ─── Unified initiative wall (both missions & proposals) ────────────────────

export type InitiativeType = "proposal" | "mission";

export type InitiativeComment = {
  id: string;
  initiativeId: string;
  initiativeType: InitiativeType;
  authorId: string;
  authorUsername: string;
  authorFirstName: string;
  authorAvatarUrl: string | null;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  isEditable: boolean;
  isDeleted: boolean;
};

export type CreateInitiativeCommentDTO = {
  initiativeId: string;
  initiativeType: InitiativeType;
  content: string;
  parentCommentId?: string | null;
};

export type ListInitiativeCommentsResult = {
  comments: InitiativeComment[];
  total: number;
  hasMore: boolean;
};

// ─── Coalition: stats + composite coalition view ────────────────────────────

export type ProposalSupportStats = {
  proposalId: string;
  supportCount: number;
  collaboratorCount: number;
  acceptedCollaboratorCount: number;
};

export type ProposalCoalition = {
  proposalId: string;
  stats: ProposalSupportStats;
  /** Author is always the first entry, even if not in accepted collaborators. */
  author: {
    userId: string;
    username: string;
    firstName: string;
    avatarUrl: string | null;
  };
  /** Accepted collaborators only (public coalition). */
  collaborators: ProposalCollaborator[];
};
