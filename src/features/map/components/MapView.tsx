import { useEffect, useMemo, useRef, useState } from "react";
import type { MapCoords } from "@/types";
import type { InitiativeMapEntity } from "@/domain/initiativeMapEntity";
import { isMissionEntity, isProposalEntity } from "../projections/mapEntityProjection";
import {
  PERU_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_DETAIL_ZOOM,
  MAP_TILE_LAYER_URL,
  MAP_TILE_LIGHT_URL,
  MAP_ATTRIBUTION,
} from "../constants/mapConstants";
import { TERRITORY_HIERARCHY, type TerritoryNode } from "../constants/territoryHierarchy";
import { useTerritorialGeometry } from "@/features/districts/hooks";
import { useHuellas } from "@/features/map/hooks/useHuellas";
import type { BBox } from "@/services/traceRepository";
import { spatialRepository } from "@/services/spatialRepository";
import { MapControls } from "./MapControls";
import { isValidLatLng } from "../utils/projection";
import { renderDistrictLayer, buildFeatureCollection } from "../layers/useDistrictLayer";
import { renderMissionMarkers } from "../layers/useMissionMarkerLayer";
import { createUserLocationPin } from "../layers/useUserLocationPin";
import { renderHuellaMarkers } from "../layers/useHuellaLayer";
import { buildAdjacencyMap } from "@/domain/spatialRelationships";
import { MapPin, Eye, ChevronRight, Landmark, Zap, ShieldCheck, Footprints } from "lucide-react";
import type { TerritorialActivityLevel } from "@/domain/territorialIntelligence";

// Import Leaflet styles directly for compilation
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

type MapViewProps = {
  missions: InitiativeMapEntity[];
  selectedMissionId: string | null;
  onSelectMission: (id: string) => void;
  userCoords: MapCoords | null;
  userLocationLoading: boolean;
  onRequestUserLocation: () => void;
  focalCoords?: MapCoords | null;
  /** Per-district warmth levels for polygon coloring. */
  districtWarmth?: Record<string, TerritorialActivityLevel>;
  /** Huella (trace) layer */
  showHuellas?: boolean;
  onToggleHuellas?: () => void;
  selectedHuellaId?: string | null;
  onSelectHuella?: (id: string) => void;
  /**
   * Padding reserved for side panels (eg. sidebar + detail panel).
   * Applied via paddingTopLeft/paddingBottomRight in fitBounds when centering
   * on a selected entity, so the popup stays fully visible inside the viewport.
   */
  selectionPaddingTopLeft?: [number, number];
  selectionPaddingBottomRight?: [number, number];
};

type MapMode = "pins" | "districts";
type MapStyle = "light" | "dark";

