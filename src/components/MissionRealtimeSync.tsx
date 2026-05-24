/**
 * Invisible subscriber — mounts realtime reconciliation when enabled.
 */

import { useMissionRealtimeSync } from "@/hooks/useMissionRealtimeSync";

export function MissionRealtimeSync() {
  useMissionRealtimeSync();
  return null;
}
