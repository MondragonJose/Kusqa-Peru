import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { lazy, Suspense, useMemo } from "react";
import { ArrowLeft, MapPin, Loader2, AlertCircle, Sparkles, Compass, Users } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { REGION_META } from "@/constants/gamification";
import type { Region } from "@/types";
import {
  useDistrict,
  useDistrictActivity,
  useDistrictFeed,
  useDistrictIntelligence,
  useDistrictTopSupporters,
  useSpatialContext,
} from "@/features/districts/hooks";
import {
  classifyDistrictActivity,
  DISTRICT_ACTIVITY_COPY,
  formatTerritorialImpact,
  isFirstMovementNeeded,
  deriveMovementDirection,
} from "@/domain/territoryAggregations";
import { deriveDistrictVitality, deriveSpatialSignals, buildSpatialNarrative } from "@/domain/territorialIntelligence";
import { useCoordinationNarratives } from "@/features/coordination/hooks/useCoordinationNarratives";
import { useCurrentUserId } from "@/features/auth";
import { InitiativeCard } from "@/features/home/components/InitiativeCard";
import { deriveLifecycleFromMission, computeMissionAnchor } from "@/domain/initiative";
import type { Initiative } from "@/domain/initiative";
import { formatRelativeDate } from "@/utils/date";
import { districtActivityToTerritorial } from "@/domain/territorialEvent";
import type { DistrictActivity } from "@/services/districtRepository";
import { DistrictPulseCard } from "@/components/DistrictPulseCard";
import { buildDistrictPulse } from "@/services/activityFeedResolver";
import { deriveAmbientPulse } from "@/domain/ambient";
import { useAmbientCadence } from "@/hooks/useAmbientCadence";
import type { AmbientPulseCadence } from "@/domain/ambient";

// Lazy-load the activity feed (avatars + timestamps can grow the bundle)
const DistrictActivityFeed = lazy(() =>
  import("@/features/districts/components/DistrictActivityFeed").then((m) => ({
    default: m.DistrictActivityFeed,
  })),
);

// Lazy-load the top supporters row (avatars)
const DistrictTopSupporters = lazy(() =>
  import("@/features/districts/components/DistrictTopSupporters").then((m) => ({
    default: m.DistrictTopSupporters,
  })),
);

export const Route = createFileRoute("/app/distrito/$slug")({
  component: DistrictPage,
});

