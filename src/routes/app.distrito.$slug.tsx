import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ArrowLeft, MapPin, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { REGION_META } from "@/constants/gamification";
import {
  useDistrict,
  useDistrictActivity,
  useDistrictFeed,
  useDistrictStats,
  useDistrictTopSupporters,
} from "@/features/districts/hooks";
import {
  classifyDistrictActivity,
  DISTRICT_ACTIVITY_COPY,
  formatTerritorialImpact,
  isFirstMovementNeeded,
} from "@/domain/territoryAggregations";
import { useCurrentUserId } from "@/features/auth";
import { PublicMissionCard } from "@/features/missions/components/PublicMissionCard";
import { missionToEntity } from "@/services/entityAdapter";
import { formatRelativeDate } from "@/utils/date";

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
  const { data: stats, isLoading: statsLoading } = useDistrictStats(district?.id ?? "");
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

  const regionMeta = REGION_META[district.region];
  const summary = stats ?? {
    missionCount: 0,
    upcomingMissionCount: 0,
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background pb-16"
    >
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border/40">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 sm:px-6 h-12">
          <Link
            to="/app"
            aria-label="Volver al inicio"
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold text-muted-foreground truncate">Distrito</span>
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

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Civic narrative / state */}
        <section
          className="rounded-lg border border-border/40 bg-card/40 p-4 sm:p-5"
          aria-label="Memoria cívica"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-sm leading-relaxed text-foreground/90">{activityCopy.description}</p>
          </div>
        </section>

        {/* Stats grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Resumen territorial">
          {statsLoading ? (
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
                  summary.upcomingMissionCount > 0
                    ? `${summary.upcomingMissionCount} próximas`
                    : null
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
              {feed.recentMissions.slice(0, 4).map((m) => (
                <li key={m.id}>
                  <PublicMissionCard entity={missionToEntity(m)} />
                </li>
              ))}
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
        {activity && activity.length > 0 && (
          <Suspense
            fallback={
              <div className="space-y-2" aria-busy="true">
                <Skeleton className="h-20 w-full" />
              </div>
            }
          >
            <DistrictActivityFeed activities={activity} currentUserId={currentUserId} />
          </Suspense>
        )}

        {/* District meta footer */}
        <footer className="text-xs text-muted-foreground pt-4 border-t border-border/40">
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
