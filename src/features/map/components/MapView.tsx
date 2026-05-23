import { useEffect, useRef, useState } from "react";
import type { Mission, MapCoords } from "@/types";
import {
  PERU_DEFAULT_CENTER,
  MAP_DEFAULT_ZOOM,
  MAP_DETAIL_ZOOM,
  MAP_TILE_LAYER_URL,
  MAP_TILE_LIGHT_URL,
  MAP_ATTRIBUTION,
} from "../constants/mapConstants";
import { MapControls } from "./MapControls";
import { MapLegend } from "./MapLegend";
import { isValidLatLng } from "../utils/projection";
import { MapPin, Flame, Eye } from "lucide-react";

// Import Leaflet styles directly for compilation
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

type MapViewProps = {
  missions: Mission[];
  selectedMissionId: string | null;
  onSelectMission: (id: string) => void;
  userCoords: MapCoords | null;
  userLocationLoading: boolean;
  onRequestUserLocation: () => void;
  focalCoords?: MapCoords | null;
};

type MapMode = "pins" | "heatmap" | "districts";
type MapStyle = "dark" | "light";

// GeoJSON Polígonos de distritos de impacto cívico (Lima, Cusco, Iquitos, Trujillo, Puno)
const DISTRICT_POLYGONS = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Barranco & Miraflores (Costa)", region: "costa", score: 88 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-77.0450, -12.1050],
            [-77.0100, -12.1050],
            [-77.0100, -12.1650],
            [-77.0450, -12.1650],
            [-77.0450, -12.1050],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Valle Sagrado & Cusco (Sierra)", region: "sierra", score: 92 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-72.1000, -13.3200],
            [-71.8500, -13.3200],
            [-71.8500, -13.5600],
            [-72.1000, -13.5600],
            [-72.1000, -13.3200],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Iquitos Río Itaya (Selva)", region: "selva", score: 76 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-73.3100, -3.6900],
            [-73.2100, -3.6900],
            [-73.2100, -3.8100],
            [-73.3100, -3.8100],
            [-73.3100, -3.6900],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Trujillo Metropolitano (Costa)", region: "costa", score: 68 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-79.1300, -8.0400],
            [-78.9700, -8.0400],
            [-78.9700, -8.1600],
            [-79.1300, -8.1600],
            [-79.1300, -8.0400],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { name: "Puno Lago Titicaca (Sierra)", region: "sierra", score: 52 },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-70.1000, -15.7800],
            [-69.8600, -15.7800],
            [-69.8600, -15.9300],
            [-70.1000, -15.9300],
            [-70.1000, -15.7800],
          ],
        ],
      },
    },
  ],
};

