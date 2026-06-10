import { useMemo } from "react";
import type { TerritorialEvent } from "@/domain/territorialEvent";
import { deriveAmbientCadence } from "@/domain/ambient";
import type { AmbientCadence } from "@/domain/ambient";

export function useAmbientCadence(events: TerritorialEvent[]): AmbientCadence {
  return useMemo(() => deriveAmbientCadence(events), [events]);
}
