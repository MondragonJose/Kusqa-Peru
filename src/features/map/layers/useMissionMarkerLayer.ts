/**
 * useMissionMarkerLayer
 * Manages Leaflet mission pin markers within a MarkerCluster group.
 * Extracted from MapView.tsx for modularity.
 */
import type { Mission } from "@/types";
import { isValidLatLng } from "../utils/projection";

type LeafletInstance = any;

type MarkerLayerOptions = {
  L: LeafletInstance;
  clusterGroup: LeafletInstance;
  missions: Mission[];
  selectedMissionId: string | null;
  onSelectMission: (id: string) => void;
  markersMap: Map<string, LeafletInstance>;
};

const REGION_GRADIENT: Record<string, { gradient: string; glow: string }> = {
  costa: { gradient: "bg-gradient-coast", glow: "ring-coast/30" },
  sierra: { gradient: "bg-gradient-andes", glow: "ring-sierra/30" },
  selva: { gradient: "bg-gradient-jungle", glow: "ring-jungle/30" },
};

const REGION_CHIP: Record<string, string> = {
  costa: "bg-coast/10 text-coast",
  sierra: "bg-sierra/10 text-sierra",
  selva: "bg-jungle/10 text-jungle",
};

/**
 * Renders mission markers into a cluster group.
 * Populates the provided `markersMap` for later reference.
 */
export function renderMissionMarkers({
  L,
  clusterGroup,
  missions,
  selectedMissionId,
  onSelectMission,
  markersMap,
}: MarkerLayerOptions): void {
  missions.forEach((mission) => {
    if (!mission.coords || !isValidLatLng(mission.coords.lat, mission.coords.lng)) return;

    const isSelected = selectedMissionId === mission.id;
    const { gradient, glow } = REGION_GRADIENT[mission.region] ?? REGION_GRADIENT.sierra;
    const chipClass = REGION_CHIP[mission.region] ?? REGION_CHIP.sierra;
    const iconSize = isSelected ? 52 : 38;

    const htmlContent = `
      <div class="relative flex items-center justify-center pointer-events-auto" style="width: ${iconSize}px; height: ${iconSize}px;">
        <span class="absolute inset-0 rounded-full ${gradient} ${isSelected ? "scale-125 opacity-40 animate-pulse-ring" : "scale-100 opacity-20"}"></span>
        <div class="relative flex items-center justify-center rounded-full ${gradient} text-white shadow-glow border-2 border-white/90 transition-all duration-300 transform ${isSelected ? `scale-110 rotate-3 ring-4 ${glow}` : "hover:scale-115"}" style="width: 80%; height: 80%;">
          <span class="select-none text-base">${mission.emoji}</span>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: htmlContent,
      className: "custom-mission-pin",
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2],
    });

    const popupHtml = `
      <div class="p-3 text-xs w-60 font-sans">
        <div class="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
          <span class="font-bold text-foreground text-sm truncate">${mission.title}</span>
          <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full ${chipClass} uppercase tracking-wider">${mission.region}</span>
        </div>
        <p class="text-muted-foreground line-clamp-2 leading-relaxed mb-2">${mission.description}</p>
        <div class="flex items-center justify-between pt-2 border-t border-border/20">
          <span class="text-[10px] text-muted-foreground flex items-center gap-1">
            <span>📍</span> ${mission.district}
          </span>
          <a href="/app/mision/${mission.id}" class="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white px-3 py-1.5 text-[9px] font-bold shadow-sm hover:opacity-90 transition-all">
            Unirme →
          </a>
        </div>
      </div>
    `;

    const marker = L.marker([mission.coords.lat, mission.coords.lng], { icon: customIcon });
    marker.bindPopup(popupHtml, {
      closeButton: false,
      offset: L.point(0, -10),
      className: "custom-map-popup",
    });
    marker.on("click", () => onSelectMission(mission.id));

    clusterGroup.addLayer(marker);
    markersMap.set(mission.id, marker);
  });
}
