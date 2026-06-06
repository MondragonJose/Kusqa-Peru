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

export const PROPOSAL_REGIONS = ["costa", "sierra", "selva"] as const;
export type ProposalRegion = (typeof PROPOSAL_REGIONS)[number];

export const PROPOSAL_CATEGORIES = [
  "Medio ambiente",
  "Educación",
  "Arte & cultura",
  "Comunidad",
  "Salud",
  "Tecnología",
] as const;
export type ProposalCategory = (typeof PROPOSAL_CATEGORIES)[number];

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
  region: ProposalRegion;
  team_size: number;
  images: string[] | null;
  status: ProposalStatus;
  /** PostgreSQL `numeric` → Supabase JS returns string, not number */
  latitude: string | null;
  /** PostgreSQL `numeric` → Supabase JS returns string, not number */
  longitude: string | null;
  proposed_date: string | null;
  /** Optional 280-char preview used in cards and feeds. */
  summary: string | null;
  /** Optional author voice: why this matters in the author's district. */
  why: string | null;
  /** Optional human-readable place label. */
  location_label: string | null;
  created_at: string;
  updated_at: string;
};

export type DbProposalInsert = {
  user_id: string;
  title: string;
  description?: string | null;
  category: string;
  district: string;
  region: string;
  team_size: number;
  images?: string[];
  status?: string;
  latitude?: number | null;
  longitude?: number | null;
  summary?: string | null;
  why?: string | null;
  location_label?: string | null;
};

export type DbProposalUpdate = Partial<Omit<DbProposalInsert, "user_id">>;

// ─── Domain model (camelCase, what the app works with) ─────────────────────

export type Proposal = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: string;
  district: string;
  region: ProposalRegion;
  teamSize: number;
  images: string[];
  status: ProposalStatus;
  latitude: number | null;
  longitude: number | null;
  proposedDate: string | null;
  /** Optional 280-char preview. Falls back to description at render time. */
  summary: string | null;
  /** Optional author voice. Falls back to a neutral prompt when null. */
  why: string | null;
  /** Optional human place label. Independent from lat/lng. */
  locationLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Input DTOs (what UI sends — no user_id, no DB concerns) ──────────────

export type CreateProposalDTO = {
  title: string;
  description?: string;
  category: string;
  district: string;
  region: ProposalRegion;
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
  region: ProposalRegion;
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

export type DbProposalSupportRow = {
  id: string;
  user_id: string;
  proposal_id: string;
  created_at: string;
};

export type ProposalSupport = {
  id: string;
  userId: string;
  proposalId: string;
  createdAt: string;
};

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
} as const;
