/**
 * Shared types and flag routing for unified initiative writes (Phase 5).
 *
 * Exposes `isUnifiedWritesEnabled()` — the single source of truth for
 * VITE_USE_UNIFIED_WRITES.
 */

export function isUnifiedWritesEnabled(): boolean {
  try {
    return import.meta.env.VITE_USE_UNIFIED_WRITES === "true";
  } catch {
    return false;
  }
}
