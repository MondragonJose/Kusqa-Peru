/**
 * Subscribes to Supabase Realtime for cross-device cache reconciliation.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { userSessionQueryOptions } from "@/features/auth/queryOptions";
import { isRealtimeSyncEnabled } from "@/lib/operationalFeature";
import { subscribeMissionRealtime } from "@/lib/realtime/missionRealtimeBridge";

export function useMissionRealtimeSync(): void {
  const queryClient = useQueryClient();
  const enabled = isRealtimeSyncEnabled();

  useEffect(() => {
    if (!enabled) return;

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const userId = await queryClient.fetchQuery(userSessionQueryOptions());
      if (!userId || cancelled) return;
      unsubscribe = subscribeMissionRealtime(queryClient, userId);
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [queryClient, enabled]);
}