function DistrictPage() {
  const { slug } = useParams({ from: "/app/distrito/$slug" });
  const { data: district, isLoading: districtLoading, isError: districtError } = useDistrict(slug);
  const { data: intelligence, isLoading: intelligenceLoading } = useDistrictIntelligence(district?.id ?? "");
  const { data: feed, isLoading: feedLoading } = useDistrictFeed(slug);
  const { data: activity } = useDistrictActivity(district?.id ?? "", 12);
  const { data: topSupporters } = useDistrictTopSupporters(district?.id ?? "", 8);
  const currentUserId = useCurrentUserId();

  if (districtLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (districtError || !district) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-display font-semibold">No encontramos este distrito</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Es posible que el enlace haya cambiado o que el distrito aún no esté en el catálogo de
          KUSQA.
        </p>
        <Link
          to="/app"
          className="mt-2 text-sm text-accent hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
        </Link>
      </div>
    );
  }

  const region = district.region as Region;
  const regionMeta = REGION_META[region];
  const summary = intelligence ?? {
    missionCount: 0,
    completedMissionCount: 0,
    proposalCount: 0,
    activeProposalCount: 0,
    uniqueSupporterCount: 0,
    acceptedCollaboratorCount: 0,
    lastActivityAt: null,
  };
  const activityClass = classifyDistrictActivity(summary);
  const activityCopy = DISTRICT_ACTIVITY_COPY[activityClass];
  const impact = formatTerritorialImpact(summary);
  const firstMovement = isFirstMovementNeeded(summary);
  const vitality = deriveDistrictVitality(summary, activityClass, deriveMovementDirection(summary));

  // Phase 13G: spatial narrative — geometry-aware context from real data
  const { spatialContext } = useSpatialContext(slug);
  const spatialSignals = useMemo(() => {
    if (!spatialContext) return null;
    return deriveSpatialSignals(spatialContext);
  }, [spatialContext]);

  const spatialNarrative = useMemo(() => {
    if (!spatialSignals) return null;
    return buildSpatialNarrative(spatialSignals);
  }, [spatialSignals]);

  // DistrictPulse derivation from TerritorialEvent
  const territorialEvents = useMemo(() => {
    if (!activity || activity.length === 0) return [];
    return activity.map(
      (a: DistrictActivity) => districtActivityToTerritorial(a, district.id, district.region),
    );
  }, [activity, district?.id, district?.region]);

  const districtPulse = useMemo(() => {
    if (territorialEvents.length === 0) return null;
    return buildDistrictPulse(territorialEvents, slug, district.displayName, {
      score: vitality.score,
      narrative: vitality.narrative,
    });
  }, [territorialEvents, slug, district?.displayName, vitality.score, vitality.narrative]);

  const ambientPulse = useMemo(() => {
    if (territorialEvents.length === 0) return null;
    return deriveAmbientPulse(
      territorialEvents,
      slug,
      district.displayName,
      vitality,
      spatialSignals ?? undefined,
    );
  }, [territorialEvents, slug, district?.displayName, vitality, spatialSignals]);

  const cadence = useAmbientCadence(territorialEvents);

  // Phase 14: coordination narratives
  const coordinationNarratives = useCoordinationNarratives(slug, district.id, summary, undefined);

  // Build Initiative objects from feed missions for InitiativeCard
  const initiativeMissions = useMemo(() => {
    if (!feed || feed.recentMissions.length === 0) return [];
    return feed.recentMissions.map((m) => {
      const location: Initiative["location"] = {
        district: m.district,
        districtId: m.districtId ?? null,
        region: m.region,
        coords: m.coords ?? null,
        locationLabel: null,
      };
      return {
        id: `mission_${m.id}`,
        sourceType: "mission" as const,
        sourceId: m.id,
        title: m.title,
        summary: m.description ?? "",
        category: m.category,
        region: m.region,
        lifecycle: deriveLifecycleFromMission(m.lifecycleInfo.lifecycle),
        participantsCount: m.participants,
        temporalAnchor: computeMissionAnchor(m.lifecycleInfo, m.startDate, m.endDate),
        emoji: m.emoji,
        location,
      } satisfies Initiative;
    });
  }, [feed]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background pb-16"
    >
      {/* Top bar with breadcrumb */}
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border/40">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 sm:px-6 h-12">
          <Link
            to="/app"
            aria-label="Volver al inicio"
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <nav className="flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/app" className="hover:text-foreground transition-colors">
              Inicio
            </Link>
            <span aria-hidden>/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">
              {district.displayName}
            </span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <header className={`${regionMeta.gradient} text-white`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-90">
            <span aria-hidden>{regionMeta.emoji}</span>
            <span>{regionMeta.name}</span>
            {district.department && (
              <>
                <span aria-hidden>·</span>
                <span>{district.department}</span>
              </>
            )}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold leading-tight">
            {district.displayName}
          </h1>
          <p className="text-sm sm:text-base text-white/90 max-w-prose">
            {district.narrative ?? "Un distrito del catálogo KUSQA."}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge
              variant="secondary"
              className="bg-white/20 text-white border-white/30 hover:bg-white/25"
            >
              {impact}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-white/20 text-white border-white/30 hover:bg-white/25"
            >
              {activityCopy.label}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-5 sm:space-y-8">
        {/* Territorial narrative — unified civic memory, spatial, and coordination context */}
        <section
          className="rounded-lg border border-border/40 bg-card/40 p-4 sm:p-5"
          aria-label="Memoria cívica"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-sm leading-relaxed text-foreground/90">
                {vitality.narrative}
              </p>
              {vitality.dormantDays !== null && vitality.dormantDays > 60 && (
                <p className="text-xs text-muted-foreground/70">
                  {vitality.dormantDays} días sin actividad registrada.
                </p>
              )}
              {spatialNarrative && (
                <div className="flex items-start gap-2 pt-2 mt-2 border-t border-border/20">
                  <Compass className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-xs leading-relaxed text-foreground/80">
                      {spatialNarrative}
                    </p>
                    {spatialContext && spatialContext.neighborCount != null && (
                      <p className="text-[11px] text-muted-foreground/70">
                        {spatialContext.neighborCount} distrito{spatialContext.neighborCount !== 1 ? "s" : ""} vecino{spatialContext.neighborCount !== 1 ? "s" : ""} en el territorio.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {coordinationNarratives.length > 0 && (
                <div className="pt-2 mt-2 border-t border-border/20 space-y-1.5">
                  {coordinationNarratives.slice(0, 1).map((n, i) => (
                    <p key={i} className="text-xs leading-relaxed text-foreground/70">
                      {n.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Stats grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Resumen territorial">
          {intelligenceLoading ? (
            <>
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
              <StatSkeleton />
            </>
          ) : (
            <>
              <StatTile
                label="Misiones"
                value={summary.missionCount}
                hint={
                  summary.missionCount > 0 ? `${summary.completedMissionCount} completadas` : null
                }
              />
              <StatTile
                label="Propuestas"
                value={summary.proposalCount}
                hint={
                  summary.activeProposalCount > 0 ? `${summary.activeProposalCount} activas` : null
                }
              />
              <StatTile
                label="Personas sumadas"
                value={summary.uniqueSupporterCount}
                hint={summary.uniqueSupporterCount === 0 ? "Aún sin apoyos" : null}
              />
              <StatTile
                label="Co-organización"
                value={summary.acceptedCollaboratorCount}
                hint={summary.acceptedCollaboratorCount === 0 ? "Sin aliados aún" : null}
              />
            </>
          )}
        </section>

        {/* District Pulse — ambient activity signals */}
        {districtPulse && (
          <section aria-label="Pulso del distrito">
            <DistrictPulseCard pulse={districtPulse} />
          </section>
        )}

        {/* Ambient Pulse — complementary mood + cadence */}
        {ambientPulse && (
          <section
            className="rounded-lg border border-border/40 bg-card/40 p-4 sm:p-5"
            aria-label="Señal ambiental"
          >
            <div className="flex items-start gap-3">
              <span className="text-lg mt-0.5 shrink-0">
                {ambientPulse.signal.mood === "quiet" && "🌙"}
                {ambientPulse.signal.mood === "hopeful" && "🌱"}
                {ambientPulse.signal.mood === "awakening" && "🌅"}
                {ambientPulse.signal.mood === "vibrant" && "⚡"}
                {ambientPulse.signal.mood === "determined" && "🎯"}
              </span>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Señal ambiental
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {ambientPulse.signal.energy}/10
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/85">
                  {ambientPulse.signal.tone}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                  <span>
                    Ritmo:{" "}
                    {cadence.pulse === "calm" && "En calma"}
                    {cadence.pulse === "steady" && "Constante"}
                    {cadence.pulse === "lively" && "Animado"}
                    {cadence.pulse === "intense" && "Intenso"}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{cadence.eventsLast7d} eventos recientes</span>
                  {cadence.uniqueActors > 0 && (
                    <>
                      <span aria-hidden>·</span>
                      <span>{cadence.uniqueActors} actor{cadence.uniqueActors !== 1 ? "es" : ""}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* First movement empty state */}
        {firstMovement && (
          <section
            className="rounded-lg border-2 border-dashed border-border/60 bg-card/30 p-5 sm:p-6 text-center space-y-3"
            aria-label="Primer movimiento"
          >
            <MapPin className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="space-y-1">
              <h2 className="text-base font-display font-semibold">
                Todavía no hay rutas activas en este distrito.
              </h2>
              <p className="text-sm text-muted-foreground">Sé quien inicie la primera.</p>
            </div>
            <Button asChild>
              <Link to="/app/crear" search={{ district: district.displayName }}>
                Crear la primera propuesta
              </Link>
            </Button>
          </section>
        )}

        {/* Active proposals */}
        <section className="space-y-3" aria-label="Propuestas activas">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <span>Propuestas activas</span>
            {!feedLoading && feed && (
              <span className="text-xs text-muted-foreground">({feed.activeProposals.length})</span>
            )}
          </h2>
          {feedLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : !feed || feed.activeProposals.length === 0 ? (
            !firstMovement && (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed p-4">
                No hay propuestas activas en este distrito todavía.
              </p>
            )
          ) : (
            <ul className="space-y-3">
              {feed.activeProposals.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link
                    to="/app/propuesta/$proposalId"
                    params={{ proposalId: p.id }}
                    className="block"
                  >
                    <Card className="hover:bg-accent/5 transition-colors">
                      <CardContent className="p-3 sm:p-4 space-y-1">
                        <p className="text-sm font-medium leading-tight line-clamp-2">{p.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {p.summary ?? p.description ?? "—"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                          <span>{p.district}</span>
                          <span aria-hidden>·</span>
                          <span>{p.category}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent missions */}
        <section className="space-y-3" aria-label="Misiones recientes">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <span>Misiones recientes</span>
            {!feedLoading && feed && (
              <span className="text-xs text-muted-foreground">({feed.recentMissions.length})</span>
            )}
          </h2>
          {feedLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !feed || feed.recentMissions.length === 0 ? (
            !firstMovement && (
              <p className="text-sm text-muted-foreground rounded-md border border-dashed p-4">
                Aún no hay misiones en este distrito.
              </p>
            )
          ) : (
            <ul className="space-y-3">
              {initiativeMissions.slice(0, 4).map((initiative) => {
                const raw = feed.recentMissions.find((m) => m.id === initiative.sourceId);
                return (
                  <li key={initiative.sourceId}>
                    <InitiativeCard
                      initiative={initiative}
                      xp={raw?.xp}
                      spotsLeft={raw?.spotsLeft}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Top supporters */}
        {topSupporters && topSupporters.length > 0 && (
          <Suspense
            fallback={
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-16 w-full" />
              </div>
            }
          >
            <DistrictTopSupporters supporters={topSupporters} />
          </Suspense>
        )}

        {/* Activity feed */}
        {territorialEvents.length > 0 && (
          <Suspense
            fallback={
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-20 w-full" />
              </div>
            }
          >
            <DistrictActivityFeed events={territorialEvents} currentUserId={currentUserId} />
          </Suspense>
        )}

        {/* District meta footer */}
        <footer className="text-xs text-muted-foreground pt-4 border-t border-border/40 flex items-center justify-between">
          <div>
            <p>
              Distrito en el catálogo KUSQA.
              {district.latitude !== null && district.longitude !== null && (
                <>
                  {" "}
                  Coordenadas: {district.latitude.toFixed(3)}, {district.longitude.toFixed(3)}.
                </>
              )}
            </p>
            {summary.lastActivityAt && (
              <p className="mt-1">Última actividad: {formatRelativeDate(summary.lastActivityAt)}.</p>
            )}
          </div>
          <Link
            to="/app/mapa"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline shrink-0"
          >
            <MapPin className="h-3 w-3" /> Ver en el mapa
          </Link>
        </footer>
      </main>
    </motion.div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: number; hint?: string | null }) {
  return (
    <div className="rounded-md border border-border/40 bg-card p-3 space-y-0.5">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-xl font-display font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="rounded-md border border-border/40 bg-card p-3 space-y-1">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-6 w-8" />
    </div>
  );
}
