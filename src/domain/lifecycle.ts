/**
 * Mission Lifecycle Domain — pure derivation logic, zero side effects.
 *
 * This is the ONLY place where lifecycle state is computed.
 * All consumers (services, UI, mutations) import from here.
 * NEVER duplicate lifecycle logic elsewhere.
 */

import type {
  MissionLifecycle,
  MissionLifecycleInfo,
} from "@/types/lifecycle";
import {
  LIFECYCLE_PRIORITY,
  ENDING_SOON_THRESHOLD_MS,
  ARCHIVE_THRESHOLD_MS,
} from "@/types/lifecycle";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseMs(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime();
  return isNaN(ms) ? null : ms;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Derive lifecycle state from raw date fields.
 * This is the canonical derivation — all other functions compose this.
 *
 * Defensive handling:
 *   - null dates → "active" (no temporal constraints)
 *   - malformed dates → "active" (graceful degradation)
 *   - start_date > end_date → "active" (invalid range treated as no constraint)
 *   - timezone: all comparisons in UTC milliseconds
 */
export function deriveLifecycle(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): MissionLifecycle {
  const start = parseMs(startDate);
  if (start === null) return "active";

  const now = Date.now();
  const end = parseMs(endDate);

  // Invalid date range: start after end → treat as unconstrained
  if (end !== null && end < start) return "active";

  // Has end date
  if (end !== null) {
    if (end < now) {
      // Past end
      if (now - end > ARCHIVE_THRESHOLD_MS) return "archived";
      return "completed";
    }
    // End is in future
    if (start <= now) {
      // Started
      if (end - now < ENDING_SOON_THRESHOLD_MS) return "ending_soon";
      return "active";
    }
  }

  // No end date
  if (start <= now) return "active";

  return "upcoming";
}

/**
 * Compute full lifecycle info from raw date fields.
 * Composes deriveLifecycle + derived fields.
 * This is the function repositories and UI should use.
 */
export function computeLifecycleInfo(
  startDate: string | null | undefined,
  endDate: string | null | undefined
): MissionLifecycleInfo {
  const lifecycle = deriveLifecycle(startDate, endDate);

  const start = parseMs(startDate);
  const end = parseMs(endDate);
  const now = Date.now();

  const timeToStart = start !== null && start > now ? start - now : null;
  const timeToEnd = end !== null && end > now ? end - now : null;

  return {
    lifecycle,
    isJoinable: lifecycle === "upcoming" || lifecycle === "active",
    isCompletable: lifecycle === "active",
    isVisible: lifecycle !== "archived",
    lifecyclePriority: LIFECYCLE_PRIORITY[lifecycle],
    timeToStart,
    timeToEnd,
    timeToStartLabel: timeToStart !== null ? formatCountdown(timeToStart) : null,
    timeToEndLabel: timeToEnd !== null ? formatCountdown(timeToEnd) : null,
  };
}

/**
 * Human-readable countdown string from milliseconds.
 *
 * Examples:
 *   0ms       → "Ahora"
 *   45min     → "45m"
 *   2h 30min  → "2h 30m"
 *   1d 12h    → "1d 12h"
 *   30d+      → "30d+"
 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return "Ahora";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);

  if (days > 0) {
    const remainingHours = hours > 0 ? ` ${hours}h` : "";
    return `${days}d${remainingHours}`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes > 0 ? ` ${minutes}m` : "";
    return `${hours}h${remainingMinutes}`;
  }
  return `${minutes}m`;
}

/**
 * Sort comparator for lifecycle-priority ordering.
 * Usage: missions.sort(sortByLifecyclePriority)
 */
export function sortByLifecyclePriority(a: { lifecycleInfo: MissionLifecycleInfo }, b: { lifecycleInfo: MissionLifecycleInfo }): number {
  return a.lifecycleInfo.lifecyclePriority - b.lifecycleInfo.lifecyclePriority;
}
