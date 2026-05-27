import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/features/auth";
import { CivicRouteMap, useProgression } from "@/features/progression";
import { BadgeGrid, CIVIC_BADGES } from "@/features/badges";
import { DistrictLeaderboard } from "@/features/community";
import { Award, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/app/progreso")({
  component: Progress,
});

function Progress() {
  const user = useCurrentUser();
  const { currentStage, nextStage, progressPct, xpToNextStage } = useProgression();
  const earnedBadgesCount = CIVIC_BADGES.filter((b) => b.earned).length;

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-andes p-8 lg:p-12 text-white shadow-lift">
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
                  Te faltan <strong className="text-sun font-bold">{xpToNextStage.toLocaleString()} XP</strong> para llegar a <strong className="text-white font-bold">{nextStage.name}</strong> ({nextStage.region === "cumbre" ? "Cima Nacional" : `Región ${nextStage.region.charAt(0).toUpperCase() + nextStage.region.slice(1)}`}).
                </span>
              )}
            </p>
            
            {/* Progress bar */}
            <div className="mt-8 max-w-md">
              <div className="flex justify-between text-xs font-semibold mb-2">
                <span>{user.xp.toLocaleString()} XP acumulados</span>
                <span className="text-white/70">{nextStage ? `${nextStage.xpFrom.toLocaleString()} XP` : "Máximo alcanzado"}</span>
              </div>
              <div className="h-3 rounded-full bg-white/15 overflow-hidden border border-white/5 p-[1px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-gradient-sunrise rounded-full relative"
                >
                  <div className="absolute inset-0 shimmer" />
                </motion.div>
              </div>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { v: `#${user.rank}`, l: "Ranking" },
              { v: `${user.streak}d`, l: "Racha" },
              { v: earnedBadgesCount, l: "Insignias" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-white/10 backdrop-blur-md px-4 py-4 text-center min-w-[94px] border border-white/10 shadow-sm">
                <div className="font-display font-black text-2xl tracking-tight text-white">{s.v}</div>
                <div className="text-[9px] uppercase tracking-widest text-white/70 font-semibold mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey Map Section */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display font-black text-2xl tracking-tight text-foreground">Tu Ruta por el Perú</h2>
          <p className="text-sm text-muted-foreground">Inspirada en el Qhapaq Ñan y el espíritu de servicio colectivo.</p>
        </div>
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm overflow-hidden relative">
          <CivicRouteMap userXp={user.xp} />
        </div>
      </section>

      {/* Badges Section */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display font-black text-2xl tracking-tight text-foreground flex items-center gap-2">
              <Award className="h-6 w-6 text-accent animate-pulse" /> Colección de Insignias
            </h2>
            <p className="text-sm text-muted-foreground">Cada acción cívica deja una marca de identidad en tu historia.</p>
          </div>
        </div>
        <div className="bg-card border border-border/80 rounded-3xl p-6 shadow-sm">
          <BadgeGrid badges={CIVIC_BADGES} />
        </div>
      </section>

      {/* Territorial Competition Leaderboard */}
      <section className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
        <div className="space-y-4">
          <h2 className="font-display font-black text-2xl tracking-tight text-foreground">Expediciones Activas</h2>
          <p className="text-sm text-muted-foreground">
            Únete a otros jóvenes de tu región. La racha colectiva de tu distrito te impulsa a seguir sumando XP e impacto real.
          </p>
          
          <div className="rounded-3xl border border-dashed border-border p-8 text-center bg-muted/20">
            <div className="h-12 w-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-base text-foreground mb-1">¿Listo para expandir tu huella?</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              El distrito de <strong className="text-primary">{user.district}</strong> necesita líderes como tú. Explora el mapa de misiones cercanas y suma horas.
            </p>
            <Link to="/app/mapa" className="inline-block bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-2 rounded-xl text-xs shadow-sm hover:shadow transition-all duration-300">
              Ver Misiones en el Mapa
            </Link>
          </div>
        </div>
        
        <div>
          <DistrictLeaderboard sortBy="hours" />
        </div>
      </section>
    </div>
  );
}
