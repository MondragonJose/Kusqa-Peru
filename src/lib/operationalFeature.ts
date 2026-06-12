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

export function isInitiativeReadModelEnabled(): boolean {
  return envFlag(import.meta.env.VITE_USE_INITIATIVE_READ_MODEL);
}

export function isMunicipalCollabEnabled(): boolean {
  return envFlag(import.meta.env.VITE_MUNICIPAL_COLLAB);
}

export function isLivingTerritoryEnabled(): boolean {
  return envFlag(import.meta.env.VITE_LIVING_TERRITORY);
}
