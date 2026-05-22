import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MapPin, Flame, TrendingUp, Sparkles, ArrowRight, Users } from "lucide-react";
import { MISSIONS, CURRENT_USER, REGION_META } from "@/data/kusqa";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const featured = MISSIONS.slice(0, 3);
  const nearby = MISSIONS.filter((m) => m.region === "costa");

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Welcome hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-sunrise text-white p-7 lg:p-10 shadow-lift">
        <div className="absolute inset-0 bg-mesh opacity-30" />
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-end">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/80">
              Buenos días, {CURRENT_USER.name.split(" ")[0]}
            </div>
            <h1 className="font-display font-bold text-3xl lg:text-5xl mt-2 leading-tight">
              Tu cuadra te espera hoy. <br />
              <span className="text-white/80">3 misiones nuevas en Barranco.</span>
            </h1>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/app/mapa" className="inline-flex items-center gap-2 rounded-xl bg-white text-foreground px-5 py-2.5 text-sm font-semibold hover:scale-[1.02] transition-smooth">
                Explorar mapa <MapPin className="h-4 w-4" />
              </Link>
              <Link to="/app/crear" className="inline-flex items-center gap-2 rounded-xl bg-white/15 backdrop-blur border border-white/30 px-5 py-2.5 text-sm font-semibold hover:bg-white/25 transition-smooth">
                Crear proyecto
              </Link>
            </div>
          </div>
          <div className="flex gap-5 text-center">
            {[
              { v: CURRENT_USER.streak, l: "racha", icon: "🔥" },
              { v: CURRENT_USER.missionsDone, l: "misiones", icon: "🗺️" },
              { v: CURRENT_USER.hours, l: "horas", icon: "⏱️" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-white/15 backdrop-blur px-4 py-3 min-w-[88px]">
                <div className="text-2xl">{s.icon}</div>
                <div className="font-display font-bold text-xl mt-1">{s.v}</div>
                <div className="text-[10px] uppercase tracking-widest text-white/80">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured missions */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="font-display font-bold text-2xl">Misiones recomendadas</h2>
            <p className="text-sm text-muted-foreground">Basadas en tu distrito y tu expedición.</p>
          </div>
          <Link to="/app/mapa" className="text-sm text-accent font-semibold hover:underline inline-flex items-center gap-1">
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {featured.map((m, i) => {
            const meta = REGION_META[m.region];
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  to="/app/mision/$missionId"
                  params={{ missionId: m.id }}
                  className="group block rounded-2xl bg-card border border-border/60 overflow-hidden hover:shadow-lift hover:-translate-y-1 transition-smooth"
                >
                  <div className={`h-32 ${meta.gradient} relative grid place-items-center text-5xl`}>
                    <span>{m.emoji}</span>
                    <span className="absolute top-3 left-3 text-[10px] uppercase tracking-widest font-bold text-white/90 bg-black/20 backdrop-blur px-2 py-1 rounded-full">
                      {meta.name}
                    </span>
                    <span className="absolute top-3 right-3 text-xs font-bold text-white bg-black/30 backdrop-blur px-2 py-1 rounded-full">
                      +{m.xp} XP
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {m.district}
                    </div>
                    <div className="font-display font-semibold text-lg mt-1 group-hover:text-accent transition-colors">
                      {m.title}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground inline-flex items-center gap-1">
                        <Users className="h-3 w-3" /> {m.participants} unidos
                      </span>
                      <span className="font-semibold text-accent">{m.spotsLeft} cupos</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Two columns: progress + community */}
      <section className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 rounded-2xl glass p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Tu expedición</div>
              <div className="font-display font-bold text-xl mt-1">Guía del valle</div>
              <div className="text-sm text-muted-foreground">Nivel {CURRENT_USER.level} · próximo: Explorador</div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-gradient-andes grid place-items-center text-2xl shadow-glow">⛰️</div>
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{CURRENT_USER.xp.toLocaleString()} XP</span>
              <span>6,500 XP</span>
            </div>
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((CURRENT_USER.xp - 3500) / (6500 - 3500)) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-gradient-sunrise relative"
              >
                <div className="absolute inset-0 shimmer" />
              </motion.div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Te faltan <span className="font-semibold text-foreground">2,220 XP</span> para subir de nivel.
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { l: "Personas", v: CURRENT_USER.peopleImpacted, i: "❤️" },
              { l: "Distritos", v: 6, i: "📍" },
              { l: "Aliados", v: 8, i: "🤝" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-secondary p-3 text-center">
                <div>{s.i}</div>
                <div className="font-display font-bold mt-1">{s.v}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border/60 p-6 shadow-soft">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-4 w-4 text-accent" />
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Reto semanal</div>
          </div>
          <div className="font-display font-bold text-xl">Barranco vs Miraflores</div>
          <p className="text-sm text-muted-foreground mt-1">Quien acumule más horas comunitarias gana el cetro del distrito.</p>
          <div className="mt-5 space-y-3">
            {[
              { name: "Barranco", v: 1240, color: "bg-gradient-sunrise" },
              { name: "Miraflores", v: 980, color: "bg-gradient-andes" },
            ].map((d) => (
              <div key={d.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold">{d.name}</span>
                  <span className="text-muted-foreground">{d.v}h</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full ${d.color}`} style={{ width: `${(d.v / 1500) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Activity feed */}
      <section>
        <h2 className="font-display font-bold text-2xl mb-4">En tu comunidad</h2>
        <div className="rounded-2xl bg-card border border-border/60 divide-y divide-border/60">
          {[
            { who: "Sayri completó", what: "Reforestación en el valle sagrado", emoji: "🌱", time: "hace 1h" },
            { who: "Joaquín se unió a", what: "Clases de código para escolares", emoji: "💻", time: "hace 3h" },
            { who: "Lucía desbloqueó", what: "Insignia Mentor", emoji: "🎓", time: "hace 5h" },
            { who: "Camila publicó", what: "Tardes con nuestros mayores", emoji: "🌼", time: "ayer" },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-4 p-4 hover:bg-secondary/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-secondary grid place-items-center text-lg">{a.emoji}</div>
              <div className="flex-1">
                <div className="text-sm">
                  <span className="font-semibold">{a.who}</span>{" "}
                  <span className="text-muted-foreground">{a.what}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.time}</div>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
      </section>

      {/* Nearby */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-accent" />
          <h2 className="font-display font-bold text-2xl">Cerca de ti</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x">
          {nearby.map((m) => (
            <Link
              key={m.id}
              to="/app/mision/$missionId"
              params={{ missionId: m.id }}
              className="snap-start shrink-0 w-72 rounded-2xl bg-card border border-border/60 p-5 hover:shadow-card transition-smooth"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-coast grid place-items-center text-2xl">
                  {m.emoji}
                </div>
                <div>
                  <div className="font-semibold">{m.title}</div>
                  <div className="text-xs text-muted-foreground">{m.distanceKm} km · {m.date}</div>
                </div>
              </div>
              <div className="mt-3 text-xs px-2 py-1 rounded-full bg-secondary inline-block font-medium">
                +{m.xp} XP · {m.spotsLeft} cupos
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
