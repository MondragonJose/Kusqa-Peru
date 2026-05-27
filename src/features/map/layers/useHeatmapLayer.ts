/**
 * useHeatmapLayer
 * Manages the Leaflet heatmap circle layer for mission activity density.
 * Extracted from MapView.tsx for modularity.
 */
import type { Mission } from "@/types";
import { isValidLatLng } from "../utils/projection";

type LeafletInstance = any; // Leaflet is loaded dynamically

type HeatmapLayerOptions = {
  L: LeafletInstance;
  map: LeafletInstance;
  missions: Mission[];
};

/** Region to CSS color mapping for heatmap circles */
const REGION_HEAT_COLORS: Record<string, string> = {
  costa: "#C4962A", // warm coastal gold
  sierra: "#C47A2A", // Sierra earth tone
  selva: "#2D7A4A", // selva green
};

/**
 * Renders heatmap circles on a Leaflet LayerGroup.
 * Returns the layer group for external lifecycle management.
 */
export function renderHeatmapLayer({ L, map, missions }: HeatmapLayerOptions): LeafletInstance {
  const heatmapGroup = L.layerGroup();

  missions.forEach((m) => {
    if (!m.coords || !isValidLatLng(m.coords.lat, m.coords.lng)) return;

    // Radius scaled by XP and participants for visual density
    const radius = Math.max(15000, Math.min(65000, m.xp * 100 + m.participants * 800));
    const color = REGION_HEAT_COLORS[m.region] ?? REGION_HEAT_COLORS.sierra;

    const heatCircle = L.circle([m.coords.lat, m.coords.lng], {
      radius,
      className: "glowing-heatmap-circle",
      fillColor: color,
      fillOpacity: 0.25,
      stroke: false,
    });

    heatCircle.bindPopup(
      `<div class="p-2 text-center text-xs font-semibold text-foreground">
        🔥 Foco de Actividad: ${m.district}<br/>
        <span class="text-[10px] text-muted-foreground">${m.category}</span>
      </div>`,
      { closeButton: false }
    );

    heatmapGroup.addLayer(heatCircle);
  });

  heatmapGroup.addTo(map);
  return heatmapGroup;
}