export function MapView({
  missions,
  selectedMissionId,
  onSelectMission,
  userCoords,
  userLocationLoading,
  onRequestUserLocation,
  focalCoords = null,
  districtWarmth,
  showHuellas = true,
  onToggleHuellas,
  selectedHuellaId = null,
  onSelectHuella,
  selectionPaddingTopLeft = [0, 0],
  selectionPaddingBottomRight = [0, 0],
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const userCircleRef = useRef<any>(null);
  const geojsonLayerRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  const huellaClusterRef = useRef<any>(null);
  const huellaBoundaryRef = useRef<{ current: any | null }>({ current: null });

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [LInstance, setLInstance] = useState<any>(null);

  // Map settings
  const [mapMode, setMapMode] = useState<MapMode>("pins");
  const [mapStyle, setMapStyle] = useState<MapStyle>("light");

  // GPS Privacy & Proximity Settings
  const [isExploradorMode, setIsExploradorMode] = useState(true);

  // Deep Territorial Exploration State
  const [activeTerritoryPath, setActiveTerritoryPath] = useState<TerritoryNode[]>([]);

  // Phase 12: load dynamic territorial hierarchy from DB, fall back to hardcoded
  const { data: spatialGeometry } = useTerritorialGeometry();
  const hierarchyTree = useMemo<Record<string, TerritoryNode[]>>(() => {
    if (spatialGeometry && spatialGeometry.length > 0) {
      return spatialRepository.buildHierarchyTree(spatialGeometry);
    }
    return TERRITORY_HIERARCHY;
  }, [spatialGeometry]);

  // Build district boundary polygons from spatial geometry, fall back to hardcoded
  const districtPolygons = useMemo<
    | {
        type: "FeatureCollection";
        features: Array<{
          type: "Feature";
          properties: Record<string, unknown>;
          geometry: { type: "Polygon"; coordinates: number[][][] };
        }>;
      }
    | undefined
  >(() => {
    if (!spatialGeometry || spatialGeometry.length === 0) return undefined;
    const boundaries = spatialGeometry
      .filter((g) => g.boundary?.geometry?.type === "Polygon")
      .map((g) => ({
        type: "Feature" as const,
        properties: {
          name: g.displayName,
          region: g.region,
          display_name: g.displayName,
          ...g.boundary?.properties,
        },
        geometry: g.boundary!.geometry as { type: "Polygon"; coordinates: number[][][] },
      }));
    if (boundaries.length === 0) return undefined;
    return buildFeatureCollection(boundaries);
  }, [spatialGeometry]);

  // Huella spatial context (memoized from spatialGeometry)
  const huellaAdjacency = useMemo(() => {
    if (!spatialGeometry || spatialGeometry.length === 0) return new Map();
    return buildAdjacencyMap(spatialGeometry);
  }, [spatialGeometry]);

  const huellaNarratives = useMemo(() => {
    const map = new Map<string, string | null>();
    if (spatialGeometry) {
      for (const g of spatialGeometry) {
        map.set(g.slug, g.narrative);
      }
    }
    return map;
  }, [spatialGeometry]);

  // Huella layer: debounced bbox-based query
  const [debouncedBbox, setDebouncedBbox] = useState<BBox | undefined>(undefined);
  const hasInitiallyFitted = useRef(false);
  const [currentZoom, setCurrentZoom] = useState(MAP_DEFAULT_ZOOM);
  const [showDormantHuellas, setShowDormantHuellas] = useState(true);
  const bboxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: huellas = [] } = useHuellas(debouncedBbox);

  const huellaActiveSlugs = useMemo(() => {
    return [...new Set(huellas.map((t) => t.districtSlug))];
  }, [huellas]);

  // Calculate matching missions for active region/department/district
  const getFilteredMissionsForSelectedTerritory = (): InitiativeMapEntity[] => {
    if (activeTerritoryPath.length === 0) return missions;
    const currentLeafNode = activeTerritoryPath[activeTerritoryPath.length - 1];

    return missions.filter((m) => {
      if (currentLeafNode.type === "region") {
        return m.region === currentLeafNode.regionKey;
      }
      if (currentLeafNode.type === "department") {
        return m.region === currentLeafNode.regionKey;
      }
      if (currentLeafNode.type === "district") {
        const districtQuery = currentLeafNode.name
          .toLowerCase()
          .replace(" centro", "")
          .replace(" ciudad", "");
        const districtMatch = (m.location?.district ?? "").toLowerCase().includes(districtQuery);
        const regionMatch = m.region === currentLeafNode.regionKey;
        return districtMatch || regionMatch;
      }
      return true;
    });
  };

  const territoryMissions = getFilteredMissionsForSelectedTerritory();

  // Dynamic calculations for territorial discovery summaries
  const totalMissionsActive = territoryMissions.length;
  const totalExploradores = territoryMissions.reduce(
    (acc, m) => acc + (isMissionEntity(m) ? (m.participants ?? 0) : 0),
    0,
  );

  const getDominantCategory = (): string => {
    if (territoryMissions.length === 0) return "Ninguna";
    const counts: Record<string, number> = {};
    territoryMissions.forEach((m) => {
      counts[m.category] = (counts[m.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Comunidad";
  };

  const dominantCategory = getDominantCategory();

  // Client-side Leaflet loader
  useEffect(() => {
    if (typeof window === "undefined") return;
    let isMounted = true;
    async function loadLeaflet() {
      try {
        const L = (await import("leaflet")).default;
        await import("leaflet.markercluster");
        if (isMounted) {
          setLInstance(L);
          setLeafletLoaded(true);
        }
      } catch (err) {
        console.error("Leaflet loading error:", err);
      }
    }
    loadLeaflet();
    return () => {
      isMounted = false;
    };
  }, []);

  // Map creation
  useEffect(() => {
    if (!leafletLoaded || !LInstance || !containerRef.current || mapRef.current) return;
    const L = LInstance;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      layers: [],
    }).setView([PERU_DEFAULT_CENTER.lat, PERU_DEFAULT_CENTER.lng], MAP_DEFAULT_ZOOM);

    const tileUrl = mapStyle === "dark" ? MAP_TILE_LAYER_URL : MAP_TILE_LIGHT_URL;
    const tileLayer = L.tileLayer(tileUrl, { attribution: MAP_ATTRIBUTION, maxZoom: 19 }).addTo(
      map,
    );
    tileLayerRef.current = tileLayer;

    // Attribution override
    const attrControl = L.control({ position: "bottomright" });
    attrControl.onAdd = () => {
      const div = L.DomUtil.create(
        "div",
        "glass rounded-lg px-2 py-1 text-[10px] text-muted-foreground",
      );
      div.innerHTML = MAP_ATTRIBUTION;
      return div;
    };
    attrControl.addTo(map);

    // Huella Cluster Group (added first so missions render on top)
    const huellaCluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 120,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          html: `<div class="relative flex items-center justify-center w-12 h-12 rounded-full bg-stone-400/30 dark:bg-stone-700/40 border-2 border-stone-300 dark:border-stone-500 text-stone-600 dark:text-stone-300 font-display font-bold text-xs" style="filter: sepia(0.3) saturate(0.6);">
            <span class="relative z-10">${count}</span>
          </div>`,
          className: "custom-huella-cluster",
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        });
      },
    });
    map.addLayer(huellaCluster);
    huellaClusterRef.current = huellaCluster;

    // Marker Clusters
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster: any) => {
        const childCount = cluster.getChildCount();
        return L.divIcon({
          html: `<div class="relative flex items-center justify-center w-11 h-11 rounded-full bg-primary text-white border-2 border-white/95 shadow-lift font-display font-bold text-xs transition-transform duration-300 hover:scale-105">
            <span class="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring"></span>
            <span class="relative z-10">${childCount}</span>
          </div>`,
          className: "custom-cluster-icon",
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
      },
    });
    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    mapRef.current = map;

    // Huella: debounced bbox + zoom sync
    const updateBbox = () => {
      const bounds = map.getBounds();
      const bbox: BBox = {
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast(),
      };
      if (bboxTimerRef.current) clearTimeout(bboxTimerRef.current);
      bboxTimerRef.current = setTimeout(() => setDebouncedBbox(bbox), 300);
    };
    const updateZoom = () => setCurrentZoom(map.getZoom());
    map.on("moveend", updateBbox);
    map.on("zoomend", updateZoom);
    updateBbox();
    updateZoom();

    updateLayersAndStyles();

    return () => {
      map.off("moveend", updateBbox);
      map.off("zoomend", updateZoom);
      if (bboxTimerRef.current) clearTimeout(bboxTimerRef.current);
      if (mapRef.current) {
        if (huellaBoundaryRef.current.current) {
          mapRef.current.removeLayer(huellaBoundaryRef.current.current);
          huellaBoundaryRef.current.current = null;
        }
        mapRef.current.remove();
        mapRef.current = null;
        clusterGroupRef.current = null;
        huellaClusterRef.current = null;
        geojsonLayerRef.current = null;
        userMarkerRef.current = null;
        userCircleRef.current = null;
        markersMapRef.current.clear();
      }
    };
  }, [leafletLoaded, LInstance]);

  // Redraw sync layers
  const updateLayersAndStyles = () => {
    if (!leafletLoaded || !LInstance || !mapRef.current) return;
    const L = LInstance;
    const map = mapRef.current;

    // Tile style update
    if (tileLayerRef.current) {
      tileLayerRef.current.setUrl(mapStyle === "dark" ? MAP_TILE_LAYER_URL : MAP_TILE_LIGHT_URL);
    }

    const clusterGroup = clusterGroupRef.current;

    clusterGroup.clearLayers();
    markersMapRef.current.clear();

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }

    // Render District Boundaries with territorial warmth
    if (mapMode === "districts") {
      geojsonLayerRef.current = renderDistrictLayer({
        L,
        map,
        polygons: districtPolygons,
        warmth: districtWarmth,
      });
    }

    // Render Mission Pins
    if (mapMode === "pins" || mapMode === "districts") {
      renderMissionMarkers({
        L,
        clusterGroup,
        entities: territoryMissions,
        selectedMissionId,
        onSelectMission,
        markersMap: markersMapRef.current,
      });
    }

    // Render Huella Pins
    if (huellaClusterRef.current) {
      huellaClusterRef.current.clearLayers();
    }
    if (showHuellas && huellas.length > 0 && huellaClusterRef.current) {
      renderHuellaMarkers({
        L,
        clusterGroup: huellaClusterRef.current,
        huellas,
        selectedHuellaId,
        onSelectHuella: (id: string) => onSelectHuella?.(id),
        boundaryLayerRef: huellaBoundaryRef,
        map,
        activeSlugs: huellaActiveSlugs,
        adjacencyMap: huellaAdjacency,
        districtNarratives: huellaNarratives,
        zoom: currentZoom,
        showDormant: showDormantHuellas,
        spatialGeometry,
      });
    }

    // Clean user marks
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
      userMarkerRef.current = null;
    }
    if (userCircleRef.current) {
      map.removeLayer(userCircleRef.current);
      userCircleRef.current = null;
    }

    // Draw GPS location with Proximity settings
    if (userCoords && isValidLatLng(userCoords.lat, userCoords.lng)) {
      if (isExploradorMode) {
        // MODO EXPLORADOR: Generalized radius circle pulse (2.5km)
        const pulseCircle = L.circle([userCoords.lat, userCoords.lng], {
          radius: 2500,
          color: "#D4A832",
          weight: 2,
          opacity: 0.55,
          fillColor: "#D4A832",
          fillOpacity: 0.1,
          dashArray: "6, 12",
          className: "explorador-proximity-circle",
        }).addTo(map);

        pulseCircle.bindPopup(
          `
          <div class="p-3 text-center text-xs w-48 font-sans">
            <span class="text-lg">🛡️</span>
            <div class="font-bold text-foreground mt-1">Presencia Territorial</div>
            <div class="text-[10px] text-muted-foreground mt-1">Tu ubicación aproximada en un radio de 2.5 km activa.</div>
            <div class="text-[9px] text-amber-600 dark:text-amber-400 mt-1 font-bold">KUSQA nunca comparte tu ubicación exacta.</div>
          </div>
        `,
          { closeButton: false },
        );

        userCircleRef.current = pulseCircle;
      } else {
        // MODO PRECISO: Leaflet 🌱 center dot
        userMarkerRef.current = createUserLocationPin(L, map, userCoords);
      }
    }
  };

  // Sync Layers & Style Toggles
  useEffect(() => {
    updateLayersAndStyles();
  }, [
    missions,
    userCoords,
    selectedMissionId,
    leafletLoaded,
    mapMode,
    mapStyle,
    isExploradorMode,
    activeTerritoryPath,
    huellas,
    showHuellas,
    selectedHuellaId,
    huellaActiveSlugs,
    huellaAdjacency,
    huellaNarratives,
    currentZoom,
    showDormantHuellas,
    spatialGeometry,
  ]);

  // Center selected mission changes — use fitBounds with padding so popup
  // stays inside the viewport and doesn't clip behind side panels.
  useEffect(() => {
    if (!leafletLoaded || !LInstance || !mapRef.current || !selectedMissionId) return;
    const selectedMission = missions.find((m) => m.id === selectedMissionId);
    const selectedCoords = selectedMission?.location?.coords;
    if (selectedCoords && isValidLatLng(selectedCoords.lat, selectedCoords.lng)) {
      const point = LInstance.latLng(selectedCoords.lat, selectedCoords.lng);
      const bounds = LInstance.latLngBounds([point]);
      mapRef.current.fitBounds(bounds, {
        paddingTopLeft: selectionPaddingTopLeft,
        paddingBottomRight: selectionPaddingBottomRight,
        maxZoom: MAP_DETAIL_ZOOM,
        animate: true,
        duration: 1.0,
      });
    }
  }, [selectedMissionId, leafletLoaded, LInstance, missions, selectionPaddingTopLeft, selectionPaddingBottomRight]);

  // Auto-center on user location when first obtained
  useEffect(() => {
    if (
      !leafletLoaded ||
      !mapRef.current ||
      !userCoords ||
      !isValidLatLng(userCoords.lat, userCoords.lng)
    )
      return;
    // Only center if this is the first time we get user coords (not already centered)
    // We use a simple heuristic: if the map is still at default center, center on user
    const currentCenter = mapRef.current.getCenter();
    const distanceFromDefault = Math.sqrt(
      Math.pow(currentCenter.lat - PERU_DEFAULT_CENTER.lat, 2) +
        Math.pow(currentCenter.lng - PERU_DEFAULT_CENTER.lng, 2),
    );
    if (distanceFromDefault < 0.1) {
      mapRef.current.setView([userCoords.lat, userCoords.lng], 11, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [userCoords, leafletLoaded]);

  // Fit bounds to all visible entities on initial load and filter change.
  // On subsequent changes with an active selection the selection-centering
  // effect (above) takes over so the user preserves their focus entity.
  useEffect(() => {
    if (!leafletLoaded || !LInstance || !mapRef.current) return;

    const missionsWithCoords = missions.filter(
      (m) => m.location?.coords && isValidLatLng(m.location.coords.lat, m.location.coords.lng),
    );
    if (missionsWithCoords.length === 0) return;

    const isFirstFit = !hasInitiallyFitted.current;
    hasInitiallyFitted.current = true;

    // When a marker is selected and this is not the first ever fit, skip
    // so the selection-centering effect handles the viewport.
    if (!isFirstFit && selectedMissionId && missions.some((m) => m.id === selectedMissionId)) return;

    const latLngs = missionsWithCoords.map((m) =>
      LInstance.latLng(m.location!.coords!.lat, m.location!.coords!.lng),
    );
    const bounds = LInstance.latLngBounds(latLngs);
    mapRef.current.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 12,
      animate: !isFirstFit,
      duration: 1.5,
    });

    if (import.meta.env.DEV) {
      const noCoordCount = missions.length - missionsWithCoords.length;
      console.log("[KUSQA MAP TRACE] Fit bounds to entities:", {
        inputTotal: missions.length,
        withCoords: missionsWithCoords.length,
        noCoords: noCoordCount,
        pinesEnMapa: missionsWithCoords.length,
        isFirstFit,
      });
      if (noCoordCount > 0) {
        console.log(
          "[KUSQA MAP TRACE] Entidades sin coordenadas (no tendrán pin):",
          missions
            .filter((m) => !m.location?.coords || !isValidLatLng(m.location.coords.lat, m.location.coords.lng))
            .map((m) => ({ id: m.id, title: m.title })),
        );
      }
    }
  }, [missions, leafletLoaded, LInstance, selectedMissionId]);

  // GPS User centering sync
  const handleCenterUser = () => {
    if (userCoords && isValidLatLng(userCoords.lat, userCoords.lng) && mapRef.current) {
      mapRef.current.setView([userCoords.lat, userCoords.lng], MAP_DETAIL_ZOOM, {
        animate: true,
        duration: 1.2,
      });
      if (userMarkerRef.current) userMarkerRef.current.openPopup();
      if (userCircleRef.current) userCircleRef.current.openPopup();
    } else {
      onRequestUserLocation();
    }
  };

  // Navigation click controls
  const handleZoomIn = () => {
    if (mapRef.current) mapRef.current.zoomIn();
  };
  const handleZoomOut = () => {
    if (mapRef.current) mapRef.current.zoomOut();
  };

  const handleResetView = () => {
    if (mapRef.current) {
      mapRef.current.setView([PERU_DEFAULT_CENTER.lat, PERU_DEFAULT_CENTER.lng], MAP_DEFAULT_ZOOM, {
        animate: true,
        duration: 1.2,
      });
      setActiveTerritoryPath([]);
    }
  };

  // Sync autocomplete focal views
  useEffect(() => {
    if (focalCoords && isValidLatLng(focalCoords.lat, focalCoords.lng) && mapRef.current) {
      mapRef.current.setView([focalCoords.lat, focalCoords.lng], MAP_DETAIL_ZOOM, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [focalCoords]);

  // Deep Territorial Navigation click handlers
  const handleSelectTerritoryNode = (node: TerritoryNode) => {
    const parentKey = node.parentId || node.id;

    // Fit path hierarchy
    let nextPath: TerritoryNode[] = [];
    if (node.type === "region") {
      nextPath = [node];
    } else if (node.type === "department") {
      const regionNode = hierarchyTree.root.find((r) => r.id === node.regionKey);
      nextPath = regionNode ? [regionNode, node] : [node];
    } else if (node.type === "district") {
      // Find region
      const regionNode = hierarchyTree.root.find((r) => r.id === node.regionKey);
      // Find department
      let deptNode: TerritoryNode | undefined;
      for (const list of Object.values(hierarchyTree)) {
        const found = list.find(
          (item) =>
            item.type === "department" && hierarchyTree[item.id]?.some((dst) => dst.id === node.id),
        );
        if (found) {
          deptNode = found;
          break;
        }
      }
      nextPath = regionNode && deptNode ? [regionNode, deptNode, node] : [node];
    }

    setActiveTerritoryPath(nextPath);
    if (mapRef.current) {
      mapRef.current.setView([node.coords.lat, node.coords.lng], node.zoom, {
        animate: true,
        duration: 1.2,
      });
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setActiveTerritoryPath([]);
      if (mapRef.current) {
        mapRef.current.setView(
          [PERU_DEFAULT_CENTER.lat, PERU_DEFAULT_CENTER.lng],
          MAP_DEFAULT_ZOOM,
          { animate: true, duration: 1.2 },
        );
      }
    } else {
      const nextPath = activeTerritoryPath.slice(0, index + 1);
      setActiveTerritoryPath(nextPath);
      const targetNode = nextPath[nextPath.length - 1];
      if (mapRef.current && targetNode) {
        mapRef.current.setView([targetNode.coords.lat, targetNode.coords.lng], targetNode.zoom, {
          animate: true,
          duration: 1.2,
        });
      }
    }
  };

  // Get options for current hierarchy stage
  const getTerritoryOptions = (): TerritoryNode[] => {
    if (activeTerritoryPath.length === 0) {
      return hierarchyTree.root || [];
    }
    const lastNode = activeTerritoryPath[activeTerritoryPath.length - 1];
    return hierarchyTree[lastNode.id] || [];
  };

  const territoryOptions = getTerritoryOptions();
  const activeRegion = activeTerritoryPath[0]?.regionKey || "costa";

  return (
    <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-2xl border border-border/40 flex flex-col lg:flex-row-reverse">
      {/* MAP LAYER CONTAINER */}
      <div className="flex-1 relative h-full min-h-[480px] md:min-h-[580px] lg:min-h-[660px]">
        <div
          ref={containerRef}
          className={`w-full h-full min-h-[480px] md:min-h-[580px] lg:min-h-[660px] bg-secondary/10 z-0 kusqa-territorial-map${mapStyle === "dark" ? " dark-map" : ""}`}
        />

        {/* Loading Overlay */}
        {!leafletLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/95 z-20 backdrop-blur-sm">
            <div className="relative flex items-center justify-center w-14 h-14 mb-4">
              <span className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-pulse"></span>
              <span className="absolute inset-0 rounded-full border-4 border-t-accent animate-spin"></span>
            </div>
            <p className="font-display font-semibold text-foreground text-xs uppercase tracking-widest text-amber-600">
              Explorando el atlas cívico...
            </p>
          </div>
        )}

        {/* Empty Map State */}
        {leafletLoaded && missions.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 z-10 backdrop-blur-sm p-6 text-center">
            <div className="text-5xl mb-4">🗺️</div>
            <h3 className="font-display font-black text-lg text-foreground mb-2">
              Mapa
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-4">
              Explora el mapa para descubrir misiones activas en todo el Perú.
            </p>
            <button
              onClick={() => (window.location.href = "/app/mapa")}
              className="px-4 py-2 rounded-xl bg-secondary text-foreground text-xs font-black border border-border/40 hover:bg-secondary/80 transition-all"
            >
              Ver todo el Perú
            </button>
          </div>
        )}

        {/* Floating Controls Overlays */}
        {leafletLoaded && (
          <>
            {/* Top Right - Map Mode Selectors */}
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 pointer-events-auto">
              <div className="flex rounded-xl border border-border/30 bg-surface/70 shadow-soft p-0.5 backdrop-blur-md text-[10px] font-bold gap-0.5">
                {[
                  { id: "pins", label: "Pines", icon: <MapPin className="h-3.5 w-3.5" /> },
                  {
                    id: "districts",
                    label: "Calidez",
                    icon: <Landmark className="h-3.5 w-3.5" />,
                  },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMapMode(m.id as MapMode)}
                    className={`px-1.5 py-1 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
                      mapMode === m.id
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-secondary/40"
                    }`}
                  >
                    {m.icon}
                    <span className="hidden sm:inline sm:ml-1">{m.label}</span>
                  </button>
                ))}
              </div>

              {/* Huellas toggle */}
              <div className="flex self-end rounded-lg border border-border/30 bg-surface/70 shadow-soft p-0.5 backdrop-blur-md text-[7px] font-black uppercase tracking-wider gap-0.5">
                <button
                  onClick={() => onToggleHuellas?.()}
                  className={`px-1.5 py-0.5 rounded cursor-pointer flex items-center gap-1 ${showHuellas ? "bg-amber-600/20 text-amber-700 dark:text-amber-300" : "text-muted-foreground hover:bg-secondary/20"}`}
                >
                  <Footprints className="h-3 w-3" />
                  <span>Huellas</span>
                </button>
                {showHuellas && (
                  <button
                    onClick={() => setShowDormantHuellas((v) => !v)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer text-[7px] ${showDormantHuellas ? "text-stone-500" : "text-muted-foreground/40"}`}
                    title={showDormantHuellas ? "Ocultar dormidas" : "Mostrar dormidas"}
                  >
                    💤
                  </button>
                )}
              </div>

              {/* Theme toggle */}
              <div className="flex self-end rounded-lg border border-border/30 bg-surface/70 shadow-soft p-0.5 backdrop-blur-md text-[7px] font-black uppercase tracking-wider gap-0.5">
                <button
                  onClick={() => setMapStyle("dark")}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${mapStyle === "dark" ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary/20"}`}
                >
                  Oscuro
                </button>
                <button
                  onClick={() => setMapStyle("light")}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${mapStyle === "light" ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary/20"}`}
                >
                  Claro
                </button>
              </div>
            </div>

            {/* Bottom Left - Zoom Controls */}
            <div className="absolute bottom-4 left-4 z-[1001] pointer-events-auto">
              <MapControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetView={handleResetView}
                onCenterUser={handleCenterUser}
                userLocationLoading={userLocationLoading}
                hasUserLocation={!!userCoords}
              />
            </div>

            {/* Top Center - Breadcrumb Trail Overlay — hidden on mobile at root level */}
            {activeTerritoryPath.length > 0 ? (
              <div className="absolute top-3 left-3 z-10 pointer-events-auto flex items-center bg-surface/70 border border-border/30 rounded-2xl px-3 py-1.5 shadow-soft backdrop-blur-md text-[10px] font-semibold gap-1 select-none">
                <button
                  onClick={() => handleBreadcrumbClick(-1)}
                  className="hover:text-primary transition-colors text-muted-foreground"
                >
                  Perú
                </button>
                {activeTerritoryPath.map((node, index) => (
                  <div key={node.id} className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 text-stone-400" />
                    <button
                      onClick={() => handleBreadcrumbClick(index)}
                      className={`hover:text-primary transition-colors ${
                        index === activeTerritoryPath.length - 1
                          ? "text-foreground font-black"
                          : "text-muted-foreground"
                      }`}
                    >
                      {node.name}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="hidden lg:flex absolute top-3 left-3 z-10 pointer-events-auto items-center bg-surface/70 border border-border/30 rounded-2xl px-3 py-1.5 shadow-soft backdrop-blur-md text-[10px] font-semibold gap-1 select-none">
                <span className="text-muted-foreground">Perú</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* TERRITORIAL DISCOVERY PANEL — Sidebar Explorer */}
      <div className="w-full lg:w-[320px] bg-card border-t lg:border-t-0 lg:border-r border-border/40 shrink-0 p-4 lg:p-5 flex flex-col justify-between z-10 max-h-[35vh] lg:max-h-none overflow-y-auto no-scrollbar">
        <div className="space-y-3 lg:space-y-5">
          {/* Panel Header */}
          <div>
            <span className="text-[9px] uppercase font-black tracking-widest text-accent flex items-center gap-1">
              <Zap className="h-3 w-3 fill-current animate-pulse-ring" /> Explorador Cívico
            </span>
            <h2 className="font-display font-black text-lg lg:text-xl text-foreground tracking-tight mt-1 leading-none">
              Descubre tu territorio
            </h2>
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
              Explora las regiones donde jóvenes como tú están transformando comunidades.
            </p>
          </div>

          {/* Hierarchy Drill-Down Choices */}
          <div className="space-y-2">
            <div className="text-[9px] font-black uppercase text-stone-400 tracking-wider">
              {activeTerritoryPath.length === 0
                ? "Selecciona una Región Natural"
                : "Explorar en este tramo"}
            </div>

            {territoryOptions.length > 0 ? (
              <div className="grid grid-cols-1 gap-1.5">
                {territoryOptions.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectTerritoryNode(opt)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border/20 text-left text-xs font-bold text-foreground transition-all duration-200 cursor-pointer"
                  >
                    <span>{opt.name}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-stone-400" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[10px] italic text-muted-foreground p-3 bg-secondary/20 rounded-2xl text-center">
                Has alcanzado el nivel de distrito. Explora misiones marcadas en el mapa.
              </div>
            )}

            {activeTerritoryPath.length > 0 && (
              <button
                onClick={() => handleBreadcrumbClick(activeTerritoryPath.length - 2)}
                className="text-[10px] font-bold text-accent hover:underline flex items-center gap-1 cursor-pointer pt-1"
              >
                ← Subir de tramo
              </button>
            )}
          </div>

          {/* Contextual Territorial Summaries */}
          <div className="p-4 bg-secondary/30 rounded-2.5xl border border-border/20 space-y-3">
            <div className="text-[9px] font-black uppercase text-stone-400 tracking-wider leading-none">
              Resumen del tramo
            </div>
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className="p-2 bg-card rounded-xl border border-border/10">
                <div className="font-display font-black text-sm text-foreground">
                  {totalMissionsActive}
                </div>
                <div className="text-[7px] uppercase tracking-wider text-muted-foreground mt-0.5 leading-none">
                  iniciativas
                </div>
              </div>
              <div className="p-2 bg-card rounded-xl border border-border/10">
                <div className="font-display font-black text-sm text-foreground">
                  {totalExploradores}
                </div>
                <div className="text-[7px] uppercase tracking-wider text-muted-foreground mt-0.5 leading-none">
                  exploradores
                </div>
              </div>
            </div>
            <div className="text-[9px] text-muted-foreground font-semibold flex items-center justify-between pt-1 border-t border-border/20">
              <span>Causa dominante:</span>
              <span className="font-bold text-primary">{dominantCategory}</span>
            </div>
          </div>

          {/* Mission Preview Cards for Selected Territory */}
          {territoryMissions.length > 0 && (
            <div className="space-y-2">
              <div className="text-[9px] font-black uppercase text-stone-400 tracking-wider leading-none">
                Acciones activas aquí
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {territoryMissions
                  .filter(isMissionEntity)
                  .slice(0, 5)
                  .map((m) => {
                    const anchorLabel = m.temporalAnchor.label;
                    return (
                      <button
                        key={m.id}
                        onClick={() => onSelectMission(m.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-card border ${
                          selectedMissionId === m.id
                            ? "border-accent bg-accent/5"
                            : "border-border/20"
                        } hover:border-accent/40 text-left transition-all cursor-pointer`}
                      >
                        <span className="text-lg">{m.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-foreground truncate">
                            {m.title}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[7px] text-muted-foreground truncate">
                              {m.location?.district ?? m.region}
                            </span>
                            <span className="text-[7px] text-muted-foreground/40">·</span>
                            <span className="text-[7px] text-muted-foreground/60">
                              +{m.xp ?? 0} XP
                            </span>
                          </div>
                        </div>
                        <div className="text-[9px] font-semibold text-accent text-right leading-tight">
                          {anchorLabel}
                        </div>
                      </button>
                    );
                  })}
                {territoryMissions.filter(isMissionEntity).length > 5 && (
                  <div className="text-[8px] text-center text-muted-foreground italic">
                    +{territoryMissions.filter(isMissionEntity).length - 5} más misiones
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* GPS PRIVACY CONTROL — Trust & Proximity Mode */}
        <div className="pt-3 lg:pt-4 border-t border-border/40 mt-3 lg:mt-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase text-stone-400 tracking-wider">
              Ubicación GPS segura
            </span>

            <div className="flex items-center rounded-lg border border-border/20 bg-secondary/40 p-0.5 text-[8px] font-bold">
              <button
                onClick={() => setIsExploradorMode(true)}
                className={`px-2 py-0.5 rounded cursor-pointer ${isExploradorMode ? "bg-accent text-white" : "text-muted-foreground"}`}
              >
                Explorador
              </button>
              <button
                onClick={() => setIsExploradorMode(false)}
                className={`px-2 py-0.5 rounded cursor-pointer ${!isExploradorMode ? "bg-accent text-white" : "text-muted-foreground"}`}
              >
                Preciso
              </button>
            </div>
          </div>

          <div className="p-2.5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 rounded-xl flex gap-2 items-start text-[9px] text-emerald-800 dark:text-emerald-300 font-medium">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            <div>
              <span>KUSQA nunca comparte tu ubicación exacta.</span>
              {isExploradorMode && (
                <p className="text-[8px] text-muted-foreground/90 mt-0.5">
                  Ubicación aproximada en un radio de 2.5 km activa.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Styles for explorer proximity circles and heatmap */}
      <style>{`
        .explorador-proximity-circle {
          animation: pulse-circle 4s ease-in-out infinite alternate;
          filter: blur(2px);
        }
        @keyframes pulse-circle {
          0% { fill-opacity: 0.08; opacity: 0.45; }
          100% { fill-opacity: 0.16; opacity: 0.7; }
        }
        .glowing-heatmap-circle {
          filter: blur(8px);
          stroke: none !important;
          animation: heat-glow 4s ease-in-out infinite alternate;
        }
        @keyframes heat-glow {
          0% { fill-opacity: 0.15; transform: scale(0.95); }
          100% { fill-opacity: 0.32; transform: scale(1.05); }
        }
        .glowing-district-polygon {
          filter: drop-shadow(0 0 4px var(--color-accent));
          stroke-dasharray: 6, 10;
        }
        .custom-map-popup .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.85) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
          box-shadow: 0 10px 30px -12px rgba(46, 16, 101, 0.18) !important;
          border-radius: 1rem !important;
          padding: 0 !important;
        }
        .dark .custom-map-popup .leaflet-popup-content-wrapper {
          background: rgba(32, 27, 43, 0.85) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.4) !important;
        }
        .custom-map-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .custom-map-popup .leaflet-popup-tip {
          background: rgba(255, 255, 255, 0.85) !important;
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
        }
        .dark .custom-map-popup .leaflet-popup-tip {
          background: rgba(32, 27, 43, 0.85) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }
        .custom-mission-pin, .custom-cluster-icon, .custom-user-pin {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
}
