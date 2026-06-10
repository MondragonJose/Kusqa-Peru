import type { CivicTrace } from "@/domain/civicTrace";
import { traceToNarrative, type CivicTraceNarrativeCtx } from "@/domain/civicTraceNarrative";
import { regionChipBg } from "@/domain/regions";
import type { AdjacencyMap } from "@/domain/spatialRelationships";
import type { DistrictGeometry } from "@/services/spatialRepository";

type LeafletInstance = any;

const LOD_ZOOM_THRESHOLD = 10;

type HuellaLayerOptions = {
  L: LeafletInstance;
  clusterGroup: LeafletInstance;
  huellas: CivicTrace[];
  selectedHuellaId: string | null;
  onSelectHuella: (id: string) => void;
  boundaryLayerRef: { current: LeafletInstance | null };
  map: LeafletInstance;
  activeSlugs: string[];
  adjacencyMap: AdjacencyMap;
  districtNarratives: Map<string, string | null>;
  zoom: number;
  showDormant: boolean;
  spatialGeometry?: DistrictGeometry[];
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

function traceEmoji(trace: CivicTrace): string {
  switch (trace.strength) {
    case "landmark":
      return "🏛️";
    case "settled":
      return "🦙";
    default:
      return "📍";
  }
}

type DistrictAgg = {
  districtSlug: string;
  district: string;
  region: string;
  count: number;
  dormantCount: number;
  centroid: { lat: number; lng: number };
  latestTrace: CivicTrace;
  traces: CivicTrace[];
};

function buildDistrictAggregations(
  huellas: CivicTrace[],
  spatialGeometry?: DistrictGeometry[],
): DistrictAgg[] {
  const geoBySlug = new Map<string, DistrictGeometry>();
  if (spatialGeometry) {
    for (const g of spatialGeometry) {
      geoBySlug.set(g.slug, g);
    }
  }

  const aggMap = new Map<string, DistrictAgg>();

  for (const trace of huellas) {
    if (!trace.coords) continue;
    let agg = aggMap.get(trace.districtSlug);
    if (!agg) {
      const geo = geoBySlug.get(trace.districtSlug);
      const centroid = geo ? { lat: geo.latitude, lng: geo.longitude } : trace.coords;
      agg = {
        districtSlug: trace.districtSlug,
        district: trace.district,
        region: trace.region,
        count: 0,
        dormantCount: 0,
        centroid,
        latestTrace: trace,
        traces: [],
      };
      aggMap.set(trace.districtSlug, agg);
    }
    agg.count++;
    if (trace.vitality === "dormant") agg.dormantCount++;
    agg.traces.push(trace);
    if (
      trace.completedAt &&
      (!agg.latestTrace.completedAt || trace.completedAt > agg.latestTrace.completedAt)
    ) {
      agg.latestTrace = trace;
    }
  }

  return [...aggMap.values()];
}

function renderDistrictAggregated({
  L,
  clusterGroup,
  huellas,
  selectedHuellaId,
  onSelectHuella,
  boundaryLayerRef,
  map,
  activeSlugs,
  adjacencyMap,
  districtNarratives,
  showDormant,
  spatialGeometry,
}: HuellaLayerOptions): void {
  const districts = buildDistrictAggregations(huellas, spatialGeometry);
  const allDormant = !showDormant ? [] : huellas.filter((t) => t.vitality === "dormant");

  for (const agg of districts) {
    const isAllDormant = agg.dormantCount === agg.count;
    const isSelected = selectedHuellaId === agg.latestTrace.initiativeId;
    const effectiveCount = showDormant ? agg.count : agg.count - agg.dormantCount;

    if (effectiveCount <= 0) continue;

    const opacity = isAllDormant ? "opacity(0.5) grayscale(0.4)" : "sepia(0.3) saturate(0.5)";

    const htmlContent = `
      <div class="relative flex items-center justify-center pointer-events-auto" style="width: 44px; height: 44px;">
        <div class="relative flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 border-2 ${isSelected ? "border-amber-500" : "border-stone-300 dark:border-stone-600"} transition-all duration-300" style="width: 100%; height: 100%; filter: ${opacity};">
          <span class="select-none text-xs font-bold text-stone-600 dark:text-stone-300">${agg.count}</span>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: htmlContent,
      className: "custom-huella-district-cluster",
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const traceList = agg.traces
      .slice(0, 5)
      .map(
        (t) =>
          `<div class="flex items-center gap-1.5 text-[10px] py-0.5 ${t.vitality === "dormant" ? "opacity-50" : ""}"><span>${traceEmoji(t)}</span><span class="truncate flex-1">${t.title}</span><span class="text-muted-foreground">${STRENGTH_LABEL[t.strength] ?? t.strength}</span></div>`,
      )
      .join("");
    const remaining =
      agg.traces.length > 5
        ? `<div class="text-[9px] text-muted-foreground pt-1">+${agg.traces.length - 5} más</div>`
        : "";

    const popupHtml = `
      <div class="p-3 text-xs w-64 font-sans">
        <div class="flex items-start justify-between gap-1.5 pb-2 border-b border-border/40">
          <div class="flex-1 min-w-0">
            <div class="font-bold text-foreground text-sm leading-tight">${agg.district}</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">${agg.count} huella${agg.count !== 1 ? "s" : ""} · ${agg.dormantCount} dormida${agg.dormantCount !== 1 ? "s" : ""}</div>
          </div>
        </div>
        <div class="mt-2 space-y-0.5">${traceList}${remaining}</div>
      </div>
    `;

    const marker = L.marker([agg.centroid.lat, agg.centroid.lng], {
      icon: customIcon,
    });

    marker.bindPopup(popupHtml, {
      closeButton: false,
      offset: L.point(0, -8),
      className: "custom-huella-popup",
      maxWidth: 300,
    });

    marker.on("click", () => onSelectHuella(agg.latestTrace.initiativeId));

    clusterGroup.addLayer(marker);
  }
}

function renderIndividualMarkers({
  L,
  clusterGroup,
  huellas,
  selectedHuellaId,
  onSelectHuella,
  boundaryLayerRef,
  map,
  activeSlugs,
  adjacencyMap,
  districtNarratives,
  showDormant,
}: HuellaLayerOptions): void {
  for (const trace of huellas) {
    if (!trace.coords) continue;

    const isDormant = trace.vitality === "dormant";
    const isSelected = selectedHuellaId === trace.initiativeId;

    const opacity = isDormant
      ? "sepia(0.5) saturate(0.3) grayscale(0.3) opacity(0.5)"
      : "sepia(0.5) saturate(0.5) grayscale(0.15)";

    const htmlContent = `
      <div class="relative flex items-center justify-center pointer-events-auto" style="width: 34px; height: 34px;">
        <div class="relative flex items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 border-2 ${isSelected ? "border-amber-500" : isDormant ? "border-stone-200 dark:border-stone-700" : "border-stone-300 dark:border-stone-600"} transition-all duration-300" style="width: 78%; height: 78%; filter: ${opacity};">
          <span class="select-none text-xs">${traceEmoji(trace)}</span>
        </div>
      </div>
    `;

    const customIcon = L.divIcon({
      html: htmlContent,
      className: "custom-huella-pin",
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const ctx: CivicTraceNarrativeCtx = {
      activeSlugs,
      adjacency: adjacencyMap,
      districtNarrative: districtNarratives.get(trace.districtSlug) ?? null,
    };

    const narrative = traceToNarrative(trace, ctx);
    const chipClass = regionChipBg(trace.region as any);

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
        <div class="mt-2 flex items-center gap-2 text-[9px] text-muted-foreground">
          <span class="px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800">${STRENGTH_LABEL[trace.strength] ?? trace.strength}</span>
          <span class="px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800">${VITALITY_LABEL[trace.vitality] ?? trace.vitality}</span>
          <span class="ml-auto">${trace.verifiedCount} verificaciones</span>
        </div>
      </div>
    `;

    const marker = L.marker([trace.coords.lat, trace.coords.lng], { icon: customIcon });

    marker.bindPopup(popupHtml, {
      closeButton: false,
      offset: L.point(0, -8),
      className: "custom-huella-popup",
      maxWidth: 300,
    });

    marker.on("click", () => onSelectHuella(trace.initiativeId));

    if (trace.boundary && boundaryLayerRef) {
      marker.on("mouseover", () => {
        if (boundaryLayerRef.current) {
          map.removeLayer(boundaryLayerRef.current);
        }
        boundaryLayerRef.current = L.geoJSON(trace.boundary, {
          style: {
            color: "#a8a29e",
            weight: 2,
            opacity: 0.6,
            fillColor: "#a8a29e",
            fillOpacity: 0.08,
          },
        }).addTo(map);
      });

      marker.on("mouseout", () => {
        if (boundaryLayerRef.current) {
          map.removeLayer(boundaryLayerRef.current);
          boundaryLayerRef.current = null;
        }
      });
    }

    clusterGroup.addLayer(marker);
  }
}

export function renderHuellaMarkers(options: HuellaLayerOptions): void {
  const { zoom, showDormant, huellas } = options;

  const visible = showDormant ? huellas : huellas.filter((t) => t.vitality !== "dormant");

  if (zoom < LOD_ZOOM_THRESHOLD) {
    renderDistrictAggregated({ ...options, huellas: visible });
  } else {
    renderIndividualMarkers({ ...options, huellas: visible });
  }
}
