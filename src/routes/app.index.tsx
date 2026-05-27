import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { MapPin, Sparkles, ArrowRight, Users, TrendingUp, Heart, Compass, CompassIcon, RefreshCw, X } from "lucide-react";
import { REGION_META } from "@/constants/gamification";
import { useCurrentUser, useUserXpProgress } from "@/features/auth";
import { useProgression } from "@/features/progression";
// P0 FIX: Eliminado CommunityPulse - componente de fake community eliminado
import { useMissions } from "@/hooks/useMissions";
import { useAllProposals } from "@/features/proposals";
import { Onboarding } from "@/components/Onboarding";
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
import { conventions, iconSize } from "@/design";

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
          <div className="relative space-y-4 sm:space-y-6">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] uppercase font-bold tracking-widest text-amber-300 border border-white/5">
                <Compass className="h-3 w-3" /> Misiones abiertas
              </span>
              <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-[1.05] mt-3">
                Participa en misiones <br/>
                <span className="bg-clip-text text-transparent bg-gradient-sunrise">reales en tu territorio.</span>
              </h1>
              <p className="text-sm text-stone-300 max-w-xl font-medium leading-relaxed mt-2">
                Únete a expediciones cívicas, conecta con jóvenes de todo el Perú y genera impacto visible.
              </p>
            </div>
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
            Ir al mapa <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar snap-x snap-mandatory">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-[260px] sm:w-[280px] md:w-[320px] shrink-0 snap-start bg-card border border-border/80 rounded-3xl overflow-hidden shadow-sm">
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
          <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar snap-x snap-mandatory">
            {territories.map((t) => {
            const meta = REGION_META[t.region];
            return (
              <motion.div
                key={t.id}
                whileHover={{ y: -2 }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-[260px] sm:w-[280px] md:w-[320px] shrink-0 snap-start bg-card border border-border/80 rounded-3xl overflow-hidden shadow-sm transition-all duration-300 flex flex-col justify-between relative"
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
                    className="w-full inline-flex justify-center items-center py-2.5 rounded-xl bg-secondary hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors text-[10px] font-black uppercase tracking-wider text-foreground"
                  >
                    Explorar
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
        )}
      </section>

      {/* Featured Recommendations */}
      <section className="space-y-3 sm:space-y-4 relative">
        {/* Small connection dot */}
        <div className="absolute -left-4 top-8 w-2 h-2 rounded-full bg-primary/50 hidden lg:block" />
        <div>
          <h2 className="font-display font-black text-lg sm:text-2xl tracking-tight text-foreground">Destacados</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Expediciones locales y de alto impacto cívico.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-3 sm:gap-4">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-3xl bg-card border border-border/80 overflow-hidden shadow-sm">
                  <div className="h-36 bg-secondary animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-secondary rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </>
          ) : featured.length === 0 ? (
            <div className="md:col-span-3 rounded-3xl border border-dashed border-border p-10 text-center">
              <div className="text-4xl mb-3">🗺️</div>
              <p className="text-sm text-muted-foreground font-medium">Explorando el territorio</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Descubre misiones activas en el mapa.</p>
              <Link to="/app/mapa" className="inline-flex items-center gap-2 mt-4 text-xs font-black uppercase tracking-wider text-primary hover:underline">
                Ir al mapa <ArrowRight className={iconSize.sm} />
              </Link>
            </div>
          ) : featured.map((m, i) => {
            const meta = REGION_META[m.region as Region] || REGION_META.costa;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  to="/app/mision/$missionId"
                  params={{ missionId: m.id }}
                  className="group block rounded-3xl bg-card border border-border/80 overflow-hidden shadow-sm transition-all duration-300"
                >
                  <div className={`h-36 ${meta.gradient} relative grid place-items-center text-5xl`}>
                    <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
                    <span className="select-none filter drop-shadow-sm">{m.emoji}</span>
                    <span className="absolute top-3 left-3 text-[8px] uppercase tracking-widest font-extrabold text-white bg-black/35 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                      {meta.name}
                    </span>
              <span className="absolute top-3 right-3 text-xs font-black text-white bg-black/45 backdrop-blur px-2.5 py-1 rounded-full border border-white/10">
                      {m.difficulty}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                        <MapPin className="h-3.5 w-3.5 text-primary/75" /> {m.district}
                      </div>
                      {renderEntityTypeBadge(m)}
                    </div>
                    <div className="font-display font-bold text-base mt-2 group-hover:text-primary transition-colors line-clamp-1">
                      {m.title}
                    </div>
                    {renderCategoryMetadata(m.category)}
                    <div className="mt-4 flex items-center justify-between text-xs border-t border-border/40 pt-3">
                      <span className="text-muted-foreground/90 font-medium inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-emerald-500" /> {m.participants} participantes
                      </span>
                      <span className="font-bold text-primary">{m.spotsLeft} cupos disponibles</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* P0 FIX: Eliminar progress widget y community pulse - no son core para experiencia de misión */}
      {/* Estos widgets compiten con contenido de misiones y aumentan carga cognitiva */}
      {/* Progress movido a página /app/progreso, Community Pulse eliminado */}

      {/* P1 FIX: Unificar feeds - solo un feed "Misiones en tu territorio" */}
      <section className="space-y-3 sm:space-y-4">
        <p className="text-xs text-muted-foreground pl-1">Selecciona una misión para ver detalles o crea tu propio proyecto</p>
        <h2 className="font-display font-black text-lg sm:text-xl tracking-tight text-foreground flex items-center gap-2 pl-1">
          <Sparkles className="h-5 w-5 text-accent" /> Misiones en tu territorio
        </h2>
        <div className="rounded-3xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60 shadow-sm">
          {feedItems.length > 0 ? (
            feedItems.map((item) => {
              const isMissionEntity = isMission(item);
              const isProposalEntity = isProposal(item);
              return (
              <button
                key={item.id}
                onClick={() => setSelectedEntity(item)}
                className="flex items-start gap-3 lg:gap-4 p-3 lg:p-4 hover:bg-secondary/30 transition-colors w-full text-left"
              >
                <div className="h-10 lg:h-11 w-10 lg:w-11 rounded-2xl bg-secondary grid place-items-center text-lg lg:text-xl shrink-0 border border-border/30">
                  {item.emoji || "🗺️"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs lg:text-sm text-foreground flex flex-wrap items-center gap-1">
                    <span className="font-bold text-foreground/90 truncate">{item.title}</span>
                    {isProposalEntity && (
                      <span className="text-[7px] lg:text-[8px] font-bold px-1 lg:px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30 tracking-wide uppercase whitespace-nowrap">
                        Propuesta
                      </span>
                    )}
                    {isMissionEntity && (
                      <span className="text-[7px] lg:text-[8px] font-bold px-1 lg:px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 tracking-wide uppercase whitespace-nowrap">
                        Misión
                      </span>
                    )}
                  </div>
                  <div className="text-[9px] lg:text-[10px] text-muted-foreground/80 mt-1 lg:mt-0.5 font-medium flex flex-wrap items-center gap-1">
                    <MapPin className="h-2.5 lg:h-3 w-2.5 lg:w-3 opacity-60" /> <span className="truncate">{item.district}</span>
                    <span className="opacity-45">•</span>
                    <span className="truncate">{formatRelativeDate(item.date)}</span>
                    {isMissionEntity && <><span className="opacity-45">•</span>
                    <Users className="h-2.5 lg:h-3 w-2.5 lg:w-3 opacity-60" /> <span className="truncate">{item.participants} activos</span></>}
                    {isProposalEntity && <><span className="opacity-45">•</span>
                    <span className="text-violet-600 dark:text-violet-400 truncate">Nueva</span></>}
                  </div>
                </div>
                <ArrowRight className="hidden sm:block h-3.5 lg:h-4 w-3.5 lg:w-4 text-muted-foreground/60 flex-shrink-0" />
              </button>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <div className="text-3xl mb-3">🗺️</div>
              <p className="text-sm text-muted-foreground font-medium">Explorando el territorio</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Descubre misiones activas en el mapa.</p>
            </div>
          )}
        </div>
      </section>

      {/* Bottom Sheet para detalle de entidad */}
      <AnimatePresence>
        {selectedEntity && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEntity(null)}
              className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            />
            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card rounded-t-3xl border-t border-border/60 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="p-4 lg:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-secondary grid place-items-center text-2xl border border-border/30">
                      {selectedEntity.emoji || "🗺️"}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{selectedEntity.title}</h3>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {selectedEntity.district}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEntity(null)}
                    className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{selectedEntity.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{selectedEntity.participants} participantes</span>
                  </div>
                  <Link
                    to="/app/mision/$missionId"
                    params={{ missionId: selectedEntity.id }}
                    onClick={() => setSelectedEntity(null)}
                    className="block w-full text-center py-3 rounded-xl bg-gradient-sunrise text-white font-semibold hover:opacity-90 transition-opacity"
                  >
                    Ver detalles completos
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
    </>
  );
}
