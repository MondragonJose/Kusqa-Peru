import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { MapPin, Search, Navigation, RefreshCw } from "lucide-react";
import { REGION_META } from "@/constants/gamification";
import { districtSlugify } from "@/utils/districtSlug";
import { useUserLocation } from "@/features/map/hooks/useUserLocation";
import { useMissionMapFilters } from "@/features/map/hooks/useMissionMapFilters";
import { useMapEntities } from "@/features/map/hooks/useMapEntities";
import { MapView } from "@/features/map/components/MapView";
import { isMissionEntity, buildMapEntitySummary, mapEntityToActionInitiative } from "@/features/map/projections/mapEntityProjection";
import { Drawer } from "vaul";
import type { MissionCategory } from "@/types";
import type { InitiativeMapEntity } from "@/domain/initiativeMapEntity";
import type { InitiativeAction } from "@/domain/initiativeActions";
import { InitiativeActionBar } from "@/features/actions/components/InitiativeActionBar";
import { shareInitiative } from "@/features/actions/shareInitiative";

import type { TerritorialActivityLevel } from "@/domain/territorialIntelligence";
import { classifyTerritorialVitality } from "@/domain/territorialIntelligence";
import { classifyDistrictActivity } from "@/domain/territoryAggregations";
import { loading } from "@/design";

export const Route = createFileRoute("/app/mapa")({
  component: MapPage,
});

type TabType = "misiones" | "actividad" | "analitica";

