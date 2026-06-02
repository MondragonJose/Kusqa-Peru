import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { MapPin, Sparkles, ArrowRight, Users, Compass, CompassIcon, RefreshCw } from "lucide-react";
import { Drawer } from "vaul";
import { REGION_META } from "@/constants/gamification";
import { useCurrentUser, useUserXpProgress } from "@/features/auth";
import { useProgression } from "@/features/progression";
// P0 FIX: Eliminado CommunityPulse - componente de fake community eliminado
import { useMissions } from "@/hooks/useMissions";
import { useAllProposals } from "@/features/proposals";
import { Onboarding } from "@/components/Onboarding";
import { TerritorialFootprint } from "@/components/TerritorialFootprint";
import { useProfileMissionTimeline } from "@/features/auth/hooks/useUserMissions";
import type { Region, Mission, MissionCategory, MissionDifficulty } from "@/types";
import type { Proposal } from "@/services/proposalContract";
import { useQueryClient } from "@tanstack/react-query";
import { missionKeys } from "@/lib/queryKeys";
import { formatRelativeDate } from "@/utils/date";
import { getCategoryMetadata } from "@/constants/categoryMetadata";
import { CivicEntity, isMission, isProposal } from "@/types/entity";
import { proposalToEntity, missionToEntity } from "@/services/entityAdapter";
import {
  selectFeaturedMissions,
  selectNearbyMissions,
  selectFeedItems,
  buildTerritory,
  calculateEntityStats
} from "@/domain/missionSelection";


// Helper para renderizar metadata contextual simple en cards
function renderCategoryMetadata(category: MissionCategory) {
  const meta = getCategoryMetadata(category);
  // Para beta, mostrar solo el primer field relevante
  const field = meta.fields[0];
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 font-medium">
      <span>{field.icon}</span>
      <span>{field.label}: {field.defaultValue}</span>
    </div>
  );
}

