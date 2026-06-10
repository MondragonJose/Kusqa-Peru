/**
 * useDistrictLayer
 * Renders Leaflet GeoJSON district polygons colored by territorial vitality (warmth).
 * Phase 12: accepts optional polygons from spatial repository, falls back to hardcoded.
 *
 * Warmth replaces the old heatmap. District fill intensity communicates accumulated
 * community presence — not urgency, not XP, not competition.
 */

import { DISTRICT_POLYGONS } from "../data/districtPolygons";
import type { TerritorialActivityLevel } from "@/domain/territorialIntelligence";

type LeafletInstance = any;

type DistrictLayerOptions = {
  L: LeafletInstance;
  map: LeafletInstance;
  polygons?: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      properties: Record<string, unknown>;
      geometry: { type: "Polygon"; coordinates: number[][][] };
    }>;
  };
  /** Per-district warmth level keyed by district name (lowercase). */
  warmth?: Record<string, TerritorialActivityLevel>;
};

const WARMTH_COLORS: Record<
  TerritorialActivityLevel,
  { fill: string; stroke: string; label: string }
> = {
  dormant: { fill: "#8B9DAF", stroke: "#6B7D8F", label: "En calma" },
  fragmented: { fill: "#C4A87C", stroke: "#A4885C", label: "Fragmentado" },
  reactivating: { fill: "#8FAE7C", stroke: "#6F8E5C", label: "Reactivando" },
  emerging: { fill: "#C4B86A", stroke: "#A4984A", label: "Emergente" },
  organizing: { fill: "#C99A4A", stroke: "#A97A2A", label: "Organizando" },
  active: { fill: "#C47A4A", stroke: "#A45A2A", label: "Activo" },
  resilient: { fill: "#6B9E7A", stroke: "#4B7E5A", label: "Resiliente" },
};

const WARMTH_OPACITY: Record<TerritorialActivityLevel, number> = {
  dormant: 0.08,
  fragmented: 0.12,
  reactivating: 0.15,
  emerging: 0.18,
  organizing: 0.22,
  active: 0.28,
  resilient: 0.35,
};

function getWarmth(
  featureName: string,
  warmth?: Record<string, TerritorialActivityLevel>,
): TerritorialActivityLevel {
  if (!warmth) return "dormant";
  const key = featureName.toLowerCase().trim();
  return warmth[key] ?? "dormant";
}

function buildFeatureCollection(
  districtBoundaries: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: "Polygon"; coordinates: number[][][] };
  }>,
) {
  return {
    type: "FeatureCollection" as const,
    features: districtBoundaries,
  };
}

export function renderDistrictLayer({
  L,
  map,
  polygons,
  warmth,
}: DistrictLayerOptions): LeafletInstance {
  const source =
    polygons ??
    (DISTRICT_POLYGONS as unknown as {
      type: "FeatureCollection";
      features: Array<{
        type: "Feature";
        properties: Record<string, unknown>;
        geometry: { type: "Polygon"; coordinates: number[][][] };
      }>;
    });

  const geojsonLayer = L.geoJSON(source as any, {
    style: (feature: any) => {
      const name = feature?.properties?.name ?? feature?.properties?.display_name ?? "";
      const level = getWarmth(name, warmth);
      const colors = WARMTH_COLORS[level];
      return {
        color: colors.stroke,
        weight: 2,
        opacity: 0.7,
        fillColor: colors.fill,
        fillOpacity: WARMTH_OPACITY[level],
        className: "territorial-warmth-polygon",
      };
    },
    onEachFeature: (feature: any, layer: any) => {
      const name = feature.properties?.name ?? feature.properties?.display_name ?? "Distrito";
      const level = getWarmth(name, warmth);
      const meta = WARMTH_COLORS[level];
      layer.bindPopup(
        `<div class="p-3 text-xs font-sans max-w-[200px]">
          <div class="font-bold text-foreground text-sm border-b border-border/20 pb-1.5 mb-1.5">${name}</div>
          <div class="flex flex-col gap-1 text-muted-foreground">
            <span class="flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full" style="background:${meta.fill}"></span>
              <strong class="text-foreground font-semibold">${meta.label}</strong>
            </span>
            <span class="text-[10px] italic mt-1">Presencia comunitaria acumulada</span>
          </div>
        </div>`,
        { closeButton: false },
      );

      layer.on({
        mouseover: (e: any) => {
          e.target.setStyle({
            fillOpacity: Math.min(0.45, WARMTH_OPACITY[level] + 0.12),
            weight: 3,
          });
        },
        mouseout: (e: any) => {
          geojsonLayer.resetStyle(e.target);
        },
      });
    },
  }).addTo(map);

  return geojsonLayer;
}

export { buildFeatureCollection };