function MapPage() {
  const navigate = useNavigate();
  const { data: mapEntities = [], isLoading, isError } = useMapEntities();
  const {
    coords: userCoords,
    loading: userLocationLoading,
    requestUserLocation,
  } = useUserLocation();

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const allMapItems = mapEntities;

  const {
    filters,
    updateFilters,
    resetFilters,
    filteredMissions,
    availableRegions,
    availableCategories,
    availableDifficulties,
    availableDistricts,
  } = useMissionMapFilters(allMapItems, userCoords);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sidebar only renders missions — proposals stay as map markers only
  const sidebarItems = filteredMissions.filter(isMissionEntity);
  const activeEntity: InitiativeMapEntity | null =
    sidebarItems.find((m) => m.id === selectedId) ?? sidebarItems[0] ?? null;

  // District warmth: derive TerritorialActivityLevel via canonical pipeline
  const districtWarmth = useMemo<Record<string, TerritorialActivityLevel>>(() => {
    const grouped = new Map<string, InitiativeMapEntity[]>();
    for (const e of allMapItems) {
      const district = (e.location?.district ?? e.region).toLowerCase().trim();
      if (!district) continue;
      const list = grouped.get(district);
      if (list) list.push(e);
      else grouped.set(district, [e]);
    }
    const result: Record<string, TerritorialActivityLevel> = {};
    for (const [district, entities] of grouped) {
      const summary = buildMapEntitySummary(entities);
      const activityClass = classifyDistrictActivity(summary);
      result[district] = classifyTerritorialVitality(summary, activityClass);
    }
    return result;
  }, [allMapItems]);

  useEffect(() => {
    if (sidebarItems.length === 0) {
      setSelectedId(null);
      return;
    }
    const selectionValid = selectedId !== null && sidebarItems.some((m) => m.id === selectedId);
    if (!selectionValid) {
      setSelectedId(sidebarItems[0].id);
    }
  }, [sidebarItems, selectedId]);

  const handleSelectMission = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const handleRequestDetail = useCallback((id: string) => {
    setSelectedId(id);
    setIsDrawerOpen(true);
  }, []);

  // Conditional returns AFTER all hooks
  if (isLoading) {
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

  if (isError) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="rounded-3xl bg-destructive/10 border border-destructive/20 p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="font-display font-black text-lg text-foreground mb-2">
            Error al cargar misiones
          </h3>
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
      {/* Header section — compact on mobile, full on desktop */}
      <div className="flex items-center justify-between gap-2 lg:gap-4">
        <h1 className="font-display font-bold text-lg lg:text-3xl tracking-tight text-foreground">
          Atlas Territorial
        </h1>
        <div className="flex items-center gap-2">
          {userLocationLoading ? (
            <div className="glass rounded-full p-1.5 lg:px-3 lg:py-1 text-muted-foreground flex items-center gap-1.5">
              <RefreshCw className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-accent" />
              <span className="hidden lg:inline text-xs">Ubicando…</span>
            </div>
          ) : userCoords ? (
            <div className="glass border-accent/20 rounded-full p-1.5 lg:px-3 lg:py-1 text-accent flex items-center gap-1">
              <Navigation className="h-3.5 w-3.5 lg:h-4 lg:w-4 fill-accent" />
              <span className="hidden lg:inline text-xs font-semibold">Ubicación</span>
            </div>
          ) : (
            <button
              onClick={requestUserLocation}
              className="glass hover:bg-secondary/60 active:bg-secondary transition-colors rounded-full p-1.5 lg:px-3 lg:py-1 text-muted-foreground cursor-pointer shadow-sm"
            >
              <Navigation className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filters — compact row on mobile, full panel on desktop */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 lg:h-4 lg:w-4 text-muted-foreground" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => updateFilters({ searchQuery: e.target.value })}
            placeholder="Buscar distrito..."
            className="w-full bg-secondary/40 border border-border/30 rounded-full pl-9 pr-3 py-2 lg:py-2.5 text-xs lg:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
          />
        </div>

        {/* Category select */}
        <select
          value={filters.category}
          onChange={(e) => updateFilters({ category: e.target.value as MissionCategory | "todas" })}
          className="bg-secondary/40 border border-border/30 rounded-full px-3 py-2 lg:px-4 lg:py-2.5 text-xs lg:text-sm font-medium text-foreground focus:outline-none focus:border-accent/40 appearance-none"
        >
          <option value="todas">Todas</option>
          {availableCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* District buttons — desktop only */}
        <div className="hidden lg:flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => updateFilters({ district: "todas", region: "todas" })}
            className={`px-4 py-2 rounded-full text-xs font-bold border transition-smooth whitespace-nowrap cursor-pointer shrink-0 ${
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
              className={`px-3 py-2 rounded-full text-[10px] font-bold border transition-smooth whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 ${
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
        <div className="relative min-h-[calc(100dvh-180px)] lg:h-[640px] w-full order-1 lg:order-1">
          <MapView
            missions={filteredMissions}
            selectedMissionId={activeEntity?.id || null}
            onSelectMission={handleSelectMission}
            onRequestDetail={handleRequestDetail}
            userCoords={userCoords}
            userLocationLoading={userLocationLoading}
            onRequestUserLocation={requestUserLocation}
            districtWarmth={districtWarmth}
          />
        </div>

        {/* Sidebar — hidden on mobile, drawer handles detail view */}
        <div className="hidden lg:flex lg:flex-col gap-2 lg:gap-4 min-h-[300px] lg:min-h-[500px] max-h-[40dvh] lg:max-h-none order-2 lg:order-2">
          <div className="flex-1 flex flex-col h-full">
            {activeEntity ? (
              <div className="flex-1 rounded-3xl bg-card border border-border/50 overflow-hidden shadow-card flex flex-col justify-between">
                <div>
                  {/* Visual Banner Header */}
                  <div
                    className={`${REGION_META[activeEntity.region].gradient} p-4 lg:p-6 text-white relative`}
                  >
                    <div className="absolute inset-0 bg-mesh opacity-30" />
                    <div className="relative z-10">
                      <div className="text-4xl lg:text-5xl drop-shadow-md select-none">
                        {activeEntity.emoji}
                      </div>
                      <div className="mt-2 lg:mt-3 text-[9px] lg:text-[10px] uppercase tracking-widest font-bold opacity-90">
                        {REGION_META[activeEntity.region].name} · {activeEntity.category}
                      </div>
                      <h2 className="font-display font-bold text-sm lg:text-xl mt-1 leading-tight drop-shadow-sm truncate">
                        {activeEntity.title}
                      </h2>
                      <div className="text-[10px] lg:text-xs opacity-95 mt-1.5 lg:mt-2 flex items-center gap-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <Link
                          to="/app/distrito/$slug"
                          params={{ slug: districtSlugify(activeEntity.location?.district ?? activeEntity.region) }}
                          className="truncate hover:underline"
                        >
                          {activeEntity.location?.district ?? activeEntity.region}
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Details Body */}
                  <div className="p-3 lg:p-5 space-y-2 lg:space-y-4">
                    <p className="text-[10px] lg:text-xs text-muted-foreground leading-relaxed">
                      {activeEntity.summary}
                    </p>

                    {/* Grid stats */}
                    <div className="grid grid-cols-3 gap-1.5 lg:gap-2">
                      {[
                        { label: "Puntos XP", value: `+${activeEntity.xp ?? 0}` },
                        { label: "Cupos", value: activeEntity.spotsLeft ?? "—" },
                        { label: "Dificultad", value: activeEntity.difficulty ?? "—" },
                      ].map((s, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-secondary/50 border border-border/20 p-2 lg:p-2.5 text-center"
                        >
                          <div className="font-display font-extrabold text-foreground text-[10px] lg:text-xs">
                            {s.value}
                          </div>
                          <div className="text-[7px] lg:text-[8px] uppercase tracking-wider text-muted-foreground mt-0.5 font-bold">
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Impact description */}
                    <div className="rounded-xl bg-accent/5 border border-accent/15 p-2.5 lg:p-3 text-[10px] lg:text-xs">
                      <div className="text-accent font-bold uppercase tracking-wider text-[7px] lg:text-[8px] mb-0.5">
                        Impacto esperado
                      </div>
                      <div className="font-bold text-foreground text-[10px] lg:text-[11px]">
                        {activeEntity.impact ?? "—"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Action button (Desktop view) */}
                <div className="p-3 lg:p-4 border-t border-border/30 bg-secondary/15">
                  <InitiativeActionBar
                    initiative={mapEntityToActionInitiative(activeEntity)}
                    relationship="visitor"
                    variant="popup"
                    onAction={(action: InitiativeAction) => {
                      if (action === "support") {
                        navigate({ to: "/app/propuesta/$proposalId", params: { proposalId: activeEntity.sourceId } });
                      } else if (action === "join") {
                        navigate({ to: "/app/mision/$missionId", params: { missionId: activeEntity.id } });
                      } else if (action === "share") {
                        shareInitiative(activeEntity.title, window.location.href);
                      }
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 rounded-3xl border border-dashed border-border/60 p-8 text-center flex flex-col items-center justify-center bg-card">
                <div className="text-4xl mb-3">🗺️</div>
                <h3 className="font-display font-bold text-sm text-foreground">
                  Aún sin rutas activas aquí
                </h3>
                <p className="text-[11px] text-muted-foreground mt-2 max-w-[220px] leading-relaxed">
                  Explora otros distritos del Perú y sé el primero en activar este territorio.
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

      {/* MOBILE-FIRST: Vaul Bottom Sheet Drawer — territorial destination preview */}
      <Drawer.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen} snapPoints={["25%", "85vh"]}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[32px] max-h-[85vh] fixed bottom-0 left-0 right-0 z-50 outline-none border-t border-border/40 shadow-lift">
            <div className="p-0 bg-card rounded-t-[32px] flex-1 overflow-y-auto">
              <div className="mx-auto w-12 h-1.5 rounded-full bg-border/80 mb-3 shrink-0 mt-5" />

              {activeEntity && (
                <>
                  {/* — PREVIEW — compact territorial card + CTA visible at 25% snap */}
                  <div className="px-5 pb-4">
                    <div
                      className={`rounded-2xl ${REGION_META[activeEntity.region].gradient} p-4 text-white relative overflow-hidden shadow-card`}
                    >
                      <div className="absolute inset-0 bg-mesh opacity-25 pointer-events-none" />
                      <div className="relative z-10">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] uppercase tracking-widest font-bold opacity-85">
                              {REGION_META[activeEntity.region].name} · {activeEntity.category}
                            </div>
                            <h3 className="font-display font-bold text-base mt-0.5 leading-tight truncate">
                              {activeEntity.title}
                            </h3>
                            <p className="text-[10px] font-medium text-accent/90 mt-0.5">
                              {activeEntity.temporalAnchor.label}
                            </p>
                            <p className="text-[10px] opacity-80 mt-0.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />{" "}
                              <Link
                                to="/app/distrito/$slug"
                                params={{ slug: districtSlugify(activeEntity.location?.district ?? activeEntity.region) }}
                                className="truncate hover:underline"
                              >
                                {activeEntity.location?.district ?? activeEntity.region}
                              </Link>
                            </p>
                          </div>
                          <span className="text-3xl shrink-0 filter drop-shadow-md select-none">
                            {activeEntity.emoji}
                          </span>
                        </div>
                        <div className="mt-3">
                          <InitiativeActionBar
                            initiative={mapEntityToActionInitiative(activeEntity)}
                            relationship="visitor"
                            variant="popup"
                            onAction={(action: InitiativeAction) => {
                              if (action === "support") {
                                navigate({ to: "/app/propuesta/$proposalId", params: { proposalId: activeEntity.sourceId } });
                              } else if (action === "join") {
                                navigate({ to: "/app/mision/$missionId", params: { missionId: activeEntity.id } });
                              } else if (action === "share") {
                                shareInitiative(activeEntity.title, window.location.href);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* — DETAILS — expands on drag up */}
                  <div className="px-5 pb-6 space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed pt-4 border-t border-border/10">
                      {activeEntity.summary}
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { l: "Puntos XP", v: `+${activeEntity.xp ?? 0}` },
                        { l: "Cupos libres", v: activeEntity.spotsLeft ?? "—" },
                        { l: "Dificultad", v: activeEntity.difficulty ?? "—" },
                      ].map((s, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-secondary/50 border border-border/10 p-3 text-center"
                        >
                          <div className="font-bold text-foreground text-xs">{s.v}</div>
                          <div className="text-[8px] uppercase tracking-wider text-muted-foreground mt-0.5">
                            {s.l}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl bg-accent/5 border border-accent/15 p-4 text-sm">
                      <div className="text-accent font-bold uppercase tracking-wider text-[8px] mb-1">
                        Impacto comunitario
                      </div>
                      <div className="font-bold text-foreground">{activeEntity.impact ?? "—"}</div>
                    </div>

                    {activeEntity.organizerName && (
                      <div className="flex items-center gap-3 pt-3 border-t border-border/10 text-xs">
                        <span className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-base select-none">
                          {activeEntity.organizerAvatar ?? "🧑"}
                        </span>
                        <div>
                          <div className="text-[9px] text-muted-foreground">Organizador</div>
                          <div className="font-bold text-foreground">
                            {activeEntity.organizerName}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