// Helper para renderizar badge de entityType
function renderEntityTypeBadge(entity: CivicEntity) {
  if (isProposal(entity)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-[8px] font-bold text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30">
        <span>🏛️</span>
        <span>Propuesta</span>
      </span>
    );
  }
  return null;
}

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: missions = [], isLoading: missionsLoading } = useMissions();
  const { data: proposals = [], isLoading: proposalsLoading } = useAllProposals(); // Sin filtro de status para incluir pending
  const currentUser = useCurrentUser();
  const { progressPct } = useUserXpProgress();
  const { currentStage, nextStage, xpToNextStage } = useProgression();
  const [selectedEntity, setSelectedEntity] = useState<CivicEntity | null>(null);
  const queryClient = useQueryClient();

  const { data: timeline, isLoading: timelineLoading } = useProfileMissionTimeline();
  const isLoading = missionsLoading || proposalsLoading;

  const handleRefreshMissions = () => {
    if (import.meta.env.DEV) {
      console.log("[KUSQA MISSION TRACE] Manual cache refresh triggered");
      queryClient.invalidateQueries({ queryKey: missionKeys.all });
    }
  };

  // Merge missions + proposals como CivicEntity unificado
  const allEntities = useMemo<CivicEntity[]>(() => {
    const missionEntities = missions.map(missionToEntity);
    const proposalEntities = proposals.flatMap((p) => {
      const entity = proposalToEntity(p);
      return entity ? [entity] : [];
    });
    const merged = [...missionEntities, ...proposalEntities];
    if (import.meta.env.DEV) {
      console.log("[KUSQA ENTITY TRACE] Dashboard merge:", missionEntities.length, "missions +", proposalEntities.length, "proposals =", merged.length, "total entities");
    }
    return merged;
  }, [missions, proposals]);

  // Domain logic: mission selection
  const featured = useMemo(() => selectFeaturedMissions(allEntities), [allEntities]);
  const userRegion = currentUser?.region as Region | undefined;
  const nearby = useMemo(() => selectNearbyMissions(allEntities, userRegion), [allEntities, userRegion]);
  const feedItems = useMemo(() => selectFeedItems(allEntities), [allEntities]);
  const entityStats = useMemo(() => calculateEntityStats(allEntities), [allEntities]);

  // Domain logic: territory building
  const territories = useMemo(() => [
    buildTerritory(allEntities, "sierra", "valle-sagrado", "Sierra & Andes",  "Sembrando agua y reforestando las cuencas de los abuelos.", "Medio ambiente", "🏔️"),
    buildTerritory(allEntities, "costa",  "barranco",      "Lima & Costa",    "Rescatando la memoria visual y comunitaria en el litoral.",  "Arte & cultura",  "🌊"),
    buildTerritory(allEntities, "selva",  "selva",         "Amazonía & Selva","Uniendo brigadas fluviales para limpiar nuestros ríos sagrados.", "Comunidad",  "🌿"),
  ], [allEntities]);

  // Dev logging (kept for debugging)
  if (import.meta.env.DEV) {
    console.log("[KUSQA MISSION TRACE] Dashboard: Featured selection:", featured.length, "missions (hidden:", allEntities.length - featured.length, ")");
    console.log("[KUSQA ENTITY TRACE] Dashboard: Nearby selection (userRegion:", userRegion, "):", nearby.length, "entities (hidden:", allEntities.length - nearby.length, ")");
    console.log("[KUSQA ENTITY TRACE] Dashboard: Feed selection:", feedItems.length, "entities (hidden:", allEntities.length - feedItems.length, ")");
    const visibleInDashboard = new Set([...featured, ...nearby, ...feedItems]).size;
    const visiblePercent = allEntities.length > 0 ? ((visibleInDashboard / allEntities.length) * 100).toFixed(1) : "0";
    const missionCount = allEntities.filter(e => e.entityType === "mission").length;
    const proposalCount = allEntities.filter(e => e.entityType === "proposal").length;
    console.log("[KUSQA ENTITY TRACE] Dashboard visibility summary:", visibleInDashboard, "unique entities visible of", allEntities.length, "total (" + visiblePercent + "% visible)");
    console.log("[KUSQA ENTITY TRACE] Entity breakdown:", missionCount, "missions +", proposalCount, "proposals");
  }

  return (
    <>
      {/* P0 FIX: Eliminar onboarding bloqueante - no es core para experiencia de misión */}
      {/* <Onboarding onComplete={() => {}} /> */}
      {import.meta.env.DEV && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={handleRefreshMissions}
            className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-500 text-xs font-bold hover:bg-yellow-500/30 transition-all"
          >
            <RefreshCw className="h-3 w-3" />
            Refrescar misiones
          </button>
        </div>
      )}
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 max-w-6xl mx-auto pb-24 lg:pb-16 relative">
        {/* Slight trail line for expedition feel */}
        <div className="absolute left-8 top-24 bottom-24 w-px bg-gradient-to-b from-transparent via-border/30 to-transparent hidden lg:block" />

      {/* P0 FIX: Hero reducido - CTA dominante, estadísticas movidas a sección secundaria */}
      {/* P0 FIX: Skeleton hero estable para first paint */}
      {isLoading ? (
        <section className="relative overflow-hidden rounded-2xl bg-stone-950 text-white p-6 sm:p-8 shadow-2xl border border-white/10">
          <div className="absolute inset-0 bg-mesh opacity-15 pointer-events-none" />
          <div className="relative space-y-4 sm:space-y-6">
            <div className="space-y-3">
              <div className="h-6 w-32 bg-white/10 rounded-full animate-pulse" />
              <div className="h-10 sm:h-12 w-3/4 bg-white/10 rounded-lg animate-pulse" />
              <div className="h-4 w-full max-w-xl bg-white/10 rounded animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 w-32 bg-white/10 rounded-xl animate-pulse" />
              <div className="h-10 w-32 bg-white/10 rounded-xl animate-pulse" />
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-2xl bg-stone-950 text-white p-6 sm:p-8 shadow-2xl border border-white/10">
          <div className="absolute inset-0 bg-mesh opacity-15 pointer-events-none" />
          {/* Ambient gradient blobs — visual bridge from landing hero */}
          <div className="absolute -top-20 -right-20 h-[300px] w-[300px] rounded-full bg-gradient-sunrise opacity-20 blur-3xl animate-float-slow" />
          <div className="absolute -bottom-20 -left-20 h-[250px] w-[250px] rounded-full bg-gradient-andes opacity-15 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />
          <div className="relative space-y-4 sm:space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] uppercase font-bold tracking-widest text-amber-300 border border-white/5">
                <Compass className="h-3 w-3" /> Misiones abiertas
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] uppercase font-bold tracking-widest text-amber-300/80 border border-white/5">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Movimiento vivo
              </span>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-[1.05]">
              Tu territorio <br/>
              <span className="bg-clip-text text-transparent bg-gradient-sunrise">está en movimiento.</span>
            </h1>
            <p className="text-sm text-stone-300 max-w-xl font-medium leading-relaxed">
              Jóvenes de todo el Perú ya están transformando sus distritos. Descubre las rutas activas cerca de ti.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/app/mapa" className={`inline-flex items-center gap-2 ${conventions.button.primary}`}>
                Explorar misiones <MapPin className={iconSize.md} />
              </Link>
              <Link to="/app/crear" className={`inline-flex items-center gap-2 ${conventions.button.secondary}`}>
                Crear proyecto
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Tu huella en el territorio — footprint section */}
      <section className="relative rounded-2xl bg-card border border-border/80 p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="shrink-0">
            {timelineLoading ? (
              <div className="w-[120px] h-[180px] bg-secondary/50 rounded-xl animate-pulse" />
            ) : (
              <TerritorialFootprint missions={timeline?.missions ?? []} compact />
            )}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="font-display font-black text-lg sm:text-xl text-foreground tracking-tight flex items-center justify-center sm:justify-start gap-2">
              <span className="text-lg">🦶</span> Tu huella en el territorio
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-medium leading-relaxed max-w-sm">
              {timelineLoading
                ? "Cargando tu huella..."
                : (timeline?.missions?.length ?? 0) > 0
                  ? "Cada misión deja una marca en el mapa. Las rutas que has recorrido ya son parte de tu memoria territorial."
                  : "Explora misiones para comenzar a dejar tu huella en el territorio."}
            </p>
          </div>
        </div>
      </section>

      {/* Territorios en Movimiento — Horizontally scrollable expedition cards */}
      <section className="space-y-4 relative">
        {/* activeMissionsCount is derived from real missions */}
        {/* Small connection dot */}
        <div className="absolute -left-4 top-8 w-2 h-2 rounded-full bg-accent/50 hidden lg:block" />
        <div className="flex items-end justify-between px-1">
          <div>
            <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight text-foreground flex items-center gap-2">
              <CompassIcon className="h-5 w-5 text-accent" /> Misiones por región
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Explora expediciones activas en cada territorio del Perú.</p>
          </div>
          <Link to="/app/mapa" className="text-xs uppercase tracking-wider text-primary font-bold hover:underline inline-flex items-center gap-1">
            Explorar territorio <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-x-visible lg:snap-none lg:pb-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-[260px] sm:w-[280px] md:w-[320px] lg:w-auto shrink-0 snap-start bg-card border border-border/80 rounded-3xl overflow-hidden shadow-sm">
                <div className="h-24 bg-secondary animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
                  <div className="h-3 w-full bg-secondary rounded animate-pulse" />
                  <div className="h-3 w-1/2 bg-secondary rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-x-visible lg:snap-none lg:pb-0">
            {territories.map((t) => {
            const meta = REGION_META[t.region];
            return (
              <motion.div
                key={t.id}
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-[260px] sm:w-[280px] md:w-[320px] lg:w-auto shrink-0 snap-start bg-card border border-border/80 rounded-3xl overflow-hidden shadow-sm transition-all duration-300 flex flex-col justify-between relative"
              >
                {/* Subtle pulse for active territories */}
                {t.activeMissionsCount > 0 && (
                  <motion.div
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [1, 0.5, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
                {/* Visual Header */}
                <div className={`h-24 ${meta.gradient} text-white p-4 relative`}>
                  <div className="absolute inset-0 bg-mesh opacity-20" />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-3xl filter drop-shadow-sm select-none">{t.imageEmoji}</span>
                    <span className="text-[8px] uppercase tracking-widest font-black bg-black/35 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-white">
                      {meta.name}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h3 className="font-display font-bold text-sm tracking-tight leading-none truncate">
                      {t.name}
                    </h3>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  {t.preview ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl shrink-0">{t.preview.emoji}</span>
                      <p className="text-xs text-foreground/80 font-semibold leading-snug line-clamp-2">{t.preview.title}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic leading-relaxed">"{t.quote}"</p>
                  )}
                  
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-semibold">Causa principal</span>
                      <span className="font-extrabold text-primary">{t.leadCategory}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                        <span>Actividad territorial</span>
                        <span className={t.activeMissionsCount > 0 ? "text-emerald-500" : "text-muted-foreground/50"}>
                          {t.activeMissionsCount > 0 ? `${t.activeMissionsCount} misión${t.activeMissionsCount !== 1 ? "es" : ""}` : "Próximamente"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-sunrise"
                          initial={{ width: 0 }}
                          animate={{ width: t.activeMissionsCount > 0 ? `${Math.min(100, t.activeMissionsCount * 20)}%` : "3%" }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="px-4 pb-4 pt-1">
                  <Link
                    to={t.link}
                    className="w-full inline-flex justify-center items-center py-2.5 rounded-xl bg-gradient-sunrise text-white hover:opacity-90 transition-all text-[10px] font-black uppercase tracking-wider shadow-sm"
                  >
                    Explorar ruta
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
        )}
      </section>

      {/* P0 FIX: Eliminar progress widget, community pulse, y destacados - no son core para experiencia de misión */}
      {/* Estos widgets compiten con contenido de misiones y aumentan carga cognitiva */}
      {/* Progress movido a página /app/progreso, Community Pulse eliminado */}

      {/* En movimiento — unified feed, simplified */}
      <section className="space-y-2">
        <h2 className="font-display font-black text-lg sm:text-xl tracking-tight text-foreground flex items-center gap-2 pl-1">
          <Sparkles className="h-5 w-5 text-accent" /> En movimiento
        </h2>
        <div className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/30">
          {feedItems.filter((f) => f.entityType !== "proposal").length > 0 ? (
            feedItems.filter((f) => f.entityType !== "proposal").map((item) => {
              const isMissionEntity = isMission(item);
              return (
              <button
                key={item.id}
                onClick={() => setSelectedEntity(item)}
                className="flex items-start gap-2.5 lg:gap-3 p-2.5 lg:p-3 hover:bg-secondary/30 transition-colors w-full text-left"
              >
                <div className="h-9 lg:h-10 w-9 lg:w-10 rounded-xl bg-secondary grid place-items-center text-base lg:text-lg shrink-0 border border-border/30">
                  {item.emoji || "🗺️"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs lg:text-sm text-foreground font-bold truncate flex items-center gap-1">
                    {item.title}
                  </div>
                  <div className="text-[9px] lg:text-[10px] text-muted-foreground/70 mt-0.5 font-medium flex flex-wrap items-center gap-1">
                    <MapPin className="h-2.5 w-2.5 opacity-60" /> <span className="truncate">{item.district}</span>
                    <span className="opacity-45">•</span>
                    <span className="truncate">{formatRelativeDate(item.date)}</span>
                    {isMissionEntity && <><span className="opacity-45">•</span>
                    <Users className="h-2.5 w-2.5 opacity-60" /> <span>{item.participants}</span></>}
                  </div>
                </div>
              </button>
              );
            })
          ) : (
            <div className="p-6 text-center">
              <div className="text-2xl mb-2">🗺️</div>
              <p className="text-sm text-muted-foreground font-medium">Tu territorio está en calma</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Explora el mapa y activa nuevas rutas.</p>
            </div>
          )}
        </div>
      </section>

      {/* Vaul Drawer — feed entity preview with territorial gradient card */}
      <Drawer.Root open={selectedEntity !== null} onOpenChange={(open) => { if (!open) setSelectedEntity(null); }} snapPoints={["38%", "85vh"]}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[32px] max-h-[85vh] fixed bottom-0 left-0 right-0 z-50 outline-none border-t border-border/40 shadow-lift">
            <div className="p-0 bg-card rounded-t-[32px] flex-1 overflow-y-auto">
              <div className="mx-auto w-12 h-1.5 rounded-full bg-border/80 mb-3 shrink-0 mt-5" />

              {selectedEntity && (() => {
                const meta = REGION_META[selectedEntity.region];
                return (
                  <>
                    {/* — PREVIEW — territorial destination card visible at first snap point */}
                    <div className="px-5 pb-4">
                      <div className={`rounded-2xl ${meta.gradient} p-5 text-white relative overflow-hidden shadow-card`}>
                        <div className="absolute inset-0 bg-mesh opacity-25 pointer-events-none" />
                        <div className="relative z-10">
                          <span className="text-5xl filter drop-shadow-md select-none">{selectedEntity.emoji}</span>
                          <div className="mt-3 text-[10px] uppercase tracking-widest font-bold opacity-85">
                            {meta.name} · {selectedEntity.category}
                          </div>
                          <h3 className="font-display font-bold text-xl mt-0.5 leading-tight">{selectedEntity.title}</h3>
                          <p className="text-xs opacity-90 mt-1 flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" /> {selectedEntity.district}
                          </p>
                        </div>
                      </div>

                      <Link
                        to="/app/mision/$missionId"
                        params={{ missionId: selectedEntity.id }}
                        onClick={() => setSelectedEntity(null)}
                        className="mt-4 w-full inline-flex justify-center items-center rounded-xl bg-gradient-sunrise text-white py-3.5 font-semibold text-sm shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
                      >
                        Explorar ruta
                      </Link>
                    </div>

                    {/* — DETAILS — expands on drag up */}
                    <div className="px-5 pb-6 space-y-4">
                      <p className="text-sm text-muted-foreground leading-relaxed pt-4 border-t border-border/10">
                        {selectedEntity.description}
                      </p>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        <span>{selectedEntity.participants} personas en esta ruta</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
    </>
  );
}
