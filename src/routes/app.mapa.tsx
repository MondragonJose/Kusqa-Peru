import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Filter, Search, Sparkles, Navigation, RefreshCw, Activity, Flame, Award } from "lucide-react";
import { MISSIONS, REGION_META } from "@/data/kusqa";
import { useUserLocation } from "@/features/map/hooks/useUserLocation";
import { useMissionMapFilters } from "@/features/map/hooks/useMissionMapFilters";
import { MapView } from "@/features/map/components/MapView";
import { CivicActivityFeed } from "@/features/map/components/CivicActivityFeed";
import { CivicAnalytics } from "@/features/map/components/CivicAnalytics";
import { getPlaceSuggestions, type PlaceSuggestion } from "@/services/googleMaps";
import { Drawer } from "vaul";
import type { MapCoords, MissionCategory, MissionDifficulty } from "@/types";

export const Route = createFileRoute("/app/mapa")({
  component: MapPage,
});

type TabType = "misiones" | "actividad" | "analitica";

function MapPage() {
  const { coords: userCoords, loading: userLocationLoading, requestUserLocation } = useUserLocation();
  const { filters, updateFilters, resetFilters, filteredMissions } = useMissionMapFilters(MISSIONS, userCoords);
  const [selectedId, setSelectedId] = useState<string | null>(MISSIONS[0]?.id || null);
  
  // Tab selector state
  const [activeTab, setActiveTab] = useState<TabType>("misiones");
  
  // Geocoding Autocomplete states
  const [autocompleteInput, setAutocompleteInput] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [focalCoords, setFocalCoords] = useState<MapCoords | null>(null);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);

  // Mobile Bottom Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sync active mission selection
  const activeMission = filteredMissions.find((m) => m.id === selectedId) || filteredMissions[0] || null;

  // Handle selected mission click (opens drawer on mobile)
  const handleSelectMission = (id: string) => {
    setSelectedId(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsDrawerOpen(true);
    }
  };

  // Fetch Place Autocomplete suggestions when input changes
  useEffect(() => {
    let isMounted = true;
    if (autocompleteInput.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      const results = await getPlaceSuggestions(autocompleteInput);
      if (isMounted) {
        setSuggestions(results);
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounce);
    };
  }, [autocompleteInput]);

  // Click outside listener for Autocomplete dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteContainerRef.current && !autocompleteContainerRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Request user location automatically on mount
  useEffect(() => {
    requestUserLocation();
  }, [requestUserLocation]);

  const handleSelectPlace = (place: PlaceSuggestion) => {
    setFocalCoords(place.coords);
    updateFilters({ 
      searchQuery: place.district,
      region: place.region
    });
    setAutocompleteInput(place.description);
    setSuggestions([]);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-4 md:px-6 py-2">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl tracking-tight text-foreground flex items-center gap-2">
            Mapa de Inteligencia Cívica <Sparkles className="h-6 w-6 text-accent animate-pulse" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visualiza las misiones juveniles, el calor de la participación y el impacto en tiempo real.
          </p>
        </div>

        {/* User GPS indicator */}
        <div className="flex items-center gap-2">
          {userLocationLoading ? (
            <div className="glass rounded-full px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-2 animate-pulse">
              <RefreshCw className="h-3 w-3 animate-spin text-accent" />
              <span>Conectando con GPS...</span>
            </div>
          ) : userCoords ? (
            <div className="glass border-accent/20 rounded-full px-3 py-1.5 text-xs text-accent font-semibold flex items-center gap-1.5">
              <Navigation className="h-3 w-3 fill-accent animate-pulse" />
              <span>Ubicación GPS Activa</span>
            </div>
          ) : (
            <button
              onClick={requestUserLocation}
              className="glass hover:bg-secondary/60 active:bg-secondary transition-colors rounded-full px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Navigation className="h-3 w-3" />
              <span>Activar GPS</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Bar & Places Autocomplete */}
      <div className="glass rounded-3xl p-4 md:p-5 border border-border/40 shadow-soft space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Places Autocomplete Search */}
          <div ref={autocompleteContainerRef} className="relative md:col-span-6 z-30">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={autocompleteInput}
              onChange={(e) => {
                setAutocompleteInput(e.target.value);
                // Also update textual search filters
                updateFilters({ searchQuery: e.target.value });
              }}
              placeholder="Buscar distritos de Perú (Ej: Barranco, Chinchero...)"
              className="w-full bg-secondary/40 border border-border/30 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
            />
            {/* Autocomplete Dropdown list */}
            {suggestions.length > 0 && (
              <div className="absolute top-[108%] left-0 right-0 bg-card/95 border border-border/45 rounded-2xl shadow-lift backdrop-blur-md overflow-hidden z-50">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectPlace(s)}
                    className="w-full text-left px-4 py-3 text-xs text-foreground hover:bg-secondary/60 active:bg-secondary/80 border-b border-border/10 last:border-b-0 flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold truncate">{s.description}</div>
                      <div className="text-[9px] text-muted-foreground capitalize">{s.region}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Region selector Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0 md:col-span-6 justify-start md:justify-end no-scrollbar">
            <button
              onClick={() => {
                updateFilters({ region: "todas" });
                setAutocompleteInput("");
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold border transition-smooth whitespace-nowrap cursor-pointer ${
                filters.region === "todas"
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-secondary/45 border-border/30 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              Todo el Perú
            </button>
            {(["costa", "sierra", "selva"] as const).map((r) => (
              <button
                key={r}
                onClick={() => updateFilters({ region: r })}
                className={`px-4 py-2 rounded-full text-xs font-bold border transition-smooth whitespace-nowrap cursor-pointer ${
                  filters.region === r
                    ? `${REGION_META[r].chipBg} border-current shadow-sm font-extrabold`
                    : "bg-secondary/45 border-border/30 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
                }`}
              >
                {REGION_META[r].name}
              </button>
            ))}
          </div>
        </div>

        {/* Dropdowns row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/20 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
            <Filter className="h-3.5 w-3.5" />
            <span>Filtros avanzados:</span>
          </div>

          {/* Category Dropdown */}
          <select
            value={filters.category}
            onChange={(e) => updateFilters({ category: e.target.value as MissionCategory | "todas" })}
            className="bg-secondary/30 border border-border/30 rounded-xl px-3 py-1.5 font-medium text-foreground focus:outline-none focus:border-accent/40"
          >
            <option value="todas">Todas las causas</option>
            <option value="Medio ambiente">Medio ambiente</option>
            <option value="Educación">Educación</option>
            <option value="Arte & cultura">Arte & cultura</option>
            <option value="Comunidad">Comunidad</option>
            <option value="Salud">Salud</option>
            <option value="Tecnología">Tecnología</option>
          </select>

          {/* Difficulty Dropdown */}
          <select
            value={filters.difficulty}
            onChange={(e) => updateFilters({ difficulty: e.target.value as MissionDifficulty | "todas" })}
            className="bg-secondary/30 border border-border/30 rounded-xl px-3 py-1.5 font-medium text-foreground focus:outline-none focus:border-accent/40"
          >
            <option value="todas">Cualquier dificultad</option>
            <option value="Suave">Suave</option>
            <option value="Andina">Andina</option>
            <option value="Cumbre">Cumbre</option>
          </select>

          {/* Proximity Slider (if GPS is active) */}
          {userCoords && (
            <div className="flex items-center gap-2 bg-secondary/30 border border-border/30 rounded-xl px-3 py-1">
              <span className="text-muted-foreground font-medium">Cerca de mí:</span>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={filters.proximityRadiusKm || 100}
                onChange={(e) => updateFilters({ proximityRadiusKm: parseInt(e.target.value) })}
                className="w-16 accent-accent"
              />
              <span className="font-semibold text-foreground">{filters.proximityRadiusKm ? `${filters.proximityRadiusKm} km` : "Todo"}</span>
              {filters.proximityRadiusKm !== null && (
                <button
                  onClick={() => updateFilters({ proximityRadiusKm: null })}
                  className="text-[10px] text-accent hover:underline font-bold ml-1"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* Reset Filters button */}
          {(filters.category !== "todas" || filters.difficulty !== "todas" || filters.region !== "todas" || filters.searchQuery !== "" || filters.proximityRadiusKm !== null) && (
            <button
              onClick={() => {
                resetFilters();
                setAutocompleteInput("");
                setFocalCoords(null);
              }}
              className="text-xs font-bold text-accent hover:underline cursor-pointer ml-auto"
            >
              Restablecer todo
            </button>
          )}
        </div>
      </div>

      {/* Main Map & Interactive Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-5 items-stretch">
        {/* Dynamic Leaflet Map with focal coords support */}
        <div className="h-[450px] md:h-[550px] lg:h-[640px] w-full">
          <MapView
            missions={filteredMissions}
            selectedMissionId={activeMission?.id || null}
            onSelectMission={handleSelectMission}
            userCoords={userCoords}
            userLocationLoading={userLocationLoading}
            onRequestUserLocation={requestUserLocation}
            focalCoords={focalCoords}
          />
        </div>

        {/* Sidebar tabs */}
        <div className="flex flex-col gap-4 min-h-[500px]">
          {/* Tab Selector Buttons */}
          <div className="flex bg-secondary/40 border border-border/20 rounded-2xl p-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab("misiones")}
              className={`flex-1 py-2.5 rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                activeTab === "misiones" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapPin className="h-3.5 w-3.5 text-accent" />
              Misión
            </button>
            <button
              onClick={() => setActiveTab("actividad")}
              className={`flex-1 py-2.5 rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                activeTab === "actividad" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-accent" />
              Actividad
            </button>
            <button
              onClick={() => setActiveTab("analitica")}
              className={`flex-1 py-2.5 rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                activeTab === "analitica" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Award className="h-3.5 w-3.5 text-accent" />
              Impacto
            </button>
          </div>

          {/* Tab Content Display */}
          <div className="flex-1 flex flex-col h-full">
            {activeTab === "misiones" && (
              <div className="flex-1 flex flex-col">
                {activeMission ? (
                  <div className="flex-1 rounded-3xl bg-card border border-border/50 overflow-hidden shadow-card flex flex-col justify-between">
                    <div>
                      {/* Visual Banner Header */}
                      <div className={`${REGION_META[activeMission.region].gradient} p-6 text-white relative`}>
                        <div className="absolute inset-0 bg-mesh opacity-30" />
                        <div className="relative z-10">
                          <div className="text-5xl drop-shadow-md select-none">{activeMission.emoji}</div>
                          <div className="mt-3 text-[10px] uppercase tracking-widest font-bold opacity-90">
                            {REGION_META[activeMission.region].name} · {activeMission.category}
                          </div>
                          <h2 className="font-display font-bold text-xl mt-1 leading-tight drop-shadow-sm truncate">
                            {activeMission.title}
                          </h2>
                          <div className="text-xs opacity-95 mt-2 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>{activeMission.district}</span>
                          </div>
                        </div>
                      </div>

                      {/* Details Body */}
                      <div className="p-5 space-y-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {activeMission.description}
                        </p>
                        
                        {/* Grid stats */}
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Experiencia", value: `+${activeMission.xp} XP` },
                            { label: "Cupos", value: `${activeMission.spotsLeft}` },
                            { label: "Dificultad", value: activeMission.difficulty },
                          ].map((s, idx) => (
                            <div key={idx} className="rounded-xl bg-secondary/50 border border-border/20 p-2.5 text-center">
                              <div className="font-display font-extrabold text-foreground text-xs">{s.value}</div>
                              <div className="text-[8px] uppercase tracking-wider text-muted-foreground mt-0.5 font-bold">{s.label}</div>
                            </div>
                          ))}
                        </div>

                        {/* Impact description */}
                        <div className="rounded-xl bg-accent/5 border border-accent/15 p-3 text-xs">
                          <div className="text-accent font-bold uppercase tracking-wider text-[8px] mb-0.5">Impacto esperado</div>
                          <div className="font-bold text-foreground text-[11px]">{activeMission.impact}</div>
                        </div>
                      </div>
                    </div>

                    {/* CTA Action button (Desktop view) */}
                    <div className="p-4 border-t border-border/30 bg-secondary/15 flex gap-2">
                      <Link
                        to="/app/mision/$missionId"
                        params={{ missionId: activeMission.id }}
                        className="w-full inline-flex justify-center items-center rounded-xl bg-gradient-sunrise text-white px-4 py-3 font-semibold shadow-soft hover:scale-[1.01] hover:shadow-glow transition-all active:scale-[0.98] duration-200 cursor-pointer text-xs"
                      >
                        Unirme a la misión
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 rounded-3xl border border-dashed border-border/60 p-8 text-center flex flex-col items-center justify-center bg-secondary/10">
                    <div className="text-xl mb-2 select-none">🔍</div>
                    <h3 className="font-display font-bold text-xs text-foreground">Sin misiones</h3>
                    <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px]">
                      Prueba a buscar otro distrito peruano.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "actividad" && <CivicActivityFeed />}

            {activeTab === "analitica" && (
              <CivicAnalytics
                missions={filteredMissions}
                userCoords={userCoords}
                onSelectMission={(id) => handleSelectMission(id)}
              />
            )}
          </div>
        </div>
      </div>

      {/* MOBILE-FIRST: Vaul Bottom Sheet Drawer */}
      <Drawer.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[32px] max-h-[85vh] fixed bottom-0 left-0 right-0 z-50 outline-none border-t border-border/40 shadow-lift">
            <div className="p-5 bg-card rounded-t-[32px] flex-1 overflow-y-auto">
              <div className="mx-auto w-12 h-1.5 rounded-full bg-border/80 mb-6 shrink-0" />
              
              {activeMission && (
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <span className="text-5xl p-3 bg-secondary rounded-2xl leading-none select-none">{activeMission.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-bold text-accent tracking-wider">
                        {activeMission.category} · {activeMission.difficulty}
                      </div>
                      <h3 className="font-display font-bold text-xl text-foreground mt-1">{activeMission.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" /> {activeMission.district}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/10">
                    {activeMission.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { l: "Recompensa", v: `+${activeMission.xp} XP` },
                      { l: "Cupos libres", v: activeMission.spotsLeft },
                      { l: "Nivel exigido", v: activeMission.difficulty },
                    ].map((s, idx) => (
                      <div key={idx} className="rounded-xl bg-secondary/50 border border-border/10 p-3 text-center">
                        <div className="font-bold text-foreground text-xs">{s.v}</div>
                        <div className="text-[8px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.l}</div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl bg-accent/5 border border-accent/15 p-4 text-xs">
                    <div className="text-accent font-bold uppercase tracking-wider text-[8px] mb-1">Impacto comunitario</div>
                    <div className="font-bold text-foreground">{activeMission.impact}</div>
                  </div>

                  {activeMission.organizer && (
                    <div className="flex items-center gap-3 pt-3 border-t border-border/10 text-xs">
                      <span className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-base select-none">
                        {activeMission.organizer.avatar}
                      </span>
                      <div>
                        <div className="text-[9px] text-muted-foreground">Organizador</div>
                        <div className="font-bold text-foreground">{activeMission.organizer.name}</div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex gap-2">
                    <Link
                      to="/app/mision/$missionId"
                      params={{ missionId: activeMission.id }}
                      className="w-full inline-flex justify-center items-center rounded-xl bg-gradient-sunrise text-white py-3.5 font-semibold text-xs shadow-glow hover:opacity-95 transition-opacity"
                    >
                      Unirme a la misión
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
