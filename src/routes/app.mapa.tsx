import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { MapPin, Search, Navigation, RefreshCw } from "lucide-react";
import { REGION_META } from "@/constants/gamification";
import { districtSlugify } from "@/utils/districtSlug";
import { useUserLocation } from "@/features/map/hooks/useUserLocation";
import { useMissionMapFilters } from "@/features/map/hooks/useMissionMapFilters";
import { useMapEntities } from "@/features/map/hooks/useMapEntities";
import { MapView } from "@/features/map/components/MapView";
import { MapSidebar } from "@/features/map/components/MapSidebar";
import {
  buildMapEntitySummary,
  mapEntityToActionInitiative,
} from "@/features/map/projections/mapEntityProjection";
import { Drawer } from "vaul";
import type { MissionCategory } from "@/types";
import type { InitiativeMapEntity } from "@/domain/initiativeMapEntity";
import type { InitiativeAction } from "@/domain/initiativeActions";
import { getInitiativeDetailRoute } from "@/domain/initiativeRoute";
import { InitiativeActionBar } from "@/features/actions/components/InitiativeActionBar";
import { MapPeekCard } from "@/features/map/components/MapPeekCard";
import { toast } from "sonner";
import { shareInitiative } from "@/features/actions/shareInitiative";
import { useSupportProposal } from "@/features/proposals";
import { useJoinInitiativeAction } from "@/features/actions/useJoinInitiativeAction";
import { useCurrentUser } from "@/features/auth";
import { useIsMobile } from "@/hooks/use-mobile";

import type { TerritorialActivityLevel } from "@/domain/territorialIntelligence";
import { classifyTerritorialVitality } from "@/domain/territorialIntelligence";
import { classifyDistrictActivity } from "@/domain/territoryAggregations";
import { loading } from "@/design";

