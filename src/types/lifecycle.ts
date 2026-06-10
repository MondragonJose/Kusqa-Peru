/**
 * Mission Lifecycle — canonical state machine for mission temporal states.
 *
 * This is the SINGLE source of truth for lifecycle types and constants.
 * No string literal should be duplicated outside this file.
 * All derivation logic lives in domain/lifecycle.ts.
 */

/** Discriminated union of all possible lifecycle states — exhaustive match required. */
export type MissionLifecycle = "upcoming" | "active" | "ending_soon" | "completed" | "archived";

/** Sort priority — lower = higher in list. Used for mission ordering. */
export const LIFECYCLE_PRIORITY: Record<MissionLifecycle, number> = {
  active: 0,
  ending_soon: 1,
  upcoming: 2,
  completed: 3,
  archived: 4,
};

/**
 * All derived fields computed from lifecycle + dates.
 * This is NEVER stored — always derived via computeLifecycleInfo().
 */
export type MissionLifecycleInfo = {
  lifecycle: MissionLifecycle;
  isJoinable: boolean;
  isCompletable: boolean;
  isVisible: boolean;
  lifecyclePriority: number;
  /** Milliseconds until start (null if started or no start_date) */
  timeToStart: number | null;
  /** Milliseconds until end (null if no end_date or already ended) */
  timeToEnd: number | null;
  /** Human-readable countdown to start (e.g. "2d 14h") */
  timeToStartLabel: string | null;
  /** Human-readable countdown to end (e.g. "5h 30m") */
  timeToEndLabel: string | null;
};

/** Configurable thresholds (in milliseconds) */
export const ENDING_SOON_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
export const ARCHIVE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
