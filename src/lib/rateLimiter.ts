/**
 * Client-side rate limiter — simple sliding window per action.
 * Prevents casual abuse and accidental spam.
 * Does NOT replace server-side enforcement (Supabase RLS + infra limits).
 */

export type RateLimitAction =
  | "createProposal"
  | "uploadEvidence"
  | "createComment"
  | "toggleSupport"
  | "createMission";

type WindowEntry = {
  timestamps: number[];
};

const windows = new Map<RateLimitAction, WindowEntry>();

const DEFAULTS: Record<RateLimitAction, { maxRequests: number; windowMs: number }> = {
  createProposal: { maxRequests: 5, windowMs: 60_000 },
  uploadEvidence: { maxRequests: 3, windowMs: 60_000 },
  createComment: { maxRequests: 10, windowMs: 60_000 },
  toggleSupport: { maxRequests: 10, windowMs: 60_000 },
  createMission: { maxRequests: 5, windowMs: 60_000 },
};

function getWindow(action: RateLimitAction): WindowEntry {
  let entry = windows.get(action);
  if (!entry) {
    entry = { timestamps: [] };
    windows.set(action, entry);
  }
  return entry;
}

function prune(entry: WindowEntry, windowMs: number): void {
  const cutoff = Date.now() - windowMs;
  while (entry.timestamps.length > 0 && entry.timestamps[0] < cutoff) {
    entry.timestamps.shift();
  }
}

export function checkRateLimit(action: RateLimitAction): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
} {
  const config = DEFAULTS[action];
  const entry = getWindow(action);

  prune(entry, config.windowMs);

  const allowed = entry.timestamps.length < config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.timestamps.length);
  const oldest = entry.timestamps[0] ?? Date.now();
  const resetMs = Math.max(0, config.windowMs - (Date.now() - oldest));

  return { allowed, remaining, resetMs };
}

export function consumeRateLimit(action: RateLimitAction): boolean {
  const { allowed, remaining, resetMs } = checkRateLimit(action);

  if (!allowed) {
    if (import.meta.env.DEV) {
      console.warn(
        `[kusqa:ratelimit] ${action} blocked — ${remaining} remaining, reset in ${resetMs}ms`,
      );
    }
    return false;
  }

  const entry = getWindow(action);
  entry.timestamps.push(Date.now());
  return true;
}

export function getRateLimitResetMs(action: RateLimitAction): number {
  const config = DEFAULTS[action];
  const entry = getWindow(action);
  prune(entry, config.windowMs);
  const oldest = entry.timestamps[0] ?? Date.now();
  return Math.max(0, config.windowMs - (Date.now() - oldest));
}
