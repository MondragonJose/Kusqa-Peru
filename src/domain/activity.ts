/**
 * Ambient Activity Domain — calm, non-gamified perception of district life.
 *
 * This layer produces low-frequency signals about what is happening in a
 * district. It is deliberately NOT a notification system — it is a read
 * model that lets the UI answer "what is happening here?" without
 * overwhelming the user.
 *
 * Design principles:
 *   - Low frequency: signals coalesce into daily/weekly summaries
 *   - Non-gamified: no points, no streaks, no leaderboards
 *   - Territorial: every signal is anchored to a district
 *   - Human: written in plain Spanish, reflects real human activity
 */

import type { InitiativeLifecycle } from "@/domain/initiative";

// ─── Signal types ───────────────────────────────────────────────────────────

/**
 * High-level classification of what kind of activity this signal describes.
 * Each maps to a specific template in the resolver.
 */
export type ActivitySignalType =
  | "member_joined"
  | "initiative_gained_support"
  | "initiative_forming"
  | "initiative_completed"
  | "initiative_mobilizing"
  | "district_awakening"
  | "district_quiet";

/**
 * A single atomic signal about civic activity in a district.
 * Signals are aggregated per-district into a DistrictPulse.
 */
export type ActivitySignal = {
  id: string;
  type: ActivitySignalType;
  message: string;
  timestamp: string;
  sourceType: "mission" | "proposal" | "participation" | "support";
  sourceId: string;
  districtSlug: string;
  entityTitle?: string;
};

// ─── Pulse ──────────────────────────────────────────────────────────────────

/**
 * Calm summary of everything happening in a district right now.
 * This is the primary read model that the UI consumes.
 */
export type DistrictPulse = {
  districtSlug: string;
  districtName: string;
  signals: ActivitySignal[];

  /** 0–10: how alive the district feels right now */
  vitalityScore: number;

  /** ISO date of the most recent signal */
  lastActivityAt: string | null;

  /**
   * A single human-readable sentence summarizing the pulse.
   * Examples:
   *   "3 personas se sumaron esta semana"
   *   "Una iniciativa ganó apoyo"
   *   "El distrito está despertando"
   */
  narrative: string | null;
};

// ─── Feed item ──────────────────────────────────────────────────────────────

/**
 * A rendered feed item that combines a signal with optional initiative context.
 */
export type ActivityFeedItem = {
  id: string;
  signal: ActivitySignal;
  initiativeId: string | null;
  initiativeTitle: string | null;
};

// ─── Signal template builder ────────────────────────────────────────────────

/**
 * Templates for human-readable signal messages.
 * These are the ONLY place signal messages are defined — no random strings.
 */
export const SIGNAL_TEMPLATES: Record<ActivitySignalType, string> = {
  member_joined: "Alguien se sumó a una iniciativa",
  initiative_gained_support: "Una iniciativa ganó apoyo",
  initiative_forming: "Una nueva iniciativa está tomando forma",
  initiative_completed: "Una iniciativa se completó",
  initiative_mobilizing: "Una iniciativa entró en acción",
  district_awakening: "El distrito está despertando",
  district_quiet: "El distrito está en calma",
};

/**
 * Plural-aware message for member joins.
 */
export function formatJoinMessage(count: number, initiativeTitle: string): string {
  if (count === 0) return "";
  if (count === 1) return `1 persona se sumó a "${initiativeTitle}"`;
  return `${count} personas se sumaron a "${initiativeTitle}"`;
}

/**
 * Message for support milestones.
 */
export function formatSupportMessage(
  initiativeTitle: string,
  currentCount: number,
): string {
  return `"${initiativeTitle}" tiene ${currentCount} apoyo${currentCount !== 1 ? "s" : ""}`;
}

/**
 * District-level awakening message.
 */
export function formatAwakeningMessage(
  activeCount: number,
  districtName: string,
): string {
  if (activeCount === 0) return `${districtName} está en calma`;
  if (activeCount <= 2) return `${districtName} está despertando`;
  return `${districtName} está en movimiento`;
}
