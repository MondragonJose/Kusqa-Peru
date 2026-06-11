import type { CivicTrace } from "@/domain/civicTrace";
import { traceToNarrative, type CivicTraceNarrativeCtx } from "@/domain/civicTraceNarrative";
import { regionChipBg } from "@/domain/regions";
import { createRoot, type Root } from "react-dom/client";

type LeafletInstance = any;

export type FootprintMarkerStyle = {
  iconSize: number;
  opacity: number;
  saturate: number;
  borderClass: string;
  emoji: string;
};

const STRENGTH_LABEL: Record<string, string> = {
  faint: "Tenue",
  settled: "Visible",
  landmark: "Hito",
};

const VITALITY_LABEL: Record<string, string> = {
  fresh: "Reciente",
  settling: "Asentándose",
  dormant: "Dormida",
};

export function getFootprintMarkerStyle(trace: CivicTrace): FootprintMarkerStyle {
  const isDormant = trace.vitality === "dormant";

  const sizeByStrength: Record<string, number> = {
    faint: 32,
    settled: 34,
    landmark: 40,
  };

  const emojiByStrength: Record<string, string> = {
    faint: "📍",
    settled: "🦙",
    landmark: "🏛️",
  };

  const borderByStrength: Record<string, string> = {
    faint: "border-stone-300 dark:border-stone-600",
    settled: "border-stone-300 dark:border-stone-600",
    landmark: "border-amber-400 dark:border-amber-500",
  };

  return {
    iconSize: sizeByStrength[trace.strength] ?? 34,
    opacity: isDormant ? 50 : 75,
    saturate: isDormant ? 0.3 : 0.5,
    borderClass: borderByStrength[trace.strength] ?? borderByStrength.faint,
    emoji: emojiByStrength[trace.strength] ?? emojiByStrength.faint,
  };
}

export type FootprintMarkerOptions = {
  L: LeafletInstance;
  clusterGroup: LeafletInstance;
  footprints: CivicTrace[];
  onSelectFootprint: (id: string) => void;
  narrativeCtx?: CivicTraceNarrativeCtx;
};

export function renderFootprintMarkers(options: FootprintMarkerOptions): void {
  const { L, clusterGroup, footprints, onSelectFootprint, narrativeCtx } = options;
  const popupRoots = new Map<string, Root>();

  for (const trace of footprints) {
    if (!trace.coords) continue;

    const style = getFootprintMarkerStyle(trace);
    const chipClass = regionChipBg(trace.region as any);

    const markerContainer = `
      <div class="relative flex items-center justify-center pointer-events-auto" style="width: ${style.iconSize}px; height: ${style.iconSize}px;">
        <div class="relative flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 border-2 ${style.borderClass} transition-all duration-300" style="width: 78%; height: 78%; opacity: ${style.opacity}%; filter: sepia(0.5) saturate(${style.saturate});">
          <span class="select-none text-xs">${style.emoji}</span>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: markerContainer,
      className: "custom-footprint-pin",
      iconSize: [style.iconSize, style.iconSize],
      iconAnchor: [style.iconSize / 2, style.iconSize / 2],
    });

    const narrative = narrativeCtx ? traceToNarrative(trace, narrativeCtx) : trace.narrative;

    const popupHtml = `
      <div class="p-3 text-xs w-64 font-sans">
        <div class="flex items-start justify-between gap-1.5 pb-2 border-b border-border/40">
          <div class="flex-1 min-w-0">
            <div class="font-bold text-foreground text-sm truncate leading-tight">${trace.title}</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">📍 ${trace.district}</div>
          </div>
          <span class="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${chipClass} uppercase tracking-wider">${trace.region}</span>
        </div>
        <div class="mt-2 text-[10px] text-muted-foreground/80 leading-relaxed">${narrative}</div>
        <div class="mt-2 flex items-center gap-2 text-[9px] text-muted-foreground flex-wrap">
          <span class="px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800">${STRENGTH_LABEL[trace.strength] ?? trace.strength}</span>
          <span class="px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800">${VITALITY_LABEL[trace.vitality] ?? trace.vitality}</span>
          <span class="ml-auto">${trace.verifiedCount} verificac${trace.verifiedCount !== 1 ? "iones" : "ión"}</span>
        </div>
      </div>
    `;

    const marker = L.marker([trace.coords.lat, trace.coords.lng], {
      icon: customIcon,
    });

    marker.bindPopup(popupHtml, {
      closeButton: false,
      offset: L.point(0, -8),
      className: "custom-footprint-popup",
      maxWidth: 300,
    });

    marker.on("click", () => onSelectFootprint(trace.initiativeId));

    clusterGroup.addLayer(marker);
  }
}
