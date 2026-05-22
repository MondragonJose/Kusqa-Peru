import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MapPin, Calendar, Users, Trophy, ArrowLeft, Share2, Heart } from "lucide-react";
import { MISSIONS, REGION_META } from "@/data/kusqa";

export const Route = createFileRoute("/app/mision/$missionId")({
  component: MissionDetail,
});

function MissionDetail() {
  const { missionId } = useParams({ from: "/app/mision/$missionId" });
  const m = MISSIONS.find((x) => x.id === missionId) ?? MISSIONS[0];
  const meta = REGION_META[m.region];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Link to="/app/mapa" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Volver al mapa
      </Link>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-3xl ${meta.gradient} text-white p-8 lg:p-12 shadow-lift`}
      >
        <div className="absolute inset-0 bg-mesh opacity-30" />
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-float-slow" />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-6 items-end">
          <div>
            <div className="text-7xl">{m.emoji}</div>
            <div className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-widest font-bold bg-white/15 backdrop-blur px-3 py-1 rounded-full">
              {meta.name} · {m.category}
            </div>
            <h1 className="font-display font-bold text-4xl lg:text-6xl mt-3 leading-[1.05]">
              {m.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm opacity-90">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {m.district}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {m.date}</span>
              <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4" /> {m.participants} unidos</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur grid place-items-center hover:bg-white/25 transition-smooth">
              <Heart className="h-5 w-5" />
            </button>
            <button className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur grid place-items-center hover:bg-white/25 transition-smooth">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Main */}
        <div className="space-y-6">
          <section className="rounded-2xl bg-card border border-border/60 p-6">
            <h2 className="font-display font-bold text-xl">La misión</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">{m.description}</p>
          </section>

          <section className="rounded-2xl bg-card border border-border/60 p-6">
            <h2 className="font-display font-bold text-xl mb-4">Qué vas a vivir</h2>
            <div className="space-y-3">
              {[
                { t: "7:00 · Punto de encuentro", b: "Reunión y desayuno comunitario." },
                { t: "8:00 · Taller previo", b: "Conversamos con artistas locales sobre identidad y mural." },
                { t: "9:00 · Manos a la obra", b: "Trabajamos en equipo en el mural de 24m²." },
                { t: "14:00 · Cierre", b: "Almuerzo compartido, fotos y entrega de XP." },
              ].map((s, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-gradient-sunrise text-white grid place-items-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    {i < 3 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="font-semibold text-sm">{s.t}</div>
                    <div className="text-sm text-muted-foreground">{s.b}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-card border border-border/60 p-6">
            <h2 className="font-display font-bold text-xl mb-4">Equipo unido ({m.participants})</h2>
            <div className="flex flex-wrap gap-2">
              {["🦙", "🌵", "🦅", "🐟", "🌺", "🌽", "☕", "🪕", "🌞", "⚽"].map((e, i) => (
                <div key={i} className="h-11 w-11 rounded-xl bg-secondary grid place-items-center text-lg hover:scale-110 transition-smooth">
                  {e}
                </div>
              ))}
              <div className="h-11 px-4 rounded-xl bg-secondary grid place-items-center text-sm font-semibold text-muted-foreground">
                +{m.participants - 10}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl bg-card border border-border/60 p-6 shadow-soft sticky top-24">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Recompensas</div>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-gradient-sunrise grid place-items-center text-2xl shadow-glow">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="font-display font-bold text-2xl">+{m.xp} XP</div>
                <div className="text-xs text-muted-foreground">Insignia: Vecino activo</div>
              </div>
            </div>

            <div className="my-5 h-px bg-border" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Dificultad</span><span className="font-semibold">{m.difficulty}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Cupos restantes</span><span className="font-semibold text-accent">{m.spotsLeft}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Organiza</span><span className="font-semibold">{m.organizer.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Impacto</span><span className="font-semibold text-right">{m.impact}</span></div>
            </div>

            <button className="mt-5 w-full inline-flex justify-center items-center rounded-xl bg-gradient-sunrise text-white px-4 py-3.5 font-semibold shadow-glow hover:scale-[1.02] transition-smooth">
              Unirme a la misión
            </button>
            <button className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:bg-secondary transition-smooth">
              Invitar amigos
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
