/**
 * useDistrictLayer
 * Manages the Leaflet GeoJSON district polygon layer.
 * Phase 12: accepts optional polygons from spatial repository, falls back to hardcoded.
 */
import { DISTRICT_POLYGONS } from "../data/districtPolygons";

type LeafletInstance = any;

type DistrictLayerOptions = {
  L: LeafletInstance;
  map: LeafletInstance;
  /** Optional GeoJSON FeatureCollection of district boundaries.
   *  If provided, overrides the hardcoded DISTRICT_POLYGONS. */
  polygons?: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      properties: Record<string, unknown>;
      geometry: { type: "Polygon"; coordinates: number[][][] };
    }>;
  };
};

const TERRITORIAL_COLORS = {
  costa: { stroke: "#C4962A", fill: "#D4A832", glow: "rgba(196,150,42,0.25)" },
  sierra: { stroke: "#C47A2A", fill: "#D4A832", glow: "rgba(196,122,42,0.25)" },
  selva: { stroke: "#2D7A4A", fill: "#3A8F5A", glow: "rgba(45,122,74,0.25)" },
};

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

/**
 * Renders GeoJSON district boundary polygons on the map.
 * Returns the GeoJSON layer for external lifecycle management.
 */
export function renderDistrictLayer({
  L,
  map,
  polygons,
}: DistrictLayerOptions): LeafletInstance {
  const source = polygons ?? (DISTRICT_POLYGONS as unknown as {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      properties: Record<string, unknown>;
      geometry: { type: "Polygon"; coordinates: number[][][] };
    }>;
  });

  const geojsonLayer = L.geoJSON(source as any, {
    style: (feature: any) => {
      const regionKey = feature?.properties?.region as "costa" | "sierra" | "selva";
      const colors = TERRITORIAL_COLORS[regionKey] || {
        stroke: "#888",
        fill: "#aaa",
        glow: "rgba(128,128,128,0.2)",
      };
      return {
        color: colors.stroke,
        weight: 2.5,
        opacity: 0.8,
        fillColor: colors.fill,
        fillOpacity: 0.1,
        dashArray: "6, 10",
        className: "glowing-district-polygon",
      };
    },
    onEachFeature: (feature: any, layer: any) => {
      const name = feature.properties?.name ?? feature.properties?.display_name ?? "Distrito";
      const score = feature.properties?.score;
      layer.bindPopup(
        `<div class="p-3 text-xs w-48 font-sans">
          <div class="font-bold text-foreground text-sm border-b border-border/20 pb-1.5 mb-1.5">${name}</div>
          <div class="flex flex-col gap-1 text-muted-foreground">
            ${score != null ? `<span class="flex justify-between">Score Cívico: <strong class="text-accent font-extrabold">${score}/100</strong></span>` : ""}
            <span class="text-[10px] italic">Área activa de impacto cívico</span>
          </div>
        </div>`,
        { closeButton: false },
      );

      layer.on({
        mouseover: (e: any) => {
          e.target.setStyle({ fillOpacity: 0.28, weight: 3.5 });
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
