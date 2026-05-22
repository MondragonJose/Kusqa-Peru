import { createFileRoute } from "@tanstack/react-router";
import { CURRENT_USER, BADGES, MISSIONS, REGION_META } from "@/data/kusqa";
import { motion } from "framer-motion";
import { MapPin, Sparkles, Pencil, Heart, Users } from "lucide-react";

export const Route = createFileRoute("/app/perfil")({
  component: Profile,
});

const THEMES = [
  { id: "costa", label: "Costa", gradient: "bg-gradient-coast", emoji: "🌊" },
  { id: "sierra", label: "Sierra", gradient: "bg-gradient-andes", emoji: "⛰️" },
  { id: "selva", label: "Selva", gradient: "bg-gradient-jungle", emoji: "🌿" },
];

function Profile() {
  const recent = MISSIONS.slice(0, 4);
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Cover */}
      <section className="relative rounded-3xl overflow-hidden shadow-lift">
        <div className="h-48 lg:h-60 bg-gradient-coast relative">
          <div className="absolute inset-0 bg-mesh opacity-40" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,oklch(1_0_0/0.3),transparent)]" />
          <button className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-xl glass-strong px-3 py-2 text-xs font-semibold hover:scale-[1.02] transition-smooth">
            <Pencil className="h-3.5 w-3.5" /> Editar fondo
          </button>
        </div>
        <div className="bg-card border-t border-border/60 px-6 lg:px-10 pb-6 pt-0 relative">
          <div className="flex flex-wrap gap-4 items-end -mt-12">
            <div className="h-24 w-24 rounded-3xl bg-gradient-sunrise grid place-items-center text-5xl shadow-lift border-4 border-card">
              {CURRENT_USER.avatar}
            </div>
            <div className="flex-1 min-w-[200px] pb-1">
              <h1 className="font-display font-bold text-3xl">{CURRENT_USER.name}</h1>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
                <span>{CURRENT_USER.handle}</span>
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {CURRENT_USER.district}</span>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <button className="rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary transition-smooth">
                Compartir
              </button>
              <button className="rounded-xl bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-90 transition-smooth">
                Editar perfil
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { l: "XP total", v: CURRENT_USER.xp.toLocaleString(), i: "✨" },
              { l: "Misiones", v: CURRENT_USER.missionsDone, i: "🗺️" },
              { l: "Personas alcanzadas", v: CURRENT_USER.peopleImpacted, i: "❤️" },
              { l: "Horas comunidad", v: CURRENT_USER.hours, i: "⏱️" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-secondary p-4">
                <div className="text-xl">{s.i}</div>
                <div className="font-display font-bold text-2xl mt-1">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Identity */}
      <section className="rounded-2xl bg-card border border-border/60 p-6 shadow-soft">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-accent" />
          <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Tu identidad</div>
        </div>
        <h2 className="font-display font-bold text-xl">¿Qué paisaje te representa?</h2>
        <p className="text-sm text-muted-foreground">Personaliza tu fondo, color y avatar según tu región.</p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`relative aspect-[4/3] rounded-2xl ${t.gradient} text-white p-4 overflow-hidden hover:scale-[1.02] transition-smooth ${
                t.id === CURRENT_USER.region ? "ring-4 ring-accent" : "opacity-90"
              }`}
            >
              <div className="text-3xl">{t.emoji}</div>
              <div className="absolute bottom-3 left-4 font-display font-semibold">{t.label}</div>
              {t.id === CURRENT_USER.region && (
                <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur px-2 py-0.5 text-[10px] font-bold">
                  Activo
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Recent missions */}
      <section>
        <h2 className="font-display font-bold text-2xl mb-4">Misiones recientes</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {recent.map((m, i) => {
            const meta = REGION_META[m.region];
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-card border border-border/60 p-5 flex gap-4 hover:shadow-card transition-smooth"
              >
                <div className={`h-16 w-16 rounded-2xl ${meta.gradient} grid place-items-center text-2xl shrink-0`}>
                  {m.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{m.title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{m.district} · {m.date}</div>
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {m.impact.split(" ").slice(0, 2).join(" ")}</span>
                    <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {m.participants}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-muted-foreground">XP</div>
                  <div className="font-display font-bold text-accent">+{m.xp}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Badges preview */}
      <section className="rounded-2xl bg-card border border-border/60 p-6">
        <h2 className="font-display font-bold text-xl mb-4">Insignias desbloqueadas</h2>
        <div className="flex flex-wrap gap-3">
          {BADGES.filter((b) => b.earned).map((b) => (
            <div key={b.id} className="rounded-2xl bg-secondary px-3 py-2 flex items-center gap-2 text-sm">
              <span className="text-xl">{b.emoji}</span>
              <span className="font-semibold">{b.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
