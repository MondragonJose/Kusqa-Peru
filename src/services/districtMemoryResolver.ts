import type { TerritorialEvent } from "@/domain/territorialEvent";
import type { Initiative } from "@/domain/initiative";
import {
  deriveDistrictMemory,
  type DistrictMemory,
} from "@/domain/territorialMemory";

export function buildDistrictMemory(
  events: TerritorialEvent[],
  initiatives: Initiative[],
): DistrictMemory | null {
  if (events.length === 0 && initiatives.length === 0) return null;
  return deriveDistrictMemory(events, initiatives);
}
