/**
 * Mission evidence upload + submission hooks.
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { evidenceKeys } from "@/lib/queryKeys";
import { EVIDENCE_FEED_STALE_MS, EVIDENCE_FEED_GC_MS } from "@/lib/queryCache";
import { submitEvidence, verifyEvidence } from "@/services/evidenceService";
import { evidenceRepository } from "@/services/evidenceRepository";
import { consumeRateLimit, getRateLimitResetMs } from "@/lib/rateLimiter";
import type { Evidence, EvidenceType, CompletionState } from "@/types";

// ─── Query hooks ──────────────────────────────────────────────────────────

export function useMissionEvidence(missionId: string) {
  return useQuery({
    queryKey: evidenceKeys.byMission(missionId),
    queryFn: () => evidenceRepository.findByMissionId(missionId),
    staleTime: EVIDENCE_FEED_STALE_MS,
    gcTime: EVIDENCE_FEED_GC_MS,
    enabled: missionId.length > 0,
  });
}

export function useUserEvidenceByMission(userId: string, missionId: string) {
  return useQuery({
    queryKey: evidenceKeys.byUserMission(userId, missionId),
    queryFn: () => evidenceRepository.findByUserAndMission(userId, missionId),
    staleTime: EVIDENCE_FEED_STALE_MS,
    gcTime: EVIDENCE_FEED_GC_MS,
    enabled: userId.length > 0 && missionId.length > 0,
  });
}

export function useUserEvidence(userId: string) {
  return useQuery({
    queryKey: evidenceKeys.byUser(userId),
    queryFn: () => evidenceRepository.findByUserId(userId),
    staleTime: EVIDENCE_FEED_STALE_MS,
    gcTime: EVIDENCE_FEED_GC_MS,
    enabled: userId.length > 0,
  });
}

// ─── Text/Checkpoint evidence mutation ────────────────────────────────────

type SubmitEvidenceInput = {
  missionId: string;
  type: EvidenceType;
  description?: string;
  caption?: string;
  file?: File;
};

export function useSubmitEvidence() {
  return useMutation({
    mutationFn: (input: SubmitEvidenceInput) => submitEvidence(input),
    // Propagation handled centrally by eventHandlers on EvidenceSubmitted
  });
}

// ─── Photo upload mutation (existing, updated for new types) ──────────────

type UploadMissionEvidenceInput = {
  missionId: string;
  type?: EvidenceType;
  file: File;
  caption?: string;
  description?: string;
};

export function useUploadMissionEvidence() {
  return useMutation({
    mutationFn: (input: UploadMissionEvidenceInput) => {
      if (!consumeRateLimit("uploadEvidence")) {
        const resetMs = getRateLimitResetMs("uploadEvidence");
        throw new Error(`Demasiadas subidas. Intenta de nuevo en ${Math.ceil(resetMs / 1000)}s.`);
      }
      return submitEvidence({
        missionId: input.missionId,
        type: input.type ?? "photo",
        caption: input.caption,
        description: input.description,
        file: input.file,
      });
    },
    // Propagation handled centrally by eventHandlers on EvidenceSubmitted
  });
}

// ─── Verify evidence mutation (admin/moderator) ───────────────────────────

type VerifyEvidenceInput = {
  evidenceId: string;
  status: "verified" | "rejected";
  rejectionReason?: string;
};

export function useVerifyEvidence() {
  return useMutation({
    mutationFn: (input: VerifyEvidenceInput) =>
      verifyEvidence(input.evidenceId, input.status, input.rejectionReason),
    // Propagation handled centrally by eventHandlers on EvidenceVerified / EvidenceRejected
  });
}