export function MapView({
  missions,
  selectedMissionId,
  onSelectMission,
  userCoords,
  userLocationLoading,
  onRequestUserLocation,
  focalCoords = null,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const clusterGroupRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const heatmapLayerGroupRef = useRef<any>(null);
  const geojsonLayerRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, any>>(new Map());
  
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [LInstance, setLInstance] = useState<any>(null);
  
  // Custom states for interactive view options
  const [mapMode, setMapMode] = useState<MapMode>("pins");
  const [mapStyle, setMapStyle] = useState<MapStyle>("dark");

  // Dynamic import of Leaflet on client-side
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
        console.error("Error loading Leaflet modules dynamically:", err);
      }
    }

    loadLeaflet();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !LInstance || !containerRef.current || mapRef.current) return;

    const L = LInstance;

    // Create the map instance
    const map = L.map(containerRef.current, {
      zoomControl: false, 
      attributionControl: false,
      layers: [],
    }).setView([PERU_DEFAULT_CENTER.lat, PERU_DEFAULT_CENTER.lng], MAP_DEFAULT_ZOOM);

    // Initial Tile Layer
    const tileUrl = mapStyle === "dark" ? MAP_TILE_LAYER_URL : MAP_TILE_LIGHT_URL;
    const tileLayer = L.tileLayer(tileUrl, {
      attribution: MAP_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // Add custom styled attribution to the bottom right
    const attributionControl = L.control({ position: "bottomright" });
    attributionControl.onAdd = () => {
      const div = L.DomUtil.create("div", "glass rounded-lg px-2 py-1 text-[10px] text-muted-foreground");
      div.innerHTML = MAP_ATTRIBUTION;
      return div;
    };
    attributionControl.addTo(map);

    // Create Marker Cluster Group with customized styling
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (cluster: any) => {
        const childCount = cluster.getChildCount();
        return L.divIcon({
          html: `
            <div class="relative flex items-center justify-center w-11 h-11 rounded-full bg-primary text-white border-2 border-white/95 shadow-lift font-display font-bold text-xs transition-transform duration-300 hover:scale-105">
              <span class="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring"></span>
              <span class="relative z-10">${childCount}</span>
            </div>
          `,
          className: "custom-cluster-icon",
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });
      },
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    // Create Heatmap Layer Group
    const heatmapGroup = L.layerGroup();
    map.addLayer(heatmapGroup);
    heatmapLayerGroupRef.current = heatmapGroup;

    mapRef.current = map;

    // Trigger initial markers draw
    updateLayersAndStyles();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        clusterGroupRef.current = null;
        heatmapLayerGroupRef.current = null;
        geojsonLayerRef.current = null;
        userMarkerRef.current = null;
        markersMapRef.current.clear();
      }
    };
  }, [leafletLoaded, LInstance]);

  // Sync Layers & Style Toggles
  const updateLayersAndStyles = () => {
    if (!leafletLoaded || !LInstance || !mapRef.current) return;

    const L = LInstance;
    const map = mapRef.current;

    // 1. Update Tile Styles
    if (tileLayerRef.current) {
      const nextTileUrl = mapStyle === "dark" ? MAP_TILE_LAYER_URL : MAP_TILE_LIGHT_URL;
      tileLayerRef.current.setUrl(nextTileUrl);
    }

    // 2. Clear Existing Layers
    const clusterGroup = clusterGroupRef.current;
    const heatmapGroup = heatmapLayerGroupRef.current;

    clusterGroup.clearLayers();
    heatmapGroup.clearLayers();
    markersMapRef.current.clear();

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
      geojsonLayerRef.current = null;
    }

    // 3. Render Heatmap Density Mode
    if (mapMode === "heatmap") {
      missions.forEach((m) => {
        if (!m.coords || !isValidLatLng(m.coords.lat, m.coords.lng)) return;
        
        // Heat values scaled by XP and participants
        const radius = Math.max(15000, Math.min(65000, m.xp * 100 + m.participants * 800));
        let color = "#a855f7"; // Sierra
        if (m.region === "costa") color = "#0ea5e9";
        else if (m.region === "selva") color = "#10b981";

        const heatCircle = L.circle([m.coords.lat, m.coords.lng], {
          radius,
          className: "glowing-heatmap-circle",
          style: {
            fillColor: color,
            fillOpacity: 0.25,
            stroke: false,
          }
        });

        // Soft popup detail
        heatCircle.bindPopup(`
          <div class="p-2 text-center text-xs font-semibold text-foreground">
            🔥 Foco de Actividad: ${m.district}<br/>
            <span class="text-[10px] text-muted-foreground">${m.category}</span>
          </div>
        `, { closeButton: false });

        heatmapGroup.addLayer(heatCircle);
      });
    }

    // 4. Render Polygon District Boundaries Mode
    if (mapMode === "districts") {
      const geojsonLayer = L.geoJSON(DISTRICT_POLYGONS as any, {
        style: (feature: any) => {
          let color = "#a855f7"; // Sierra
          if (feature.properties.region === "costa") color = "#0ea5e9";
          else if (feature.properties.region === "selva") color = "#10b981";

          return {
            color,
            weight: 2,
            opacity: 0.85,
            fillColor: color,
            fillOpacity: 0.12,
            dashArray: "4, 6",
            className: "glowing-district-polygon",
          };
        },
        onEachFeature: (feature: any, layer: any) => {
          layer.bindPopup(`
            <div class="p-3 text-xs w-48 font-sans">
              <div class="font-bold text-foreground text-sm border-b border-border/20 pb-1.5 mb-1.5">${feature.properties.name}</div>
              <div class="flex flex-col gap-1 text-muted-foreground">
                <span class="flex justify-between">Score Cívico: <strong class="text-accent font-extrabold">${feature.properties.score}/100</strong></span>
                <span class="text-[10px] italic">Área activa de impacto cívico</span>
              </div>
            </div>
          `, { closeButton: false });

          layer.on({
            mouseover: (e: any) => {
              const ly = e.target;
              ly.setStyle({
                fillOpacity: 0.28,
                weight: 3.5,
              });
            },
            mouseout: (e: any) => {
              geojsonLayer.resetStyle(e.target);
            },
          });
        },
      }).addTo(map);

      geojsonLayerRef.current = geojsonLayer;
    }

    // 5. Render Mission Pins (Normal and District mode)
    if (mapMode === "pins" || mapMode === "districts") {
      missions.forEach((mission) => {
        if (!mission.coords || !isValidLatLng(mission.coords.lat, mission.coords.lng)) return;

        const isSelected = selectedMissionId === mission.id;
        
        let gradientClass = "bg-gradient-andes";
        let borderGlow = "ring-sierra/30";
        if (mission.region === "costa") {
          gradientClass = "bg-gradient-coast";
          borderGlow = "ring-coast/30";
        } else if (mission.region === "selva") {
          gradientClass = "bg-gradient-jungle";
          borderGlow = "ring-jungle/30";
        }

        const iconSize = isSelected ? 52 : 38;
        const htmlContent = `
          <div class="relative flex items-center justify-center pointer-events-auto" style="width: ${iconSize}px; height: ${iconSize}px;">
            <span class="absolute inset-0 rounded-full ${gradientClass} ${isSelected ? "scale-125 opacity-40 animate-pulse-ring" : "scale-100 opacity-20"}"></span>
            <div class="relative flex items-center justify-center rounded-full ${gradientClass} text-white shadow-glow border-2 border-white/90 transition-all duration-300 transform ${isSelected ? "scale-110 rotate-3 ring-4 " + borderGlow : "hover:scale-115"}" style="width: 80%; height: 80%;">
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

        const marker = L.marker([mission.coords.lat, mission.coords.lng], { icon: customIcon });

        const popupHtml = `
          <div class="p-3 text-xs w-60 font-sans">
            <div class="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
              <span class="font-bold text-foreground text-sm truncate">${mission.title}</span>
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                mission.region === "costa"
                  ? "bg-coast/10 text-coast"
                  : mission.region === "sierra"
                    ? "bg-sierra/10 text-sierra"
                    : "bg-jungle/10 text-jungle"
              } uppercase tracking-wider">${mission.region}</span>
            </div>
            <p class="text-muted-foreground line-clamp-2 leading-relaxed mb-2">${mission.description}</p>
            <div class="flex items-center justify-between mt-2 pt-2 border-t border-border/20 text-[10px]">
              <span class="font-semibold text-accent flex items-center gap-0.5">🔥 +${mission.xp} XP</span>
              <span class="text-muted-foreground">${mission.district}</span>
            </div>
          </div>
        `;

        marker.bindPopup(popupHtml, {
          closeButton: false,
          offset: L.point(0, -10),
          className: "custom-map-popup",
        });

        marker.on("click", () => {
          onSelectMission(mission.id);
        });

        clusterGroup.addLayer(marker);
        markersMapRef.current.set(mission.id, marker);
      });
    }

    // 6. Draw User Location Pin
    if (userCoords && isValidLatLng(userCoords.lat, userCoords.lng)) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userCoords.lat, userCoords.lng]);
      } else {
        const userIcon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center w-8 h-8">
              <span class="absolute inset-0 rounded-full bg-accent/30 animate-pulse-ring"></span>
              <span class="relative w-4 h-4 rounded-full bg-accent border-2 border-white shadow-soft"></span>
            </div>
          `,
          className: "custom-user-pin",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const userMarker = L.marker([userCoords.lat, userCoords.lng], { icon: userIcon });
        userMarker.bindPopup('<div class="p-1 font-semibold text-xs text-foreground">¡Estás aquí!</div>', {
          closeButton: false,
          offset: L.point(0, -5),
        });
        
        userMarker.addTo(map);
        userMarkerRef.current = userMarker;
      }
    } else if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
  };

  // Trigger update layers when dependencies change
  useEffect(() => {
    updateLayersAndStyles();
  }, [missions, userCoords, selectedMissionId, leafletLoaded, mapMode, mapStyle]);

  // Center map on selected mission changes
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || !selectedMissionId) return;

    const selectedMission = missions.find((m) => m.id === selectedMissionId);
    if (selectedMission && selectedMission.coords && isValidLatLng(selectedMission.coords.lat, selectedMission.coords.lng)) {
      mapRef.current.setView([selectedMission.coords.lat, selectedMission.coords.lng], MAP_DETAIL_ZOOM, {
        animate: true,
        duration: 1.0,
      });

      const marker = markersMapRef.current.get(selectedMissionId);
      if (marker) {
        setTimeout(() => {
          if (marker.isPopupOpen && !marker.isPopupOpen()) {
            marker.openPopup();
          }
        }, 300);
      }
    }
  }, [selectedMissionId, leafletLoaded, missions]);

  // Handle Controls Interactions
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
    }
  };

  const handleCenterUser = () => {
    if (userCoords && isValidLatLng(userCoords.lat, userCoords.lng) && mapRef.current) {
      mapRef.current.setView([userCoords.lat, userCoords.lng], MAP_DETAIL_ZOOM, {
        animate: true,
        duration: 1.2,
      });
      if (userMarkerRef.current) {
        userMarkerRef.current.openPopup();
      }
    } else {
      onRequestUserLocation();
    }
  };

  // Sync user location centering when it becomes available
  useEffect(() => {
    if (userCoords && isValidLatLng(userCoords.lat, userCoords.lng) && mapRef.current) {
      mapRef.current.setView([userCoords.lat, userCoords.lng], MAP_DETAIL_ZOOM, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [userCoords]);

  // Sync focal coordinates centering when they update (e.g. from places autocomplete)
  useEffect(() => {
    if (focalCoords && isValidLatLng(focalCoords.lat, focalCoords.lng) && mapRef.current) {
      mapRef.current.setView([focalCoords.lat, focalCoords.lng], MAP_DETAIL_ZOOM, {
        animate: true,
        duration: 1.2,
      });
    }
  }, [focalCoords]);

  return (
    <div className="relative w-full h-full min-h-[450px] md:min-h-[550px] lg:min-h-[640px] rounded-3xl overflow-hidden shadow-lift border border-border/40">
      {/* Map Container */}
      <div ref={containerRef} className="w-full h-full bg-secondary/20 z-0" />

      {/* Loading Skeleton */}
      {!leafletLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/90 z-20 backdrop-blur-sm">
          <div className="relative flex items-center justify-center w-16 h-16 mb-4">
            <span className="absolute inset-0 rounded-full border-4 border-primary/20 animate-pulse"></span>
            <span className="absolute inset-0 rounded-full border-4 border-t-accent animate-spin"></span>
          </div>
          <p className="font-display font-semibold text-foreground text-sm">Cargando mapa interactivo...</p>
          <p className="text-xs text-muted-foreground mt-1">Conectando con la red comunitaria KUSQA</p>
        </div>
      )}

      {/* CSS Overrides for Heatmap circles and styling */}
      <style>{`
        .custom-map-popup .leaflet-popup-content-wrapper {
          background: rgba(255, 255, 255, 0.85) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.4) !important;
          box-shadow: 0 10px 30px -12px rgba(46, 16, 101, 0.18) !important;
          border-radius: 1rem !important;
          padding: 0 !important;
          overflow: hidden;
        }
        .dark .custom-map-popup .leaflet-popup-content-wrapper {
          background: rgba(32, 27, 43, 0.85) !important;
          backdrop-filter: blur(12px) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          box-shadow: 0 10px 30px -12px rgba(0, 0, 0, 0.4) !important;
        }
        .custom-map-popup .leaflet-popup-content {
          margin: 0 !important;
          color: inherit !important;
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
        .leaflet-grab {
          cursor: grab !important;
        }
        .leaflet-dragging .leaflet-grab {
          cursor: grabbing !important;
        }
        .glowing-heatmap-circle {
          filter: blur(8px);
          stroke: none !important;
          fill-opacity: 0.28 !important;
          animation: heat-glow 4s ease-in-out infinite alternate;
        }
        .glowing-district-polygon {
          filter: drop-shadow(0 0 4px var(--color-accent));
          stroke-dasharray: 6, 8;
        }
        @keyframes heat-glow {
          0% { fill-opacity: 0.15; transform: scale(0.95); }
          100% { fill-opacity: 0.32; transform: scale(1.05); }
        }
      `}</style>

      {/* Floating Layout Overlays */}
      {leafletLoaded && (
        <>
          {/* Top Left - Legend */}
          <div className="absolute top-4 left-4 z-10 pointer-events-none hidden md:block">
            <MapLegend />
          </div>

          {/* Top Right - Map Mode and Style Selectors */}
          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 pointer-events-auto">
            {/* Mode toggles */}
            <div className="flex rounded-xl border border-border/40 bg-surface/85 shadow-soft p-1 backdrop-blur-md text-xs font-semibold gap-1">
              <button
                onClick={() => setMapMode("pins")}
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  mapMode === "pins" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary/40"
                }`}
                title="Pines de Misiones"
              >
                <MapPin className="h-3 w-3" />
                <span className="hidden sm:inline">Pines</span>
              </button>
              <button
                onClick={() => setMapMode("heatmap")}
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  mapMode === "heatmap" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary/40"
                }`}
                title="Mapa de Calor de Actividad"
              >
                <Flame className="h-3 w-3" />
                <span className="hidden sm:inline">Calor</span>
              </button>
              <button
                onClick={() => setMapMode("districts")}
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
                  mapMode === "districts" ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary/40"
                }`}
                title="Límites de Distritos Activos"
              >
                <Eye className="h-3 w-3" />
                <span className="hidden sm:inline">Distritos</span>
              </button>
            </div>

            {/* Map Theme Toggle */}
            <div className="flex self-end rounded-xl border border-border/40 bg-surface/85 shadow-soft p-1 backdrop-blur-md text-[10px] font-bold gap-1">
              <button
                onClick={() => setMapStyle("dark")}
                className={`px-2 py-1 rounded-md cursor-pointer ${
                  mapStyle === "dark" ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary/40"
                }`}
              >
                Oscuro
              </button>
              <button
                onClick={() => setMapStyle("light")}
                className={`px-2 py-1 rounded-md cursor-pointer ${
                  mapStyle === "light" ? "bg-primary text-white" : "text-muted-foreground hover:bg-secondary/40"
                }`}
              >
                Claro
              </button>
            </div>
          </div>

          {/* Bottom Left - Controls */}
          <div className="absolute bottom-6 left-4 z-10 pointer-events-auto">
            <MapControls
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetView={handleResetView}
              onCenterUser={handleCenterUser}
              userLocationLoading={userLocationLoading}
              hasUserLocation={!!userCoords}
            />
          </div>

          {/* Bottom Right - Active Badge */}
          <div className="absolute bottom-6 right-4 z-10 glass-strong rounded-2xl px-4 py-2.5 text-xs font-semibold text-foreground flex items-center gap-2 border border-border/40 shadow-soft backdrop-blur-md select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>{missions.length} misiones activas</span>
          </div>
        </>
      )}
    </div>
  );
}