export const Route = createFileRoute("/app/mapa")({
  component: MapPage,
});

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

  const { filters, updateFilters, filteredMissions, availableCategories, availableDistricts } =
    useMissionMapFilters(allMapItems, userCoords);
  const isMobile = useIsMobile();

  const currentUser = useCurrentUser();
  const { supportProposal } = useSupportProposal();
  const { handleJoin } = useJoinInitiativeAction();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showHuellas, setShowHuellas] = useState(true);
  const [selectedHuellaId, setSelectedHuellaId] = useState<string | null>(null);
  const drawerHandleRef = useRef<HTMLDivElement>(null);
  const focusTriggerRef = useRef<HTMLElement | null>(null);

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
    if (filteredMissions.length === 0) {
      setSelectedId(null);
      return;
    }
    const selectionValid = selectedId !== null && filteredMissions.some((m) => m.id === selectedId);
    if (!selectionValid) {
      setSelectedId(filteredMissions[0].id);
    }
  }, [filteredMissions, selectedId]);

  const handleSelectMission = useCallback((id: string) => {
    setSelectedId(id);
    if (typeof document !== "undefined") {
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body) {
        focusTriggerRef.current = active;
        active.blur();
      }
    }
  }, []);

  const activeEntity: InitiativeMapEntity | null =
    filteredMissions.find((m) => m.id === selectedId) ?? null;

  const peekEntity: InitiativeMapEntity | null =
    selectedId !== null && !detailOpen
      ? (filteredMissions.find((m) => m.id === selectedId) ?? null)
      : null;

  const handleViewDetail = useCallback(() => {
    if (!activeEntity) return;
    const route = getInitiativeDetailRoute(activeEntity);
    navigate(route);
  }, [activeEntity, navigate]);

  const handleDismissPeek = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handlePeekAction = useCallback(
    (action: InitiativeAction) => {
      if (!activeEntity) return;
      switch (action) {
        case "support":
          if (!currentUser) {
            toast.error("Debes iniciar sesión para apoyar");
            return;
          }
          supportProposal({ proposalId: activeEntity.sourceId });
          break;
        case "join":
          handleJoin(activeEntity.id, { lifecycle: activeEntity.lifecycle });
          break;
      }
    },
    [activeEntity, currentUser, supportProposal, handleJoin],
  );

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

      {/* Main Map Layout: sidebar + map + detail panel (desktop), map-only (mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-3 lg:gap-4 items-stretch">
        {/* Desktop sidebar — entity list */}
        {!isMobile && (
          <div className="hidden lg:block min-h-[640px]">
            <MapSidebar
              entities={filteredMissions}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={(id) => {
                setSelectedId(id);
                if (typeof document !== "undefined") {
                  const active = document.activeElement as HTMLElement | null;
                  if (active && active !== document.body) {
                    focusTriggerRef.current = active;
                    active.blur();
                  }
                }
              }}
              onHover={setHoveredId}
              isLoading={isLoading}
              detailEntity={detailOpen ? activeEntity : null}
              onCloseDetail={() => {
                setSelectedId(null);
                setDetailOpen(false);
              }}
              onSupport={(proposalId) => {
                if (!currentUser) {
                  toast.error("Debes iniciar sesión para apoyar");
                  return;
                }
                supportProposal({ proposalId });
              }}
              onJoin={(missionId) => {
                if (!activeEntity) return;
                handleJoin(missionId, { lifecycle: activeEntity.lifecycle });
              }}
            />
          </div>
        )}

        {/* Dynamic Leaflet Map */}
        <div className="relative min-h-[calc(100dvh-180px)] lg:h-[640px] w-full">
          <MapView
            missions={filteredMissions}
            selectedMissionId={activeEntity?.id || null}
            onSelectMission={handleSelectMission}
            userCoords={userCoords}
            userLocationLoading={userLocationLoading}
            onRequestUserLocation={requestUserLocation}
            districtWarmth={districtWarmth}
            showHuellas={showHuellas}
            onToggleHuellas={() => setShowHuellas((v) => !v)}
            selectedHuellaId={selectedHuellaId}
            onSelectHuella={setSelectedHuellaId}
            selectionPaddingTopLeft={isMobile ? [0, 0] : [280, 30]}
            selectionPaddingBottomRight={isMobile ? [0, 0] : [0, 0]}
          />
          {peekEntity && (
            <MapPeekCard
              entity={peekEntity}
              variant="floating"
              onClose={handleDismissPeek}
              onViewDetail={handleViewDetail}
              onPrimaryAction={handlePeekAction}
            />
          )}
        </div>
      </div>

      {/* MOBILE-ONLY: Vaul Bottom Sheet Drawer — territorial destination preview */}
      {isMobile && (
        <Drawer.Root
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) {
              setSelectedId(null);
              requestAnimationFrame(() => {
                focusTriggerRef.current?.focus();
                focusTriggerRef.current = null;
              });
            }
          }}
          snapPoints={["25%", "85vh"]}
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs" />
            <Drawer.Content
              className="bg-card flex flex-col rounded-t-[32px] max-h-[85vh] fixed bottom-0 left-0 right-0 z-50 outline-none border-t border-border/40 shadow-lift"
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                requestAnimationFrame(() => {
                  drawerHandleRef.current?.focus();
                });
              }}
            >
              <div className="p-0 bg-card rounded-t-[32px] flex-1 overflow-y-auto">
                <div
                  ref={drawerHandleRef}
                  tabIndex={-1}
                  className="mx-auto w-12 h-1.5 rounded-full bg-border/80 mb-3 shrink-0 mt-5 outline-none"
                />

                {activeEntity && (
                  <Drawer.Title className="sr-only">{activeEntity.title}</Drawer.Title>
                )}
                {activeEntity && (
                  <Drawer.Description className="sr-only">
                    {activeEntity.summary}
                  </Drawer.Description>
                )}

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
                                  params={{
                                    slug: districtSlugify(
                                      activeEntity.location?.district ?? activeEntity.region,
                                    ),
                                  }}
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
                              variant="compact"
                              onAction={(action: InitiativeAction) => {
                                switch (action) {
                                  case "support":
                                    if (!currentUser) {
                                      toast.error("Debes iniciar sesión para apoyar");
                                      break;
                                    }
                                    supportProposal({ proposalId: activeEntity.sourceId });
                                    break;
                                  case "join":
                                    handleJoin(activeEntity.id, {
                                      lifecycle: activeEntity.lifecycle,
                                    });
                                    break;
                                  case "share":
                                    shareInitiative(activeEntity.title, window.location.href);
                                    break;
                                  case "comment": {
                                    const route = getInitiativeDetailRoute(activeEntity);
                                    navigate({ ...route, hash: "comments" });
                                    break;
                                  }
                                  case "edit":
                                  case "report": {
                                    const route = getInitiativeDetailRoute(activeEntity);
                                    navigate(route);
                                    break;
                                  }
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
                        <div className="font-bold text-foreground">
                          {activeEntity.impact ?? "—"}
                        </div>
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
      )}
    </div>
  );
}
