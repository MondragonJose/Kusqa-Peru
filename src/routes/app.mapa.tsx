import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { MapPin, Search, Sparkles, Navigation, RefreshCw } from "lucide-react";
import { REGION_META } from "@/constants/gamification";
import { useUserLocation } from "@/features/map/hooks/useUserLocation";
import { useMissionMapFilters } from "@/features/map/hooks/useMissionMapFilters";
import { MapView } from "@/features/map/components/MapView";
import { useMissions } from "@/hooks/useMissions";
import { useAllProposals } from "@/features/proposals";
import { Drawer } from "vaul";
import type { MapCoords, Mission, MissionCategory, MissionDifficulty } from "@/types";
import type { CivicEntity } from "@/types/entity";
import { proposalToEntity, missionToEntity } from "@/services/entityAdapter";
import { iconSize, loading } from "@/design";

export const Route = createFileRoute("/app/mapa")({
  component: MapPage,
});

type TabType = "misiones" | "actividad" | "analitica";

function MapPage() {
  const { data: missions = [], isLoading: missionsLoading, isError: missionsError } = useMissions();
  const { data: proposals = [] } = useAllProposals();
  const { coords: userCoords, loading: userLocationLoading, requestUserLocation } = useUserLocation();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const allMapItems = useMemo<CivicEntity[]>(() => {
    const missionEntities = missions.map(missionToEntity);
    const proposalEntities = proposals.flatMap((p) => {
      const entity = proposalToEntity(p);
      return entity ? [entity] : [];
    });
    const merged = [...missionEntities, ...proposalEntities];
    if (import.meta.env.DEV) {
      console.log("[KUSQA ENTITY TRACE] Map merge:", missionEntities.length, "missions +", proposalEntities.length, "proposals =", merged.length, "total entities");
    }
    return merged;
  }, [missions, proposals]);

  const { filters, updateFilters, resetFilters, filteredMissions, availableRegions, availableCategories, availableDifficulties, availableDistricts } = useMissionMapFilters(allMapItems, userCoords);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const activeMission = filteredMissions.find((m) => m.id === selectedId) || filteredMissions[0] || null;

  useEffect(() => {
    if (filteredMissions.length === 0) {
      setSelectedId(null);
      return;
    }
    const selectionValid =
      selectedId !== null && filteredMissions.some((m) => m.id === selectedId);
    if (!selectionValid) {
      setSelectedId(filteredMissions[0].id);
    }
  }, [filteredMissions, selectedId]);

  const handleSelectMission = useCallback((id: string) => {
    setSelectedId(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsDrawerOpen(true);
    }
  }, []);

  // Conditional returns AFTER all hooks
  if (missionsLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className={`h-12 w-64 ${loading.skeleton} rounded-2xl`} />
          <div className={`h-16 w-full ${loading.skeleton} rounded-2xl`} />
          <div className={`h-[500px] w-full ${loading.skeletonBordered} rounded-3xl`} />
        </div>
      </div>
    );
  }

  if (missionsError) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="rounded-3xl bg-destructive/10 border border-destructive/20 p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="font-display font-black text-lg text-foreground mb-2">Error al cargar misiones</h3>
          <p className="text-sm text-muted-foreground mb-4">
            No pudimos cargar las misiones del atlas territorial. Por favor intenta nuevamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-black hover:scale-[1.02] transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Request user location automatically on mount
  useEffect(() => {
    requestUserLocation();
  }, [requestUserLocation]);

  return (
    <div className="space-y-3 lg:space-y-5 max-w-7xl mx-auto px-3 md:px-6 py-1 lg:py-2">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 lg:gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight text-foreground flex items-center gap-2">
            Atlas Territorial <Sparkles className="h-5 md:h-6 w-5 md:w-6 text-accent" />
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5 lg:mt-1">
            Explora misiones activas en todo el Perú.
          </p>
          {missionsLoading && (
            <p className="text-[10px] lg:text-xs text-muted-foreground mt-0.5 lg:mt-1 font-medium">Cargando…</p>
          )}
          {missionsError && (
            <p className="text-[10px] lg:text-xs text-destructive mt-0.5 lg:mt-1 font-medium">Error</p>
          )}
        </div>

        {/* User GPS indicator */}
        <div className="flex items-center gap-2">
          {userLocationLoading ? (
            <div className="glass rounded-full px-2.5 lg:px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs text-muted-foreground flex items-center gap-1.5">
              <RefreshCw className={`${iconSize.sm} text-accent`} />
              <span className="hidden sm:inline">Ubicando…</span>
            </div>
          ) : userCoords ? (
            <div className="glass border-accent/20 rounded-full px-2.5 lg:px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs text-accent font-semibold flex items-center gap-1">
              <Navigation className={`${iconSize.sm} fill-accent`} />
              <span className="hidden sm:inline">Ubicación</span>
            </div>
          ) : (
            <button
              onClick={requestUserLocation}
              className="glass hover:bg-secondary/60 active:bg-secondary transition-colors rounded-full px-2.5 lg:px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs text-muted-foreground flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Navigation className={iconSize.sm} />
              <span className="hidden sm:inline">Usar ubicación</span>
            </button>
          )}
        </div>
      </div>

      {/* P0 FIX: Filtros simplificados - solo search + categoría. Eliminar GPS, autocomplete, difficulty */}
      <div className="glass rounded-3xl p-3 lg:p-5 border border-border/40 shadow-soft space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Search simple por distrito */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => updateFilters({ searchQuery: e.target.value })}
              placeholder="Buscar distrito..."
              className="w-full bg-secondary/40 border border-border/30 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          {/* Filtro por categoría */}
          <select
            value={filters.category}
            onChange={(e) => updateFilters({ category: e.target.value as MissionCategory | "todas" })}
            className="bg-secondary/40 border border-border/30 rounded-2xl px-4 py-2.5 font-medium text-foreground focus:outline-none focus:border-accent/40 text-sm"
          >
            <option value="todas">Todas las causas</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Quick district buttons */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => {
              updateFilters({ district: "todas", region: "todas" });
            }}
            className={`px-4 py-2 rounded-full text-xs font-bold border transition-smooth whitespace-nowrap cursor-pointer ${
              filters.district === "todas"
                ? "bg-foreground text-background border-foreground shadow-sm"
                : "bg-secondary/45 border-border/30 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
            }`}
          >
            Todo el Perú
          </button>
          {availableDistricts.slice(0, 5).map(({ district, count }) => (
            <button
              key={district}
              onClick={() => updateFilters({ district })}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-smooth whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                filters.district === district
                  ? "bg-foreground text-background border-foreground shadow-sm"
                  : "bg-secondary/45 border-border/30 text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              <span>{district}</span>
              <span className="text-[8px] opacity-60">({count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Map & Interactive Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_390px] gap-3 lg:gap-5 items-stretch">
        {/* Dynamic Leaflet Map with focal coords support */}
        <div className="h-[75dvh] md:h-[70dvh] lg:h-[640px] w-full min-h-[450px] order-1 lg:order-1">
          <MapView
            missions={filteredMissions}
            selectedMissionId={activeMission?.id || null}
            onSelectMission={handleSelectMission}
            userCoords={userCoords}
            userLocationLoading={userLocationLoading}
            onRequestUserLocation={requestUserLocation}
          />
        </div>

        {/* P1 FIX: Eliminar tabs - sidebar siempre muestra misión seleccionada */}
        <div className="flex flex-col gap-2 lg:gap-4 min-h-[300px] lg:min-h-[500px] max-h-[40dvh] lg:max-h-none order-2 lg:order-2">
          <div className="flex-1 flex flex-col h-full">
            {activeMission ? (
              <div className="flex-1 rounded-3xl bg-card border border-border/50 overflow-hidden shadow-card flex flex-col justify-between">
                <div>
                  {/* Visual Banner Header */}
                  <div className={`${REGION_META[activeMission.region].gradient} p-4 lg:p-6 text-white relative`}>
                    <div className="absolute inset-0 bg-mesh opacity-30" />
                    <div className="relative z-10">
                      <div className="text-4xl lg:text-5xl drop-shadow-md select-none">{activeMission.emoji}</div>
                      <div className="mt-2 lg:mt-3 text-[9px] lg:text-[10px] uppercase tracking-widest font-bold opacity-90">
                        {REGION_META[activeMission.region].name} · {activeMission.category}
                      </div>
                      <h2 className="font-display font-bold text-sm lg:text-xl mt-1 leading-tight drop-shadow-sm truncate">
                        {activeMission.title}
                      </h2>
                      <div className="text-[10px] lg:text-xs opacity-95 mt-1.5 lg:mt-2 flex items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{activeMission.district}</span>
                      </div>
                    </div>
                  </div>

                  {/* Details Body */}
                  <div className="p-3 lg:p-5 space-y-2 lg:space-y-4">
                    <p className="text-[10px] lg:text-xs text-muted-foreground leading-relaxed">
                      {activeMission.description}
                    </p>

                    {/* Grid stats */}
                    <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
                      {[
                        { label: "Puntos XP", value: `+${activeMission.xp}` },
                        { label: "Cupos", value: `${activeMission.spotsLeft}` },
                        { label: "Dificultad", value: activeMission.difficulty },
                      ].map((s, idx) => (
                        <div key={idx} className="rounded-xl bg-secondary/50 border border-border/20 p-2 lg:p-2.5 text-center">
                          <div className="font-display font-extrabold text-foreground text-[10px] lg:text-xs">{s.value}</div>
                          <div className="text-[7px] lg:text-[8px] uppercase tracking-wider text-muted-foreground mt-0.5 font-bold">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Impact description */}
                    <div className="rounded-xl bg-accent/5 border border-accent/15 p-2.5 lg:p-3 text-[10px] lg:text-xs">
                      <div className="text-accent font-bold uppercase tracking-wider text-[7px] lg:text-[8px] mb-0.5">Impacto esperado</div>
                      <div className="font-bold text-foreground text-[10px] lg:text-[11px]">{activeMission.impact}</div>
                    </div>
                  </div>
                </div>

                {/* CTA Action button (Desktop view) */}
                <div className="p-3 lg:p-4 border-t border-border/30 bg-secondary/15 flex gap-2">
                  <Link
                    to="/app/mision/$missionId"
                    params={{ missionId: activeMission.id }}
                    className="w-full inline-flex justify-center items-center rounded-xl bg-gradient-sunrise text-white px-3 lg:px-4 py-2.5 lg:py-3 font-semibold shadow-glow hover:scale-[1.02] transition-all active:scale-[0.98] duration-200 cursor-pointer text-xs lg:text-sm"
                  >
                    Unirme
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex-1 rounded-3xl border border-dashed border-border/60 p-8 text-center flex flex-col items-center justify-center bg-card">
                <div className="text-4xl mb-3">🗺️</div>
                <h3 className="font-display font-bold text-sm text-foreground">Sin misiones en este distrito</h3>
                <p className="text-[11px] text-muted-foreground mt-2 max-w-[220px] leading-relaxed">
                  Explora otros distritos del Perú para encontrar misiones activas.
                </p>
                <button
                  onClick={() => updateFilters({ district: "todas", region: "todas" })}
                  className="mt-4 text-xs font-bold text-accent hover:underline"
                >
                  Ver todo el Perú
                </button>
              </div>
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
                      { l: "Puntos XP", v: `+${activeMission.xp}` },
                      { l: "Cupos libres", v: activeMission.spotsLeft },
                      { l: "Dificultad", v: activeMission.difficulty },
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
                      className="w-full inline-flex justify-center items-center rounded-xl bg-gradient-sunrise text-white py-3.5 font-semibold text-xs shadow-glow hover:scale-[1.02] transition-opacity"
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
