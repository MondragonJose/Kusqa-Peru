import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUser } from "@/features/auth";
import { CivicRouteMap, useProgression } from "@/features/progression";
import { BadgeGrid, CIVIC_BADGES, type CivicBadge } from "@/features/badges";
import { TrendingUp } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useProfileMissionTimeline } from "@/features/auth/hooks/useUserMissions";

export const Route = createFileRoute("/app/progreso")({
  component: Progress,
});

function Progress() {
  const user = useCurrentUser();
  const { currentStage, nextStage, xpToNextStage } = useProgression();
  const { data: timeline } = useProfileMissionTimeline();
  const completedMissions = timeline?.missions ?? [];

  // Derive badge earning from real participation
  const activeRegions = Array.from(new Set(completedMissions.map((m) => m.region)));
  const earnedBadgeIds = new Set<string>();
  if (completedMissions.length >= 1) earnedBadgeIds.add("primer-paso");
  if (activeRegions.includes("sierra")) earnedBadgeIds.add("explorador-andino");
  if (activeRegions.includes("costa")) earnedBadgeIds.add("hijo-del-pacifico");
  if (activeRegions.includes("selva")) earnedBadgeIds.add("navegante");
  if (
    activeRegions.includes("sierra") &&
    activeRegions.includes("costa") &&
    activeRegions.includes("selva")
  ) {
    earnedBadgeIds.add("tejedor");
  }
  const badges: CivicBadge[] = CIVIC_BADGES.map((b) => ({
    ...b,
    earned: earnedBadgeIds.has(b.id),
  }));
  const earnedBadgesCount = badges.filter((b) => b.earned).length;

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-secondary p-8 lg:p-12 text-white shadow-sm">
        <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-xs uppercase tracking-widest text-sun font-bold border border-white/10">
              <TrendingUp className="h-3 w-3" /> Mi expedición cívica
            </div>
            <h1 className="font-display font-black text-4xl lg:text-5xl mt-4 leading-none tracking-tight">
              {currentStage.name}
            </h1>
            <p className="text-white/85 mt-3 max-w-lg text-sm lg:text-base leading-relaxed">
              {currentStage.narrative}
              {nextStage && (
                <span className="block mt-3 text-white/70 text-xs bg-black/10 backdrop-blur-sm px-3.5 py-2.5 rounded-xl border border-white/5 max-w-md">
                  Te faltan{" "}
                  <strong className="text-sun font-bold">
                    {xpToNextStage.toLocaleString()} XP
                  </strong>{" "}
                  para llegar a <strong className="text-white font-bold">{nextStage.name}</strong> (
                  {nextStage.region === "cumbre"
                    ? "Cima Nacional"
                    : `Región ${nextStage.region.charAt(0).toUpperCase() + nextStage.region.slice(1)}`}
                  ).
                </span>
              )}
            </p>

            {/* Progress bar */}
            {/* P0 FIX: Eliminada sección de XP - sistema de gamificación eliminado */}
          </div>

          {/* Stats de participación - sin ranking ni racha */}
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur-md px-4 py-4 text-center min-w-[94px] border border-white/10 shadow-sm">
              <div className="font-display font-black text-2xl tracking-tight text-white">
                {earnedBadgesCount}
              </div>
              <div className="text-[9px] uppercase tracking-widest text-white/70 font-semibold mt-1">
                Insignias
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline territorial - visualización de progreso geográfico */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display font-black text-2xl tracking-tight text-foreground">
            Tu recorrido territorial
          </h2>
          <p className="text-sm text-muted-foreground">
            Historial visual de tu participación por regiones.
          </p>
        </div>
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm overflow-hidden relative">
          <CivicRouteMap userXp={user.xp} />
        </div>
      </section>

      {/* Badges - insignias verificables de participación real */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display font-black text-2xl tracking-tight text-foreground">
            Insignias de participación
          </h2>
          <p className="text-sm text-muted-foreground">Reconocimiento por misiones completadas.</p>
        </div>
        <BadgeGrid badges={badges} />
      </section>
      <section className="space-y-4">
        <div className="space-y-4">
          <h2 className="font-display font-black text-2xl tracking-tight text-foreground">
            Misiones
          </h2>
          <p className="text-sm text-muted-foreground">
            Explora el mapa para encontrar misiones activas.
          </p>

          <div className="rounded-3xl border border-dashed border-border p-8 text-center bg-muted/20">
            <div className="text-4xl mb-3">🗺️</div>
            <p className="text-sm text-muted-foreground font-medium">
              Explora el mapa para encontrar misiones activas
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Tu recorrido territorial puede comenzar aquí.
            </p>
            <Link
              to="/app/mapa"
              className="inline-block bg-gradient-sunrise hover:scale-[1.02] text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-glow transition-all duration-300"
            >
              Ir al mapa
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
