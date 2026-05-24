/**
 * Mission evidence repository — DB persistence for civic uploads.
 */

import { supabase } from "@/lib/supabase";
import {
  createEvidenceSignedUrl,
  deleteEvidenceObject,
  uploadMissionEvidence,
} from "@/services/storage/evidenceStorage";
import { z } from "zod";

export type MissionEvidenceRow = {
  id: string;
  missionId: string;
  userId: string;
  storagePath: string;
  mimeType: string;
  byteSize: number;
  caption: string | null;
  moderationStatus: "pending" | "approved" | "rejected" | "flagged";
  createdAt: string;
  previewUrl?: string;
};

const DB_EVIDENCE_SCHEMA = z.object({
  id: z.string().uuid(),
  mission_id: z.string().uuid(),
  user_id: z.string().uuid(),
  storage_path: z.string().min(1),
  mime_type: z.string().min(1),
  byte_size: z.number().int().positive(),
  caption: z.string().nullable(),
  moderation_status: z.enum(["pending", "approved", "rejected", "flagged"]),
  created_at: z.string(),
});

function toRow(row: z.infer<typeof DB_EVIDENCE_SCHEMA>): MissionEvidenceRow {
  return {
    id: row.id,
    missionId: row.mission_id,
    userId: row.user_id,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    byteSize: row.byte_size,
    caption: row.caption,
    moderationStatus: row.moderation_status,
    createdAt: row.created_at,
  };
}

export const evidenceRepository = {
  async findByMissionId(missionId: string): Promise<MissionEvidenceRow[]> {
    const { data, error } = await supabase
      .from("mission_evidence")
      .select("*")
      .eq("mission_id", missionId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch mission evidence: ${error.message}`);
    }

    return (data ?? []).map((row) => toRow(DB_EVIDENCE_SCHEMA.parse(row)));
  },

  async uploadEvidence(input: {
    userId: string;
    missionId: string;
    file: File;
    caption?: string;
  }): Promise<MissionEvidenceRow> {
    const evidenceId = crypto.randomUUID();

    const uploaded = await uploadMissionEvidence({
      userId: input.userId,
      missionId: input.missionId,
      evidenceId,
      file: input.file,
    });

    const { data, error } = await supabase
      .from("mission_evidence")
      .insert({
        id: evidenceId,
        mission_id: input.missionId,
        user_id: input.userId,
        storage_path: uploaded.storagePath,
        mime_type: uploaded.mimeType,
        byte_size: uploaded.byteSize,
        caption: input.caption ?? null,
        moderation_status: "pending",
      })
      .select()
      .single();

    if (error) {
      await deleteEvidenceObject(uploaded.storagePath).catch(() => undefined);
      throw new Error(`Failed to persist evidence row: ${error.message}`);
    }

    const row = toRow(DB_EVIDENCE_SCHEMA.parse(data));
    row.previewUrl = await createEvidenceSignedUrl(row.storagePath);
    return row;
  },

  async attachSignedPreviewUrls(rows: MissionEvidenceRow[]): Promise<MissionEvidenceRow[]> {
    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        previewUrl: await createEvidenceSignedUrl(row.storagePath),
      }))
    );
  },
};
