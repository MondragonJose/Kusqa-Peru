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
  onRequestDetail?: (id: string) => void;
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
  onRequestDetail,
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
      <div class="p-2.5 text-xs w-56 font-sans">
        <div class="flex items-start justify-between gap-1.5 pb-1.5 border-b border-border/40">
          <div class="flex-1 min-w-0">
            <div class="font-bold text-foreground text-sm truncate leading-tight">${mission.title}</div>
            <div class="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <span>📍</span> ${mission.district}
            </div>
          </div>
          <span class="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${chipClass} uppercase tracking-wider">${mission.region}</span>
        </div>
        <div class="flex items-center gap-1.5 mt-2">
          <a href="/app/mision/${mission.id}" class="flex-1 inline-flex justify-center items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 text-white py-1.5 text-[8px] font-bold hover:opacity-90 transition-all">
            Unirme
          </a>
          <button class="kusqa-detail-btn flex-1 inline-flex justify-center items-center gap-1 rounded-lg bg-secondary/80 text-foreground py-1.5 text-[8px] font-bold hover:bg-secondary transition-all border border-border/30">
            Ver más →
          </button>
        </div>
      </div>
    `;

    const marker = L.marker([mission.coords.lat, mission.coords.lng], { icon: customIcon });
    marker.bindPopup(popupHtml, {
      closeButton: false,
      offset: L.point(0, -10),
      className: "custom-map-popup",
      maxWidth: 280,
    });
    marker.on("click", () => onSelectMission(mission.id));

    // Wire up the "Ver más" button inside the popup to open drawer
    if (onRequestDetail) {
      marker.on("popupopen", () => {
        const popup: any = marker.getPopup();
        const popupEl: HTMLElement | null = popup?.getElement();
        if (!popupEl) return;
        const btn: HTMLElement | null = popupEl.querySelector(".kusqa-detail-btn");
        if (btn) {
          btn.onclick = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            onRequestDetail(mission.id);
          };
        }
      });
    }

    clusterGroup.addLayer(marker);
    markersMap.set(mission.id, marker);
  });
}
