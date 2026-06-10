/**
 * Evidence Service — business logic for evidence submission and verification.
 *
 * Orchestrates: lifecycle validation → storage upload (photo/mixed) →
 * evidenceRepository persist → event emission.
 * Replaces the evidence logic previously in services/missions.ts.
 */

import { supabase } from "@/lib/supabase";
import { resolveAuthenticatedUserId } from "@/services/_resolveAuth";
import { getMissionById } from "@/services/missions";
import { evidenceRepository } from "@/services/evidenceRepository";
import { participationRepository } from "@/services/participationRepository";
import {
  uploadMissionEvidence,
  buildEvidenceStoragePath,
  validateEvidenceFile,
} from "@/services/storage/evidenceStorage";
import { emit } from "@/domain/eventEmitter";
import {
  createEvidenceSubmittedEvent,
  createEvidenceVerifiedEvent,
  createEvidenceRejectedEvent,
} from "@/domain/events";
import type { Evidence, EvidenceType, CompletionState } from "@/types";

const logDev = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    console.log(...args);
  }
};

/**
 * Submit mission evidence — the canonical completion flow.
 *
 * For photo/mixed types: uploads file to storage, creates evidence row (pending).
 * For text/checkpoint types: creates evidence row with description (pending).
 *
 * Evidence MUST be verified (by a non-self verifier) for the mission to be completed.
 * Self-verification is forbidden at the domain layer.
 */
export async function submitEvidence(input: {
  missionId: string;
  type: EvidenceType;
  description?: string;
  caption?: string;
  file?: File;
}): Promise<Evidence> {
  const userId = await resolveAuthenticatedUserId();
  const { missionId, type, description, caption, file } = input;

  logDev(
    `[evidenceService] User ${userId} submitting ${type} evidence for mission ${missionId}...`,
  );

  // Lifecycle validation: only active/ending_soon missions can be completed
  const mission = await getMissionById(missionId);
  if (!mission) {
    throw new Error("Mission not found");
  }
  if (!mission.lifecycleInfo.isCompletable) {
    const state = mission.lifecycleInfo.lifecycle;
    if (state === "upcoming") throw new Error("Esta ruta aún no ha comenzado");
    if (state === "completed" || state === "archived")
      throw new Error("Esta ruta ya fue completada");
    throw new Error("Esta ruta no puede completarse en este momento");
  }

  // Check for existing pending evidence (prevent duplicate submissions)
  const hasPending = await evidenceRepository.hasPendingEvidence(userId, missionId);
  if (hasPending) {
    throw new Error("Ya tienes evidencia pendiente de verificación para esta ruta");
  }

  let evidence: Evidence;

  if (type === "photo" || type === "mixed") {
    if (!file) throw new Error("Se requiere un archivo para evidencia fotográfica");
    validateEvidenceFile(file);

    const evidenceId = crypto.randomUUID();
    const storagePath = buildEvidenceStoragePath(userId, missionId, evidenceId, file.type);

    const uploaded = await uploadMissionEvidence({
      userId,
      missionId,
      evidenceId,
      file,
    });

    evidence = await evidenceRepository.createPhotoEvidence(
      missionId,
      type,
      evidenceId,
      uploaded.storagePath,
      uploaded.mimeType,
      uploaded.byteSize,
      { caption, description, mediaUrls: [] },
    );
  } else {
    // text or checkpoint
    evidence = await evidenceRepository.createTextEvidence(missionId, type, description ?? "", {
      caption,
    });
  }

  emit(createEvidenceSubmittedEvent(evidence.id, userId, missionId, userId));
  return evidence;
}

/**
 * Verify or reject evidence.
 * Sets completion if evidence is verified (sets completed_at on mission_participants).
 * Self-verification is forbidden — verified_by must differ from evidence user_id.
 *
 * Operation ordering (preserved):
 *   A. Self-verification check
 *   B. Update mission_participants completed_at (for verified status)
 *   C. Update evidence row via evidenceRepository
 *   D. Emit event
 */
