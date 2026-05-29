/**
 * useEventIntegrityMonitor — periodic divergence check between registry and DB.
 *
 * Runs every 60-120 seconds (random jitter) in development or
 * when VITE_EVENT_DEBUG=true. Exposes divergence state for optional
 * debug UI. Never blocks the main thread.
 */

import { useEffect, useRef, useState } from "react";
import { getAllEvents } from "@/domain/eventRegistry";
import { fetchRecentEvents } from "@/domain/eventStore";
import { compareEventStreams, type IntegrityDiff } from "@/domain/eventIntegrity";

// ─── Types ────────────────────────────────────────────────────────────────

export type IntegrityState = {
  divergenceCount: number;
  lastCheckTime: string | null;
  isHealthy: boolean;
};

const INITIAL_STATE: IntegrityState = {
  divergenceCount: 0,
  lastCheckTime: null,
  isHealthy: true,
};

const CHECK_INTERVAL_MS_MIN = 60_000;
const CHECK_INTERVAL_MS_MAX = 120_000;

function randomInterval(): number {
  return Math.floor(
    Math.random() * (CHECK_INTERVAL_MS_MAX - CHECK_INTERVAL_MS_MIN) +
      CHECK_INTERVAL_MS_MIN
  );
}

function isDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    return import.meta.env.VITE_EVENT_DEBUG === "true";
  } catch {
    return false;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Monitor integrity between in-memory registry and DB event_log.
 * Exposes divergence state for optional debug UI.
 * Only runs when debug is enabled (dev or VITE_EVENT_DEBUG=true).
 */
export function useEventIntegrityMonitor(): IntegrityState {
  const [state, setState] = useState<IntegrityState>(INITIAL_STATE);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    if (!isDebugEnabled()) return;

    mountedRef.current = true;

    const check = async () => {
      if (!mountedRef.current) return;

      try {
        const registryEvents = getAllEvents();
        const dbEvents = await fetchRecentEvents(1000);
        const diff = compareEventStreams(registryEvents, dbEvents);

        if (import.meta.env.DEV && diff.divergenceCount > 0) {
          console.warn(
            `[KUSQA] Event integrity divergence detected (${diff.divergenceCount}):`,
            { missingInDB: diff.missingInDB.length, missingInRegistry: diff.missingInRegistry.length }
          );
        }

        if (mountedRef.current) {
          setState({
            divergenceCount: diff.divergenceCount,
            lastCheckTime: diff.lastSyncTimestamp,
            isHealthy: diff.divergenceCount === 0,
          });
        }
      } catch {
        // Non-fatal — integrity check is a safety net, not a dependency
      }

      if (mountedRef.current) {
        timerRef.current = setTimeout(check, randomInterval());
      }
    };

    // First check after a short delay (let hydration settle)
    timerRef.current = setTimeout(check, randomInterval());

    return () => {
      mountedRef.current = false;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return state;
}
