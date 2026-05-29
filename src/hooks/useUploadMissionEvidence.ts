/**
 * Mission evidence upload + submission hooks.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { evidenceKeys } from "@/lib/queryKeys";
import { EVIDENCE_FEED_STALE_MS, EVIDENCE_FEED_GC_MS } from "@/lib/queryCache";
import { submitEvidence, verifyEvidence } from "@/services/missions";
import { evidenceRepository } from "@/services/evidenceRepository";
import { userSessionQueryOptions } from "@/features/auth/queryOptions";
import { resolveAuthenticatedUserId } from "@/features/auth/mutations/authMutationContext";
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitEvidenceInput) => {
      const userId = await queryClient.fetchQuery(userSessionQueryOptions());
      if (!userId) throw new Error("No authenticated user");
      return submitEvidence({ ...input, userId });
    },
    onSuccess: (evidence) => {
      void queryClient.invalidateQueries({
        queryKey: evidenceKeys.byMission(evidence.missionId),
      });
      void queryClient.invalidateQueries({
        queryKey: evidenceKeys.byUserMission(evidence.userId, evidence.missionId),
      });
      void queryClient.invalidateQueries({
        queryKey: evidenceKeys.byUser(evidence.userId),
      });
      void queryClient.invalidateQueries({
        queryKey: evidenceKeys.completionState(evidence.userId, evidence.missionId),
      });
    },
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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadMissionEvidenceInput) => {
      const userId = await queryClient.fetchQuery(userSessionQueryOptions());
      if (!userId) throw new Error("No authenticated user");
      return submitEvidence({
        userId,
        missionId: input.missionId,
        type: input.type ?? "photo",
        caption: input.caption,
        description: input.description,
        file: input.file,
      });
    },
    onSuccess: (evidence) => {
      void queryClient.invalidateQueries({
        queryKey: evidenceKeys.byMission(evidence.missionId),
      });
      void queryClient.invalidateQueries({
        queryKey: evidenceKeys.byUserMission(evidence.userId, evidence.missionId),
      });
    },
  });
}

// ─── Verify evidence mutation (admin/moderator) ───────────────────────────

type VerifyEvidenceInput = {
  evidenceId: string;
  status: "verified" | "rejected";
  rejectionReason?: string;
};

export function useVerifyEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: VerifyEvidenceInput) => {
      const userId = await queryClient.fetchQuery(userSessionQueryOptions());
      if (!userId) throw new Error("No authenticated user");
      return verifyEvidence(input.evidenceId, userId, input.status, input.rejectionReason);
    },
    onSuccess: (evidence) => {
      void queryClient.invalidateQueries({
        queryKey: evidenceKeys.byMission(evidence.missionId),
      });
      void queryClient.invalidateQueries({
        queryKey: evidenceKeys.completionState(evidence.userId, evidence.missionId),
      });
    },
  });
}
