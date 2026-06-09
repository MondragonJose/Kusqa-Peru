/**
 * useEventHydrationBootstrap — boot-time event history seeding + reconcile.
 *
 * On first mount (authenticated user available):
 *   1. Fetch last 200 events for current user from event_log
 *   2. Seed the in-memory eventRegistry silently
 *   3. Trigger one background reconciliation pass (observe mode only)
 *
 * Graceful degradation: if the event_log table doesn't exist or is empty,
 * the app continues with an empty registry — no behavior change.
 */

import { useEffect, useRef } from "react";
import { fetchRecentEvents } from "@/services/eventStoreRepository";
import { seedRegistry, getAllEvents } from "@/domain/eventRegistry";
import { compareEventStreams } from "@/domain/eventIntegrity";
import { assignCausalLinks } from "@/domain/eventCausality";

export function useEventHydrationBootstrap(userId: string | undefined): void {
  const hydrated = useRef(false);

  useEffect(() => {
    if (!userId) return;
    if (hydrated.current) return;
    hydrated.current = true;

    let cancelled = false;

    fetchRecentEvents(200)
      .then((events) => {
        if (cancelled) return;

        if (events.length > 0) {
          seedRegistry(events);
          if (import.meta.env.DEV) {
            console.log(`[KUSQA] Hydrated registry with ${events.length} historical events`);
          }

          // Enrich with causal links (non-blocking, optional)
          queueMicrotask(() => {
            try {
              const enriched = assignCausalLinks(events);
              seedRegistry(enriched);
            } catch {
              // Causal enrichment is optional — registry keeps raw events
            }
          });
        }

        // One background reconcile pass (observe mode, non-blocking)
        queueMicrotask(async () => {
          try {
            const registryEvents = getAllEvents();
            const dbEvents = await fetchRecentEvents(1000);
            const diff = compareEventStreams(registryEvents, dbEvents);
            if (import.meta.env.DEV && diff.divergenceCount > 0) {
              console.warn(
                `[KUSQA] Post-hydration divergence: ${diff.divergenceCount} event(s) out of sync`,
                {
                  missingInDB: diff.missingInDB.length,
                  missingInRegistry: diff.missingInRegistry.length,
                },
              );
            }
          } catch {
            // Non-fatal — reconcile is a safety net
          }
        });
      })
      .catch(() => {
        // Silent — DB mirror is not a dependency
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);
}
