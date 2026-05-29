/**
 * Evidence Contract — DB ↔ domain mapping for the evidence system.
 *
 * Following the proposalContract pattern:
 *   - DbEvidenceRow (snake_case, matches SQL schema)
 *   → Evidence (camelCase, what the app works with)
 *
 * This file is the ONLY place where this mapping occurs.
 */

import type { Evidence, EvidenceType, DbEvidenceRow, DbEvidenceInsert } from "@/types/evidence";
import { mapModerationStatus } from "@/domain/evidence";

/**
 * Map a raw DB row to the domain Evidence model.
 * Defensive: unknown evidence_type defaults to 'photo'.
 */
export function dbEvidenceToDomain(row: DbEvidenceRow): Evidence {
  const evidenceType: EvidenceType = EVIDENCE_TYPE_MAP[row.evidence_type] ?? "photo";

  return {
    id: row.id,
    missionId: row.mission_id,
    userId: row.user_id,
    type: evidenceType,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    widthPx: row.width_px,
    heightPx: row.height_px,
    caption: row.caption,
    description: row.description,
    mediaUrls: row.media_urls ?? [],
    locationLat: row.location_lat,
    locationLng: row.location_lng,
    verificationStatus: mapModerationStatus(row.moderation_status),
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const EVIDENCE_TYPE_MAP: Record<string, EvidenceType> = {
  photo: "photo",
  text: "text",
  checkpoint: "checkpoint",
  mixed: "mixed",
};

/**
 * Map domain EvidenceType to DB storage value.
 */
export function evidenceTypeToDb(type: EvidenceType): string {
  return type;
}

/**
 * Build a DB insert payload from domain fields.
 */
export function evidenceToDbInsert(
  missionId: string,
  userId: string,
  type: EvidenceType,
  options?: {
    storagePath?: string;
    mimeType?: string;
    byteSize?: number;
    caption?: string;
    description?: string;
    mediaUrls?: string[];
  }
): DbEvidenceInsert {
  return {
    mission_id: missionId,
    user_id: userId,
    evidence_type: evidenceTypeToDb(type),
    storage_path: options?.storagePath ?? null,
    mime_type: options?.mimeType ?? null,
    byte_size: options?.byteSize ?? null,
    caption: options?.caption ?? null,
    description: options?.description ?? null,
    media_urls: options?.mediaUrls ?? [],
  };
}
