/**
 * Phase B operational feature flags.
 */

import { isLiveUserEnabled } from "@/lib/userFeature";

function envFlag(value: string | undefined): boolean {
  return value === "true";
}

export function isRealtimeSyncEnabled(): boolean {
  return envFlag(import.meta.env.VITE_USE_REALTIME_SYNC) && isLiveUserEnabled();
}

export function isTelemetryEnabled(): boolean {
  return envFlag(import.meta.env.VITE_TELEMETRY_ENABLED);
}

export function isEvidenceUploadEnabled(): boolean {
  return envFlag(import.meta.env.VITE_EVIDENCE_UPLOAD_ENABLED) && isLiveUserEnabled();
}
