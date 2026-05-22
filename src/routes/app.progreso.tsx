import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { CURRENT_USER, BADGES, LEVELS, REGION_META } from "@/data/kusqa";
import { Lock, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/progreso")({
  component: Progress,
});

function Progress() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-andes p-8 lg:p-12 text-white shadow-lift">
        <div className="absolute inset-0 bg-mesh opacity-40" />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-sun font-semibold">Mi expedición</div>
            <h1 className="font-display font-bold text-4xl lg:text-5xl mt-2 leading-tight">
              Guía del valle
            </h1>
            <p className="text-white/70 mt-3 max-w-lg">
              Estás cruzando el corazón de los Andes. A {(6500 - CURRENT_USER.xp).toLocaleString()} XP llegas a la altura del{" "}
              <span className="text-sun font-semibold">Explorador</span>.
            </p>
            <div className="mt-6 max-w-md">
              <div className="flex justify-between text-xs mb-1.5">
                <span>{CURRENT_USER.xp.toLocaleString()} XP</span>
                <span className="text-white/60">6,500 XP</span>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((CURRENT_USER.xp - 3500) / (6500 - 3500)) * 100}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="h-full bg-gradient-sunrise relative"
                >
                  <div className="absolute inset-0 shimmer" />
                </motion.div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { v: CURRENT_USER.rank, l: "Ranking" },
              { v: CURRENT_USER.streak, l: "Racha" },
              { v: BADGES.filter((b) => b.earned).length, l: "Insignias" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-white/10 backdrop-blur px-4 py-3 text-center min-w-[88px]">
                <div className="font-display font-bold text-2xl">{s.v}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/70">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey path */}
      <section>
        <h2 className="font-display font-bold text-2xl">Tu ruta por el Perú</h2>
        <p className="text-sm text-muted-foreground">Inspirada en el Qhapaq Ñan, cada nivel desbloquea un nuevo paisaje.</p>

        <div className="relative mt-8">
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 200" preserveAspectRatio="none">
            <path
              d="M 60 150 Q 200 30 350 130 T 650 70 T 940 140"
              stroke="oklch(0.85 0.05 80)"
              strokeWidth="2.5"
              strokeDasharray="5 8"
              fill="none"
            />
          </svg>
          <div className="relative grid grid-cols-3 md:grid-cols-7 gap-3">
            {LEVELS.map((l) => {
              const reached = CURRENT_USER.level >= l.level;
              const current = CURRENT_USER.level === l.level;
              const meta = REGION_META[l.region];
              return (
                <motion.div
                  key={l.level}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: l.level * 0.06 }}
                  className="relative flex flex-col items-center"
                >
                  <div
                    className={`aspect-square w-full max-w-[110px] rounded-2xl grid place-items-center text-3xl shadow-card relative ${
                      current
                        ? "bg-gradient-sunrise text-white shadow-glow ring-4 ring-accent/30"
                        : reached
                          ? `${meta.gradient} text-white`
                          : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {reached ? (l.level === 1 ? "🚶" : l.level === 2 ? "🏘️" : l.level === 3 ? "🌱" : l.level === 4 ? "⛰️" : l.level === 5 ? "🧭" : l.level === 6 ? "🛶" : "🏆") : <Lock className="h-5 w-5" />}
                    {current && <span className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse-ring" />}
                  </div>
                  <div className="mt-3 text-center">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Nivel {l.level}</div>
                    <div className={`font-semibold text-sm ${current ? "text-accent" : ""}`}>{l.name}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Badges */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-2xl">Insignias</h2>
            <p className="text-sm text-muted-foreground">Cada gesto deja huella en tu colección.</p>
          </div>
          <div className="text-sm font-semibold text-muted-foreground">
            {BADGES.filter((b) => b.earned).length} de {BADGES.length}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BADGES.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-2xl p-5 text-center transition-smooth ${
                b.earned
                  ? "bg-card border border-border/60 shadow-soft hover:shadow-card hover:-translate-y-1"
                  : "bg-secondary/40 border border-dashed border-border"
              }`}
            >
              <div className={`text-5xl ${b.earned ? "" : "grayscale opacity-40"}`}>{b.emoji}</div>
              <div className={`mt-3 font-display font-semibold ${b.earned ? "" : "text-muted-foreground"}`}>
                {b.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{b.description}</div>
              {b.earned && (
                <div className="mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-accent">
                  <Sparkles className="h-3 w-3" /> Desbloqueada
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="rounded-2xl bg-card border border-border/60 p-6 shadow-soft">
        <h2 className="font-display font-bold text-2xl mb-4">Ranking del mes · Barranco</h2>
        <div className="divide-y divide-border/60">
          {[
            { p: 1, n: "Sayri Ccama", d: "Cusco", xp: 6420, e: "🌱" },
            { p: 2, n: "Joaquín Ríos", d: "Iquitos", xp: 5980, e: "🛶" },
            { p: 3, n: "Lucía Herrera", d: "Trujillo", xp: 5310, e: "💻" },
            { p: 127, n: CURRENT_USER.name, d: CURRENT_USER.district, xp: CURRENT_USER.xp, e: CURRENT_USER.avatar, me: true },
          ].map((u) => (
            <div key={u.p} className={`flex items-center gap-4 py-3 ${u.me ? "bg-gradient-sunrise/10 -mx-3 px-3 rounded-xl" : ""}`}>
              <div className={`w-8 text-center font-display font-bold ${u.p <= 3 ? "text-accent" : "text-muted-foreground"}`}>
                {u.p <= 3 ? ["🥇", "🥈", "🥉"][u.p - 1] : `#${u.p}`}
              </div>
              <div className="h-10 w-10 rounded-xl bg-secondary grid place-items-center text-lg">{u.e}</div>
              <div className="flex-1">
                <div className="font-semibold text-sm">{u.n} {u.me && <span className="text-accent">(tú)</span>}</div>
                <div className="text-xs text-muted-foreground">{u.d}</div>
              </div>
              <div className="font-display font-bold">{u.xp.toLocaleString()} XP</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
