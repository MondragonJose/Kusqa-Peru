/**
 * React Query cache defaults for KUSQA data domains.
 * Hooks import these; services never reference React Query.
 */

/** Mission catalog + detail (map, dashboard, landing) */
export const MISSION_CATALOG_STALE_MS = 5 * 60_000;
export const MISSION_CATALOG_GC_MS = 30 * 60_000;

/** user_missions rows + enriched participation */
export const USER_MISSIONS_STALE_MS = 2 * 60_000;
export const USER_MISSIONS_GC_MS = 15 * 60_000;

/** Batch mission enrichment by id set */
export const MISSION_ENRICHMENT_STALE_MS = 5 * 60_000;
export const MISSION_ENRICHMENT_GC_MS = 30 * 60_000;

/** Territory progress + profile timeline views */
export const USER_PROGRESS_VIEW_STALE_MS = 2 * 60_000;
export const USER_PROGRESS_VIEW_GC_MS = 15 * 60_000;

/** Auth session + profile */
export const USER_SESSION_STALE_MS = 60_000;
export const USER_SESSION_GC_MS = 30 * 60_000;

/** Evidence feed (mission detail, profile) */
export const EVIDENCE_FEED_STALE_MS = 30_000;
export const EVIDENCE_FEED_GC_MS = 5 * 60_000;

/** Evidence verification status (stale quickly — may change by moderator) */
export const EVIDENCE_STATUS_STALE_MS = 15_000;
export const EVIDENCE_STATUS_GC_MS = 2 * 60_000;
