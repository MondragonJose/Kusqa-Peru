/**
 * Mission evidence storage — signed upload paths, validation, lifecycle.
 */

import { supabase } from "@/lib/supabase";
import { trackOperationalMetric, captureOperationalException } from "@/lib/telemetry";
import { z } from "zod";

export const EVIDENCE_BUCKET = "mission-evidence";
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
]);

const UPLOAD_INPUT_SCHEMA = z.object({
  userId: z.string().uuid(),
  missionId: z.string().uuid(),
  evidenceId: z.string().uuid(),
  file: z.instanceof(File),
});

function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/heic":
      return "heic";
    default:
      throw new Error(`Unsupported mime type: ${mime}`);
  }
}

export function buildEvidenceStoragePath(
  userId: string,
  missionId: string,
  evidenceId: string,
  mimeType: string
): string {
  const ext = extensionForMime(mimeType);
  return `${userId}/${missionId}/${evidenceId}.${ext}`;
}

export function validateEvidenceFile(file: File): void {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(`Invalid file type: ${file.type}`);
  }
  if (file.size <= 0 || file.size > EVIDENCE_MAX_BYTES) {
    throw new Error(`File size must be between 1 and ${EVIDENCE_MAX_BYTES} bytes`);
  }
}

export async function uploadMissionEvidence(input: {
  userId: string;
  missionId: string;
  evidenceId: string;
  file: File;
  onRetry?: (attempt: number) => void;
}): Promise<{ storagePath: string; byteSize: number; mimeType: string }> {
  const parsed = UPLOAD_INPUT_SCHEMA.parse(input);
  validateEvidenceFile(parsed.file);

  const storagePath = buildEvidenceStoragePath(
    parsed.userId,
    parsed.missionId,
    parsed.evidenceId,
    parsed.file.type
  );

  trackOperationalMetric("upload.start", {
    missionId: parsed.missionId,
    byteSize: parsed.file.size,
  });

  const maxAttempts = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    input.onRetry?.(attempt);

    const { error } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .upload(storagePath, parsed.file, {
        upsert: false,
        contentType: parsed.file.type,
        cacheControl: "3600",
      });

    if (!error) {
      trackOperationalMetric("upload.success", { missionId: parsed.missionId, attempt });
      return {
        storagePath,
        byteSize: parsed.file.size,
        mimeType: parsed.file.type,
      };
    }

    lastError = new Error(error.message);
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 300));
    }
  }

  const failure = lastError ?? new Error("Upload failed");
  trackOperationalMetric("upload.failure", { missionId: parsed.missionId });
  captureOperationalException(failure, { storagePath });
  throw failure;
}

export async function createEvidenceSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? "unknown"}`);
  }

  return data.signedUrl;
}

export async function deleteEvidenceObject(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
  if (error) {
    throw new Error(`Failed to delete storage object: ${error.message}`);
  }
}
