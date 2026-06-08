/**
 * Mission evidence repository — DB persistence for civic evidence.
 *
 * Operates on the mission_evidence table.
 * Use evidenceContract.ts for DB→domain mapping.
 */

import { supabase } from "@/lib/supabase";
import {
  dbEvidenceToDomain,
  evidenceToDbInsert,
  evidenceTypeToDb,
} from "@/services/evidenceContract";
import type { Evidence, EvidenceType, DbEvidenceRow } from "@/types/evidence";
import { mapEvidenceToModeration } from "@/domain/evidence";

const EVIDENCE_SELECT = "*";

function logDev(...args: unknown[]) {
  if (import.meta.env.DEV) console.log(...args);
}

export const evidenceRepository = {
  /**
   * Fetch evidence for a mission (contribution feed).
   */
  async findByMissionId(missionId: string): Promise<Evidence[]> {
    const { data, error } = await supabase
      .from("mission_evidence")
      .select(EVIDENCE_SELECT)
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[evidenceRepository] findByMissionId error:", error);
      throw new Error(`Failed to fetch evidence: ${error.message}`);
    }

    return (data ?? []).map((row: any) => dbEvidenceToDomain(row as DbEvidenceRow));
  },

  /**
   * Fetch evidence for a specific user on a mission.
   * Used to determine completion state.
   */
  async findByUserAndMission(userId: string, missionId: string): Promise<Evidence[]> {
    const { data, error } = await supabase
      .from("mission_evidence")
      .select(EVIDENCE_SELECT)
      .eq("user_id", userId)
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[evidenceRepository] findByUserAndMission error:", error);
      throw new Error(`Failed to fetch evidence: ${error.message}`);
    }

    return (data ?? []).map((row: any) => dbEvidenceToDomain(row as DbEvidenceRow));
  },

  /**
   * Fetch all evidence submitted by a user (for profile).
   */
  async findByUserId(userId: string): Promise<Evidence[]> {
    const { data, error } = await supabase
      .from("mission_evidence")
      .select(EVIDENCE_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[evidenceRepository] findByUserId error:", error);
      throw new Error(`Failed to fetch evidence: ${error.message}`);
    }

    return (data ?? []).map((row: any) => dbEvidenceToDomain(row as DbEvidenceRow));
  },

  /**
   * Create text/checkpoint evidence (no file upload).
   */
  async createTextEvidence(
    missionId: string,
    userId: string,
    type: EvidenceType,
    description: string,
    options?: { caption?: string; locationLat?: number; locationLng?: number },
  ): Promise<Evidence> {
    const insert = evidenceToDbInsert(missionId, userId, type, {
      description,
      caption: options?.caption,
      mediaUrls: [],
    });

    const { data, error } = await supabase
      .from("mission_evidence")
      .insert(insert as Record<string, unknown>)
      .select()
      .single();

    if (error) {
      console.error("[evidenceRepository] createTextEvidence error:", error);
      throw new Error(`Failed to create evidence: ${error.message}`);
    }

    logDev(`[evidenceRepository] Created ${type} evidence ${data.id} for mission ${missionId}`);
    return dbEvidenceToDomain(data as DbEvidenceRow);
  },

  /**
   * Create photo/mixed evidence (with storage upload).
   * Delegates file upload to evidenceStorage, then persists metadata.
   */
  async createPhotoEvidence(
    missionId: string,
    userId: string,
    type: EvidenceType,
    evidenceId: string,
    storagePath: string,
    mimeType: string,
    byteSize: number,
    options?: {
      caption?: string;
      description?: string;
      mediaUrls?: string[];
      widthPx?: number;
      heightPx?: number;
    },
  ): Promise<Evidence> {
    const insert = evidenceToDbInsert(missionId, userId, type, {
      storagePath,
      mimeType,
      byteSize,
      caption: options?.caption,
      description: options?.description,
      mediaUrls: options?.mediaUrls,
    });

    const { data, error } = await supabase
      .from("mission_evidence")
      .insert({ id: evidenceId, ...(insert as Record<string, unknown>) })
      .select()
      .single();

    if (error) {
      console.error("[evidenceRepository] createPhotoEvidence error:", error);
      throw new Error(`Failed to persist evidence row: ${error.message}`);
    }

    logDev(`[evidenceRepository] Created ${type} evidence ${data.id} for mission ${missionId}`);
    return dbEvidenceToDomain(data as DbEvidenceRow);
  },

  /**
   * Verify or reject evidence.
   * Sets verification_status, verified_by, verified_at, rejection_reason.
   * Self-verification is forbidden (enforced in domain layer).
   */
  async verifyEvidence(
    evidenceId: string,
    verifierId: string,
    status: "verified" | "rejected",
    rejectionReason?: string,
  ): Promise<Evidence> {
    const update: Record<string, unknown> = {
      moderation_status: mapEvidenceToModeration(status),
      verified_by: verifierId,
      verified_at: new Date().toISOString(),
    };

    if (status === "rejected" && rejectionReason) {
      update.rejection_reason = rejectionReason;
    }

    const { data, error } = await supabase
      .from("mission_evidence")
      .update(update)
      .eq("id", evidenceId)
      .select()
      .single();

    if (error) {
      console.error("[evidenceRepository] verifyEvidence error:", error);
      throw new Error(`Failed to verify evidence: ${error.message}`);
    }

    logDev(`[evidenceRepository] Evidence ${evidenceId} → ${status}`);
    return dbEvidenceToDomain(data as DbEvidenceRow);
  },

  /**
   * Check if user has pending evidence for a mission.
   */
  async hasPendingEvidence(userId: string, missionId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from("mission_evidence")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .eq("mission_id", missionId)
      .eq("moderation_status", "pending");

    if (error) {
      console.error("[evidenceRepository] hasPendingEvidence error:", error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  },

  /**
   * Count evidence by status for a mission/user.
   */
  async countByStatus(userId: string, missionId: string, status: string): Promise<number> {
    const { count, error } = await supabase
      .from("mission_evidence")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("mission_id", missionId)
      .eq("moderation_status", status);

    if (error) {
      console.error("[evidenceRepository] countByStatus error:", error);
      return 0;
    }

    return count ?? 0;
  },

  /**
   * Bulk evidence status for all missions a user participates in.
   * Used by getUserMissions to derive completionState.
   */
  async getPendingEvidenceMap(userId: string, missionIds: string[]): Promise<Map<string, boolean>> {
    if (missionIds.length === 0) return new Map();

    const { data, error } = await supabase
      .from("mission_evidence")
      .select("mission_id")
      .eq("user_id", userId)
      .eq("moderation_status", "pending")
      .in("mission_id", missionIds);

    if (error) {
      console.error("[evidenceRepository] getPendingEvidenceMap error:", error);
      return new Map();
    }

    const pendingMap = new Map<string, boolean>();
    for (const missionId of missionIds) {
      pendingMap.set(missionId, false);
    }
    for (const row of data ?? []) {
      pendingMap.set(row.mission_id, true);
    }
    return pendingMap;
  },
};
