/**
 * useEntityInvariantDebug — DEV-only invariant violation inspector.
 *
 * Scans the event_log for a user or mission, runs the reducer and
 * invariant validator, and surfaces violation metadata for debugging.
 *
 * Only active when:
 *   import.meta.env.DEV === true
 *   OR VITE_ENTITY_DEBUG === "true"
 *
 * Zero runtime overhead in production builds.
 */

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { KusqaDomainEvent } from "@/domain/events";
import { buildCausalChain } from "@/domain/eventCausality";
import { reduceEntityState } from "@/domain/eventReducer";
import { validateEntityState } from "@/domain/entityInvariants";
import type { InvariantResult } from "@/domain/entityInvariants";

// ─── Guard ─────────────────────────────────────────────────────────────────

const IS_ACTIVE =
  import.meta.env.DEV ||
  (typeof import.meta.env.VITE_ENTITY_DEBUG === "string" &&
    import.meta.env.VITE_ENTITY_DEBUG === "true");

// ─── Types ─────────────────────────────────────────────────────────────────

export type EntityViolationEntry = {
  missionId: string;
  hardCount: number;
  softCount: number;
  violations: readonly string[];
  severity: InvariantResult["severity"];
  eventCount: number;
};

export type InvariantDebugReport = {
  entities: EntityViolationEntry[];
  totalHard: number;
  totalSoft: number;
};

// ─── Hook ──────────────────────────────────────────────────────────────────

/**
 * Debug hook: scan event_log for invariant violations.
 *
 * @param userId - Fetch events for this user (by actor_id)
 * @param missionIds - Optional filter to specific mission IDs
 *
 * Returns null when inactive (production) or while loading.
 */
export function useEntityInvariantDebug(
  userId?: string,
  missionIds?: string[]
): InvariantDebugReport | null {
  const [report, setReport] = useState<InvariantDebugReport | null>(null);

  useEffect(() => {
    if (!IS_ACTIVE) return;
    if (!userId) return;

    let cancelled = false;

    async function scan(): Promise<void> {
      try {
        const query = supabase
          .from("event_log")
          .select("payload, mission_id")
          .eq("actor_id", userId)
          .order("created_at", { ascending: true });

        if (missionIds && missionIds.length > 0) {
          query.in("mission_id", missionIds);
        }

        const { data: rows } = await query;

        if (cancelled || !rows || rows.length === 0) return;

        // Group by mission_id
        const byMission = new Map<string, KusqaDomainEvent[]>();
        for (const row of rows) {
          const event = row.payload as unknown as KusqaDomainEvent;
          const mid = (row.mission_id as string) ?? "unknown";
          const list = byMission.get(mid) ?? [];
          list.push(event);
          byMission.set(mid, list);
        }

        const entries: EntityViolationEntry[] = [];
        let totalHard = 0;
        let totalSoft = 0;

        for (const [missionId, events] of byMission) {
          try {
            const chain = buildCausalChain(events);
            const state = reduceEntityState(chain);
            const result = validateEntityState(state);

            const effectiveHard = result.severity === "hard" ? result.violations.length : 0;
            const effectiveSoft = result.severity === "soft" ? result.violations.length : 0;

            entries.push({
              missionId,
              hardCount: effectiveHard,
              softCount: effectiveSoft,
              violations: result.violations,
              severity: result.severity,
              eventCount: events.length,
            });

            totalHard += effectiveHard;
            totalSoft += effectiveSoft;
          } catch {
            // Skip entities that fail to reduce
          }
        }

        if (!cancelled) {
          setReport({ entities: entries, totalHard, totalSoft });
        }
      } catch {
        // Non-critical — debug tool
      }
    }

    scan();

    return () => {
      cancelled = true;
    };
  }, [userId, missionIds]);

  if (!IS_ACTIVE) return null;

  return report;
}
