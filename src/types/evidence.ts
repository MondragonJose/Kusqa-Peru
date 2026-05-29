/**
 * Evidence & Verification System — canonical domain types.
 *
 * This is the SINGLE SOURCE OF TRUTH for evidence data shapes.
 * All layers (UI, hooks, repository) reference these types.
 *
 * Naming convention:
 *   - Domain types use camelCase (what the app works with)
 *   - DB types use snake_case (internal to repository only)
 *   - UI never sees DB shape, repository never leaks DB types
 *
 * The existing mission_evidence.moderatio_status maps as:
 *   'approved' → 'verified'
 *   'pending'  → 'pending'
 *   'rejected' → 'rejected'
 *   'flagged'  → 'flagged'
 */

// ─── Evidence type ─────────────────────────────────────────────────────────

export const EVIDENCE_TYPES = ["photo", "text", "checkpoint", "mixed"] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

/** Human-readable labels for each evidence type */
export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  photo: "Fotografía",
  text: "Relato",
  checkpoint: "Punto de control",
  mixed: "Relato con foto",
};

// ─── Evidence status (domain canonical) ────────────────────────────────────

export const EVIDENCE_STATUSES = ["pending", "verified", "rejected", "flagged"] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

/** Human-readable labels for evidence lifecycle states */
export const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  pending: "Pendiente de verificación",
  verified: "Verificada",
  rejected: "Rechazada",
  flagged: "Marcada para revisión",
};

/** Color classes for status badges */
export const EVIDENCE_STATUS_STYLES: Record<EvidenceStatus, string> = {
  pending: "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
  verified: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
  rejected: "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30",
  flagged: "bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30",
};

// ─── Mission completion state (derived from evidence status) ─────────────

export const COMPLETION_STATES = ["not_completed", "awaiting_verification", "completed"] as const;
export type CompletionState = (typeof COMPLETION_STATES)[number];

export const COMPLETION_STATE_LABELS: Record<CompletionState, string> = {
  not_completed: "En ruta",
  awaiting_verification: "Esperando verificación",
  completed: "Completada",
};

// ─── DB row type (snake_case, matches SQL schema exactly) ──────────────────
// Source: supabase/migrations/20260526120000_phase_b_operational_readiness.sql
//         supabase/migrations/20260529100000_evidence_verification_schema.sql

export type DbEvidenceRow = {
  id: string;
  mission_id: string;
  user_id: string;
  evidence_type: string;
  storage_path: string | null;
  mime_type: string | null;
  byte_size: number | null;
  width_px: number | null;
  height_px: number | null;
  caption: string | null;
  description: string | null;
  media_urls: string[] | null;
  location_lat: number | null;
  location_lng: number | null;
  moderation_status: string;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type DbEvidenceInsert = {
  mission_id: string;
  user_id: string;
  evidence_type: string;
  storage_path?: string | null;
  mime_type?: string | null;
  byte_size?: number | null;
  caption?: string | null;
  description?: string | null;
  media_urls?: string[];
};

export type DbEvidenceUpdate = Partial<Omit<DbEvidenceInsert, "user_id" | "mission_id">>;

// ─── Domain model (camelCase, what the app works with) ─────────────────────

export type Evidence = {
  id: string;
  missionId: string;
  userId: string;
  type: EvidenceType;
  storagePath: string | null;
  mimeType: string | null;
  byteSize: number | null;
  widthPx: number | null;
  heightPx: number | null;
  caption: string | null;
  description: string | null;
  mediaUrls: string[];
  locationLat: number | null;
  locationLng: number | null;
  verificationStatus: EvidenceStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
};

// ─── Derived lifecycle info (never stored, always computed) ────────────────

export type EvidenceLifecycleInfo = {
  status: EvidenceStatus;
  isVisible: boolean;
  isVerifiable: boolean;
  contributesToCompletion: boolean;
  contributesToTrust: boolean;
};

// ─── Input DTOs ────────────────────────────────────────────────────────────

export type CreateEvidenceDTO = {
  missionId: string;
  type: EvidenceType;
  description?: string;
  caption?: string;
  /** For photo/mixed: the file to upload. null for text/checkpoint. */
  file?: File;
  locationLat?: number;
  locationLng?: number;
};

export type VerifyEvidenceDTO = {
  evidenceId: string;
  status: Extract<EvidenceStatus, "verified" | "rejected">;
  rejectionReason?: string;
};

// ─── Constants ─────────────────────────────────────────────────────────────

export const EVIDENCE_VERIFICATION_REQUIRED = true;
export const MAX_EVIDENCE_DESCRIPTION_LENGTH = 2000;
export const MAX_EVIDENCE_CAPTION_LENGTH = 500;