export async function verifyEvidence(
  evidenceId: string,
  status: "verified" | "rejected",
  rejectionReason?: string,
): Promise<Evidence> {
  const verifierId = await resolveAuthenticatedUserId();
  logDev(`[evidenceService] Verifier ${verifierId} → evidence ${evidenceId} → ${status}`);

  // A. Self-verification check (domain rule enforced at service boundary)
  const { data: evidenceRow, error: fetchError } = await supabase
    .from("mission_evidence")
    .select("id, user_id, mission_id")
    .eq("id", evidenceId)
    .single();

  if (fetchError || !evidenceRow) {
    throw new Error("Evidencia no encontrada");
  }

  if (evidenceRow.user_id === verifierId) {
    throw new Error("No puedes verificar tu propia evidencia");
  }

  // B. Atomicity: update mission_participants BEFORE evidence row.
  // If participants update fails, evidence stays pending and the caller
  // can retry. If evidence update fails after participants succeeded,
  // the mission shows "completed" without verified evidence — this is
  // equivalent to the legacy completeMission path and is defensive.
  if (status === "verified") {
    try {
      await participationRepository.markCompleted(evidenceRow.mission_id, evidenceRow.user_id);
    } catch (updateError: any) {
      console.error("[evidenceService] Failed to set completed_at:", updateError);
      throw new Error(`Error al completar la misión: ${updateError.message}`);
    }
  }

  // C. Update evidence row via evidenceRepository
  const evidence = await evidenceRepository.verifyEvidence(evidenceId, status, rejectionReason);

  // D. Emit event
  if (status === "verified") {
    emit(
      createEvidenceVerifiedEvent(
        evidenceId,
        evidenceRow.user_id,
        evidenceRow.mission_id,
        verifierId,
      ),
    );
  } else {
    emit(
      createEvidenceRejectedEvent(
        evidenceId,
        evidenceRow.user_id,
        evidenceRow.mission_id,
        verifierId,
        rejectionReason ?? null,
      ),
    );
  }

  logDev(`[evidenceService] Evidence ${evidenceId} → ${status}`);
  return evidence;
}

/**
 * Get completion state for a specific user-mission pair.
 */
export async function getCompletionState(
  userId: string,
  missionId: string,
): Promise<CompletionState> {
  try {
    const part = await participationRepository.findOne(missionId, userId);
    if (!part) return "not_completed";
    if (part.completedAt) return "completed";
  } catch {
    return "not_completed";
  }

  const hasPending = await evidenceRepository.hasPendingEvidence(userId, missionId);
  return hasPending ? "awaiting_verification" : "not_completed";
}

/**
 * Direct mission completion (legacy path).
 * Sets completed_at on mission_participants — no evidence verification.
 *
 * @deprecated Use submitEvidence() instead. Direct completion bypasses
 * evidence verification. Kept for backward compatibility until the
 * evidence system is fully deployed.
 */
export async function completeMission(missionId: string, userId: string): Promise<boolean> {
  logDev(
    `[evidenceService] User ${userId} completing mission ${missionId} (legacy direct path)...`,
  );

  // Lifecycle validation: only active/ending_soon missions can be completed
  const mission = await getMissionById(missionId);
  if (!mission) {
    throw new Error("Mission not found");
  }
  if (!mission.lifecycleInfo.isCompletable) {
    const state = mission.lifecycleInfo.lifecycle;
    if (state === "upcoming") {
      throw new Error("Esta ruta aún no ha comenzado");
    }
    if (state === "completed" || state === "archived") {
      throw new Error("Esta ruta ya fue completada");
    }
    throw new Error("Esta ruta no puede completarse en este momento");
  }

  try {
    await participationRepository.markCompleted(missionId, userId);
  } catch (error: any) {
    console.error("[evidenceService] Error completing mission:", error);
    throw new Error(`Failed to complete mission: ${error.message}`);
  }

  logDev(`[evidenceService] User ${userId} completed mission ${missionId}`);
  return true;
}
