/**
 * Mission evidence upload mutation (storage + DB).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { evidenceKeys } from "@/lib/queryKeys";
import { isEvidenceUploadEnabled } from "@/lib/operationalFeature";
import { evidenceRepository } from "@/services/evidenceRepository";
import { userSessionQueryOptions } from "@/features/auth/queryOptions";

type UploadMissionEvidenceInput = {
  missionId: string;
  file: File;
  caption?: string;
};

export function useUploadMissionEvidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadMissionEvidenceInput) => {
      if (!isEvidenceUploadEnabled()) {
        throw new Error("Evidence upload is disabled");
      }
      const userId = await queryClient.fetchQuery(userSessionQueryOptions());
      if (!userId) throw new Error("No authenticated user");
      return evidenceRepository.uploadEvidence({
        userId,
        missionId: input.missionId,
        file: input.file,
        caption: input.caption,
      });
    },
    onSuccess: (row) => {
      void queryClient.invalidateQueries({ queryKey: evidenceKeys.byMission(row.missionId) });
      void queryClient.invalidateQueries({
        queryKey: evidenceKeys.byUserMission(row.userId, row.missionId),
      });
    },
  });
}
