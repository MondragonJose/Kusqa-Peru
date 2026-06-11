/**
 * useMissionMarkerLayer
 * Manages Leaflet mission/proposal pin markers within a MarkerCluster group.
 * Consumes InitiativeMapEntity as the single rendering contract.
 */
import type { InitiativeMapEntity } from "@/domain/initiativeMapEntity";
import type * as L from "leaflet";
import {
  projectMapMarker,
  getEntityPresentation,
  isProposalEntity,
} from "../projections/mapEntityProjection";
import { regionGradient, type Region } from "@/domain/regions";

type MarkerLayerOptions = {
  L: typeof import("leaflet");
  clusterGroup: L.LayerGroup;
  entities: InitiativeMapEntity[];
  selectedMissionId: string | null;
  onSelectMission: (id: string) => void;
  markersMap: Map<string, L.Marker>;
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
  markersMap,
}: MarkerLayerOptions): void {
  entities.forEach((entity) => {
    const projection = projectMapMarker(entity);
    if (!projection) return;

    const isSelected = selectedMissionId === projection.id;
    const isProposal = isProposalEntity(entity);

    const pres = getEntityPresentation(entity);
    if (pres.isHidden) return;
    const gradient = regionGradient(projection.region as Region);
    const glow = REGION_GLOW[projection.region] ?? REGION_GLOW.sierra;
    const iconSize = isSelected ? 52 : 38;

    const proposalShape = `rounded-xl bg-white dark:bg-card border-2 border-violet-300 dark:border-violet-600 border-dashed text-foreground shadow-md`;
    const missionShape = `rounded-full ${gradient} text-white shadow-glow border-2 border-white/90`;
    const shapeClasses = [
      isProposal ? proposalShape : missionShape,
      pres.containerClass,
      pres.animationClass,
    ]
      .filter(Boolean)
      .join(" ");
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

    const marker = L.marker([projection.coords!.lat, projection.coords!.lng], { icon: customIcon });
    marker.on("click", () => onSelectMission(projection.id));

    clusterGroup.addLayer(marker);
    markersMap.set(projection.id, marker);
  });
}
