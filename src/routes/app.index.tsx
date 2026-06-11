import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { MapPin, Sparkles, ArrowRight, Users, Compass, CompassIcon, RefreshCw } from "lucide-react";
import { Drawer } from "vaul";
import { REGION_META } from "@/constants/gamification";
import { districtSlugify } from "@/utils/districtSlug";
import { TerritorialFootprint } from "@/components/TerritorialFootprint";
import { KusqaButton } from "@/components/ui/kusqa-button";
import { useProfileMissionTimeline } from "@/features/auth/hooks/useUserMissions";
import { useQueryClient } from "@tanstack/react-query";
import { useLandingInitiatives } from "@/features/initiatives/hooks/useLandingInitiatives";
import { aggregateByRegion } from "@/domain/regionAggregations";
import { selectFeedItems } from "@/domain/missionSelection";
import type { Initiative } from "@/domain/initiative";
import type { InitiativeAction } from "@/domain/initiativeActions";
import { iconSize } from "@/design";
import { deriveAmbientSignal, initiativesToAmbientEvents } from "@/domain/ambient";
import { getInitiativeDetailRoute } from "@/domain/initiativeRoute";
import { InitiativeActionBar } from "@/features/actions/components/InitiativeActionBar";
import { shareInitiative } from "@/features/actions/shareInitiative";
import { useSupportProposal, useSupportCount } from "@/features/proposals/hooks/useSupportProposal";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const [selectedEntity, setSelectedEntity] = useState<Initiative | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { supportProposal, isSupported, isSupporting } = useSupportProposal();

  const { data: timeline, isLoading: timelineLoading } = useProfileMissionTimeline();
  const { data: initiatives = [], isLoading } = useLandingInitiatives();

  const handleRefreshMissions = () => {
    if (import.meta.env.DEV) {
      console.log("[KUSQA MISSION TRACE] Manual cache refresh triggered");
      queryClient.invalidateQueries({ queryKey: ["initiatives"] });
    }
  };

  const feedItems = useMemo(() => selectFeedItems(initiatives), [initiatives]);

  const ambientSignal = useMemo(() => {
    if (initiatives.length === 0) return null;
    const events = initiativesToAmbientEvents(initiatives);
    return deriveAmbientSignal(events);
  }, [initiatives]);

  const territories = useMemo(() => aggregateByRegion(initiatives), [initiatives]);

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
            <div
              className="absolute -bottom-20 -left-20 h-[250px] w-[250px] rounded-full bg-gradient-andes opacity-15 blur-3xl animate-float-slow"
              style={{ animationDelay: "2s" }}
            />
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
                {feedItems.length > 0 && !isLoading
                  ? "Tu territorio"
                  : "Descubre lo que puede empezar"}{" "}
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-sunrise">
                  {feedItems.length > 0 && !isLoading ? "está en movimiento." : "cerca de ti."}
                </span>
              </h1>
              <p className="text-sm text-stone-300 max-w-xl font-medium leading-relaxed">
                Jóvenes de todo el Perú ya están transformando sus distritos. Descubre las rutas
                activas cerca de ti.
              </p>
              <div className="flex flex-wrap gap-3">
                <KusqaButton variant="primary" asChild>
                  <Link to="/app/mapa">
                    Explorar misiones <MapPin className={iconSize.md} />
                  </Link>
                </KusqaButton>
                <KusqaButton variant="secondary" asChild>
                  <Link to="/app/crear">Crear proyecto</Link>
                </KusqaButton>
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
        <section className="space-y-3 relative">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <div>
              <h2 className="font-display font-bold text-lg sm:text-xl tracking-tight text-foreground inline-flex items-center gap-2">
                <CompassIcon className="h-4 w-4 text-accent" /> Misiones por región
              </h2>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">
                Rutas activas en cada territorio del Perú.
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-x-visible lg:snap-none lg:pb-0">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-[260px] sm:w-[280px] md:w-[320px] lg:w-auto shrink-0 snap-start bg-card border border-border/80 rounded-3xl overflow-hidden shadow-sm"
                >
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
            <div className="flex gap-3 sm:gap-3.5 overflow-x-auto pb-3 pt-1 px-1 no-scrollbar snap-x snap-mandatory lg:grid lg:grid-cols-3 lg:gap-3.5 lg:overflow-x-visible lg:snap-none lg:pb-0">
              {territories.map((t) => {
                const meta = REGION_META[t.region];
                return (
                  <motion.div
                    key={t.id}
                    whileHover={{ y: -1 }}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                    className="w-[240px] sm:w-[260px] md:w-[300px] lg:w-auto shrink-0 snap-start bg-card border border-border/60 rounded-2xl overflow-hidden transition-all duration-300 flex flex-col justify-between relative"
                  >
                    {/* Visual Header — single solid band, no mesh overlay */}
                    <div
                      className={`h-20 ${meta.gradient} text-white px-4 flex flex-col justify-between py-3 relative`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl select-none" aria-hidden>
                          {t.imageEmoji}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider font-bold text-white/90">
                          {meta.name}
                        </span>
                      </div>
                      <h3 className="font-display font-semibold text-sm tracking-tight leading-none truncate">
                        {t.name}
                      </h3>
                    </div>

                    {/* Body Details — calm, scannable */}
                    <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                      {t.preview ? (
                        <div className="flex items-center gap-2">
                          <span className="text-lg shrink-0">{t.preview.emoji}</span>
                          <p className="text-xs text-foreground/80 leading-snug line-clamp-2">
                            {t.preview.title}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic leading-relaxed line-clamp-2">
                          "{t.quote}"
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border/30">
                        <span className="text-muted-foreground">{t.leadCategory}</span>
                        <div className="flex items-center gap-2">
                          {(t as any).districtCount > 0 && (
                            <span className="text-muted-foreground/70">
                              {(t as any).districtCount} distrito
                              {(t as any).districtCount !== 1 ? "s" : ""}
                            </span>
                          )}
                          <span
                            className={
                              t.activeMissionsCount > 0
                                ? "font-semibold text-foreground/80 tabular-nums"
                                : "font-medium text-muted-foreground/70"
                            }
                          >
                            {t.activeMissionsCount > 0 ? (
                              `${t.activeMissionsCount} activa${t.activeMissionsCount !== 1 ? "s" : ""}`
                            ) : (
                              <>
                                Sin datos aún ·{" "}
                                <Link to="/app/crear" className="text-accent hover:underline">
                                  Sé el primero
                                </Link>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer CTA — quiet text link, not a heavy button */}
                    <Link
                      to={t.link}
                      className="px-3.5 pb-3.5 pt-1 inline-flex items-center gap-1 text-xs text-accent font-semibold hover:gap-1.5 transition-all"
                    >
                      Explorar territorio
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>

        {/* Ambient Signal — territory-wide mood from current entities */}
        <section className="rounded-lg border border-border/40 bg-card/40 p-4 sm:p-5">
          {ambientSignal ? (
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5 shrink-0">
                {ambientSignal.mood === "quiet" && "🌙"}
                {ambientSignal.mood === "hopeful" && "🌱"}
                {ambientSignal.mood === "awakening" && "🌅"}
                {ambientSignal.mood === "vibrant" && "⚡"}
                {ambientSignal.mood === "determined" && "🎯"}
              </span>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pulso del territorio
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {ambientSignal.energy}/10
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/85">{ambientSignal.tone}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                  <span>
                    Ritmo: {ambientSignal.cadence.pulse === "calm" && "En calma"}
                    {ambientSignal.cadence.pulse === "steady" && "Constante"}
                    {ambientSignal.cadence.pulse === "lively" && "Animado"}
                    {ambientSignal.cadence.pulse === "intense" && "Intenso"}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{ambientSignal.cadence.eventsLast7d} eventos recientes</span>
                  <span aria-hidden>·</span>
                  <span>
                    {ambientSignal.cadence.diversity} tipo
                    {ambientSignal.cadence.diversity !== 1 ? "s" : ""} de actividad
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5 shrink-0">💤</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Pulso del territorio
                </div>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  En espera — aún no hay señales recientes.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* P0 FIX: Eliminar progress widget, community pulse, y destacados - no son core para experiencia de misión */}
        {/* Estos widgets compiten con contenido de misiones y aumentan carga cognitiva */}
        {/* Progress movido a página /app/progreso, Community Pulse eliminado */}

        {/* En movimiento — unified feed, simplified */}
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-2 pl-1">
            <h2 className="font-display font-black text-lg sm:text-xl tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> En movimiento
            </h2>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {feedItems.length} iniciativa{feedItems.length !== 1 ? "s" : ""} activa
              {feedItems.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="rounded-2xl bg-card border border-border/50 overflow-hidden divide-y divide-border/30">
            {feedItems.length > 0 ? (
              feedItems.map((item) => {
                const isMissionEntity = item.sourceType === "mission";
                const isProposalEntity = item.sourceType === "proposal";
                const district = item.location?.district ?? "";
                const participants = item.participantsCount ?? 0;
                const anchorLabel = item.temporalAnchor.label;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedEntity(item)}
                    className="flex items-start gap-3 p-3 sm:p-3.5 hover:bg-secondary/30 transition-colors w-full text-left"
                  >
                    <div
                      className={`h-10 w-10 rounded-xl grid place-items-center text-lg shrink-0 border ${
                        isProposalEntity
                          ? "bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900/30"
                          : "bg-secondary border-border/30"
                      }`}
                    >
                      {isProposalEntity ? "🌱" : item.emoji || "🗺️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm text-foreground font-bold truncate flex items-center gap-1.5">
                        {item.title}
                        {isProposalEntity && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30 font-bold shrink-0">
                            Semilla cívica
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-muted-foreground/70 mt-0.5 font-medium flex flex-wrap items-center gap-1">
                        <MapPin className="h-3 w-3 opacity-60" />{" "}
                        <Link
                          to="/app/distrito/$slug"
                          params={{ slug: districtSlugify(district) }}
                          onClick={(e) => e.stopPropagation()}
                          className="truncate hover:underline hover:text-accent transition-colors"
                        >
                          {district}
                        </Link>
                        <span className="opacity-45">•</span>
                        <span className="truncate">{anchorLabel}</span>
                        {isMissionEntity && (
                          <>
                            <span className="opacity-45">•</span>
                            <Users className="h-3 w-3 opacity-60" /> <span>{participants}</span>
                          </>
                        )}
                        {isProposalEntity && (
                          <>
                            <span className="opacity-45">•</span>
                            <span className="truncate text-violet-600 dark:text-violet-400 font-semibold">
                              Buscando apoyo
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-6 text-center">
                <div className="text-2xl mb-2">🗺️</div>
                <p className="text-sm text-muted-foreground font-medium">
                  Tu territorio está en calma
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Aún no hay iniciativas activas en tu zona.
                </p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <Link
                    to="/app/mapa"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border/60 text-xs font-bold text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5" /> Explorar mapa
                  </Link>
                  <Link
                    to="/app/crear"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    Crear propuesta
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Vaul Drawer — feed entity preview with territorial gradient card */}
        <Drawer.Root
          open={selectedEntity !== null}
          onOpenChange={(open) => {
            if (!open) setSelectedEntity(null);
          }}
          snapPoints={["38%", "85vh"]}
        >
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50 backdrop-blur-xs" />
            <Drawer.Content className="bg-card flex flex-col rounded-t-[32px] max-h-[85vh] fixed bottom-0 left-0 right-0 z-50 outline-none border-t border-border/40 shadow-lift">
              <div className="p-0 bg-card rounded-t-[32px] flex-1 overflow-y-auto">
                <div className="mx-auto w-12 h-1.5 rounded-full bg-border/80 mb-3 shrink-0 mt-5" />

                {selectedEntity && (
                  <Drawer.Title className="sr-only">{selectedEntity.title}</Drawer.Title>
                )}
                {selectedEntity && (
                  <Drawer.Description className="sr-only">
                    {selectedEntity.summary}
                  </Drawer.Description>
                )}

                {selectedEntity &&
                  (() => {
                    const meta = REGION_META[selectedEntity.region];
                    const isProposalEntity = selectedEntity.sourceType === "proposal";
                    const district = selectedEntity.location?.district ?? "";
                    const description = selectedEntity.summary;
                    const participants = selectedEntity.participantsCount ?? 0;
                    return (
                      <>
                        <div className="px-5 pb-4">
                          <div
                            className={`rounded-2xl ${meta.gradient} p-5 text-white relative overflow-hidden shadow-card`}
                          >
                            <div className="absolute inset-0 bg-mesh opacity-25 pointer-events-none" />
                            <div className="relative z-10">
                              <span className="text-5xl filter drop-shadow-md select-none">
                                {selectedEntity.emoji}
                              </span>
                              <div className="mt-3 text-[10px] uppercase tracking-widest font-bold opacity-85">
                                {meta.name} · {selectedEntity.category}
                              </div>
                              <h3 className="font-display font-bold text-xl mt-0.5 leading-tight">
                                {selectedEntity.title}
                              </h3>
                              <p className="text-xs opacity-90 mt-1 flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" /> {district}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex items-center gap-2">
                            <InitiativeActionBar
                              initiative={selectedEntity}
                              relationship={
                                isSupported(selectedEntity.sourceId) ? "supporter" : "visitor"
                              }
                              variant="compact"
                              maxVisible={1}
                              onAction={(action: InitiativeAction) => {
                                switch (action) {
                                  case "support":
                                    if (!isSupported(selectedEntity.sourceId) && !isSupporting) {
                                      supportProposal({ proposalId: selectedEntity.sourceId });
                                    }
                                    break;
                                  case "join":
                                  case "edit":
                                  case "report": {
                                    const route = getInitiativeDetailRoute(selectedEntity);
                                    navigate(route);
                                    break;
                                  }
                                  case "comment": {
                                    const route = getInitiativeDetailRoute(selectedEntity);
                                    navigate({ ...route, hash: "comments" });
                                    break;
                                  }
                                  case "share":
                                    shareInitiative(selectedEntity.title, window.location.href);
                                    break;
                                }
                              }}
                            />
                            <Link
                              {...getInitiativeDetailRoute(selectedEntity)}
                              onClick={() => setSelectedEntity(null)}
                              className="text-xs text-muted-foreground/60 hover:text-foreground underline underline-offset-2 transition-colors"
                            >
                              Ver detalle →
                            </Link>
                          </div>
                        </div>

                        <div className="px-5 pb-6 space-y-4">
                          <p className="text-sm text-muted-foreground leading-relaxed pt-4 border-t border-border/10">
                            {description}
                          </p>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {isProposalEntity ? (
                              <>
                                <Sparkles className="h-3.5 w-3.5 text-violet-500" />
                                <span className="text-violet-600 dark:text-violet-400">
                                  Iniciativa en busca de apoyo ciudadano
                                </span>
                              </>
                            ) : (
                              <>
                                <Users className="h-3.5 w-3.5" />
                                <span>{participants} personas en esta ruta</span>
                              </>
                            )}
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
