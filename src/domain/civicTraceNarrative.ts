import type { CivicTrace } from "./civicTrace";
import type { AdjacencyMap, SpreadLevel } from "./spatialRelationships";
import {
  detectCorridor,
  findConvergenceZones,
  computeTerritorialSpread,
} from "./spatialRelationships";

export interface CivicTraceNarrativeCtx {
  activeSlugs: string[];
  adjacency: AdjacencyMap;
  districtNarrative: string | null;
}

function spreadLabel(level: SpreadLevel): string {
  switch (level) {
    case "compact":
      return "compacta";
    case "moderate":
      return "moderada";
    case "dispersed":
      return "dispersa";
  }
}

function buildSpatialObservations(
  trace: CivicTrace,
  activeSlugs: string[],
  adjacency: AdjacencyMap,
): string[] {
  const obs: string[] = [];

  const corridor = detectCorridor(activeSlugs, adjacency);
  if (corridor.isCorridor) {
    obs.push(`Forma parte de un corredor de ${corridor.chainLength} distritos`);
  }

  const zones = findConvergenceZones(activeSlugs, adjacency);
  if (zones.length > 0 && zones.some((z) => z.includes(trace.districtSlug) && z.length >= 2)) {
    obs.push("zona de convergencia cívica");
  }

  if (trace.coords) {
    const coordMap = new Map<string, { lat: number; lng: number }>();
    coordMap.set(trace.districtSlug, trace.coords);
    const spread = computeTerritorialSpread([trace.districtSlug], coordMap);
    obs.push(`Huella ${spreadLabel(spread.level)}`);
  }

  return obs;
}

export function traceToNarrative(trace: CivicTrace, ctx: CivicTraceNarrativeCtx): string {
  const obs = buildSpatialObservations(trace, ctx.activeSlugs, ctx.adjacency);

  if (obs.length === 0 && !ctx.districtNarrative) {
    return "No hay información espacial disponible para esta huella.";
  }

  if (obs.length === 0) {
    return ctx.districtNarrative!;
  }

  const spatialText = obs.join(". ") + ".";

  if (ctx.districtNarrative) {
    return `${ctx.districtNarrative} ${spatialText.charAt(0).toLowerCase() + spatialText.slice(1)}`;
  }

  return `Este distrito tiene una huella cívica. ${spatialText}`;
}
