/**
 * Feature flag: live Supabase user domain vs mock CURRENT_USER.
 * Set VITE_USE_LIVE_USER=true to enable auth + profiles + user_progress.
 */
export function isLiveUserEnabled(): boolean {
  return import.meta.env.VITE_USE_LIVE_USER === "true";
}
