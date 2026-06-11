import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { userSessionQueryOptions } from "@/features/auth/queryOptions";
import { isRealtimeSyncEnabled } from "@/lib/operationalFeature";
import { subscribeMissionRealtime } from "@/lib/realtime/missionRealtimeBridge";

export function useMissionRealtimeSync(): void {
  const queryClient = useQueryClient();
  const enabled = isRealtimeSyncEnabled();
  const unsubscribeRef = useRef<(() => void) | undefined>(undefined);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    cancelledRef.current = false;

    void (async () => {
      const userId = await queryClient.fetchQuery(userSessionQueryOptions());
      if (!userId || cancelledRef.current) return;
      unsubscribeRef.current = subscribeMissionRealtime(queryClient, userId);
    })();

    return () => {
      cancelledRef.current = true;
      unsubscribeRef.current?.();
      unsubscribeRef.current = undefined;
    };
  }, [queryClient, enabled]);
}
