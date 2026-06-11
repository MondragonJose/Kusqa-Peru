import { computeTemporalAnchor, type InitiativeLifecycle, type TemporalAnchor } from "@/domain/initiative";
import type { Mission } from "@/types";

type MissionLifecycleValue = Mission["lifecycleInfo"]["lifecycle"];
type MissionLifecycleInfo = Mission["lifecycleInfo"];

export function deriveLifecycleFromMission(missionLifecycle: MissionLifecycleValue): InitiativeLifecycle {
  switch (missionLifecycle) {
    case "active": return "active";
    case "completed": return "completed";
    case "upcoming": return "forming";
    case "archived": return "dormant";
    default: return "active";
  }
}

export function computeMissionAnchor(
  lifecycleInfo: MissionLifecycleInfo,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): TemporalAnchor {
  const lifecycle = deriveLifecycleFromMission(lifecycleInfo.lifecycle);
  const dateAnchor = endDate ?? startDate ?? null;
  return computeTemporalAnchor(lifecycle, dateAnchor);
}
