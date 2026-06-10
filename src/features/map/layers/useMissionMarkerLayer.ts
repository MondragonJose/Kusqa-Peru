/**
 * useMissionMarkerLayer
 * Manages Leaflet mission/proposal pin markers within a MarkerCluster group.
 * Consumes InitiativeMapEntity as the single rendering contract.
 */
import type { InitiativeMapEntity } from "@/domain/initiativeMapEntity";
import { projectMapMarker, getEntityPresentation, isProposalEntity, entityDetailRoute } from "../projections/mapEntityProjection";
import { isValidLatLng } from "../utils/projection";
import { regionGradient, regionChipBg, type Region } from "@/domain/regions";
import { getAvailableInitiativeActions, ACTION_PRIORITY, actionToLabel } from "@/domain/initiativeActions";

type LeafletInstance = any;

type MarkerLayerOptions = {
  L: LeafletInstance;
  clusterGroup: LeafletInstance;
  entities: InitiativeMapEntity[];
  selectedMissionId: string | null;
  onSelectMission: (id: string) => void;
  onRequestDetail?: (id: string) => void;
  markersMap: Map<string, LeafletInstance>;
};

const REGION_GLOW: Record<string, string> = {
  costa: "ring-coast/30",
  sierra: "ring-sierra/30",
  selva: "ring-jungle/30",
};

/**
 * Renders markers into a cluster group from InitiativeMapEntity array.
 * Replaces the old Mission[] + proposalIds pattern.
 */
export function renderMissionMarkers({
  L,
  clusterGroup,
  entities,
  selectedMissionId,
  onSelectMission,
  onRequestDetail,
  markersMap,
}: MarkerLayerOptions): void {
  entities.forEach((entity) => {
    const projection = projectMapMarker(entity);
    if (!projection) return;

    const isSelected = selectedMissionId === projection.id;
    const isProposal = isProposalEntity(entity);

    const lifecycle = projection.lifecycle;
    const pres = getEntityPresentation(entity);
    if (pres.isHidden) return;
    const gradient = regionGradient(projection.region as Region);
    const glow = REGION_GLOW[projection.region] ?? REGION_GLOW.sierra;
    const chipClass = regionChipBg(projection.region as Region);
    const iconSize = isSelected ? 52 : 38;

    const proposalShape = `rounded-xl bg-white dark:bg-card border-2 border-violet-300 dark:border-violet-600 border-dashed text-foreground shadow-md`;
    const missionShape = `rounded-full ${gradient} text-white shadow-glow border-2 border-white/90`;
    const shapeClasses = [
      isProposal ? proposalShape : missionShape,
      pres.containerClass,
      pres.animationClass,
    ].filter(Boolean).join(" ");
    const emojiColorClass = isProposal ? "text-violet-500" : "";

    const htmlContent = `
      <div class="relative flex items-center justify-center pointer-events-auto" style="width: ${iconSize}px; height: ${iconSize}px; opacity: ${pres.opacity};">
        ${
          !isProposal
            ? `<span class="absolute inset-0 rounded-full ${gradient} ${isSelected ? "scale-125 opacity-40 animate-pulse-ring" : "scale-100 opacity-20"}"></span>`
            : `<span class="absolute inset-0 rounded-xl bg-violet-300/20 dark:bg-violet-800/20 ${isSelected ? "scale-125" : "scale-100"}"></span>`
        }
        <div class="relative flex items-center justify-center ${shapeClasses} transition-all duration-300 transform ${isSelected ? `scale-110 ring-4 ${isProposal ? "ring-violet-300" : glow}` : "hover:scale-115"}" style="width: 78%; height: 78%;">
          <span class="select-none text-base ${emojiColorClass}">${pres.badge ?? (isProposal ? "🌱" : projection.emoji)}</span>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: htmlContent,
      className: "custom-map-pin",
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize / 2, iconSize / 2],
    });

    const availableActions = getAvailableInitiativeActions({
      lifecycle: entity.lifecycle,
      sourceType: entity.sourceType,
      relationship: "visitor",
    });
    const primaryAction = availableActions
      .sort((a, b) => ACTION_PRIORITY[a] - ACTION_PRIORITY[b])[0];
    const ctaLabel = primaryAction ? actionToLabel(primaryAction) : pres.ctaLabel;
    const detailHref = entityDetailRoute(entity);

    const popupHtml = `
      <div class="p-2.5 text-xs w-56 font-sans">
        <div class="flex items-start justify-between gap-1.5 pb-1.5 border-b border-border/40">
          <div class="flex-1 min-w-0">
            <div class="font-bold text-foreground text-sm truncate leading-tight">${projection.title}</div>
            <div class="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1">
              <span>📍</span> ${projection.district}
              ${isProposal ? '<span class="text-violet-500 ml-1">🌱 Semilla cívica</span>' : ""}
            </div>
            ${pres.tooltipTone ? `<div class="text-[9px] text-muted-foreground/70 mt-0.5">${pres.tooltipTone}</div>` : ""}
          </div>
          <span class="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${chipClass} uppercase tracking-wider">${projection.region}</span>
        </div>
        <div class="flex items-center gap-1.5 mt-2">
          <a
            href="${detailHref}"
            class="flex-1 inline-flex justify-center items-center gap-1 rounded-lg text-white py-1.5 text-[8px] font-bold transition-all shadow-sm ${
              isProposal
                ? "bg-violet-600 hover:bg-violet-700"
                : "bg-gradient-to-r from-amber-500 to-rose-500 hover:opacity-95"
            }"
            style="color: #ffffff; text-shadow: 0 1px 1px rgba(0,0,0,0.15);"
          >
            ${ctaLabel}
          </a>
          <button
            class="kusqa-detail-btn flex-1 inline-flex justify-center items-center gap-1 rounded-lg bg-secondary/80 text-foreground py-1.5 text-[8px] font-bold hover:bg-secondary transition-all border border-border/30"
          >
            Ver más →
          </button>
        </div>
      </div>
    `;

    const marker = L.marker([projection.coords!.lat, projection.coords!.lng], { icon: customIcon });
    marker.bindPopup(popupHtml, {
      closeButton: false,
      offset: L.point(0, -10),
      className: "custom-map-popup",
      maxWidth: 280,
    });
    marker.on("click", () => onSelectMission(projection.id));

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
            onRequestDetail(projection.id);
          };
        }
      });
    }

    clusterGroup.addLayer(marker);
    markersMap.set(projection.id, marker);
  });
}
