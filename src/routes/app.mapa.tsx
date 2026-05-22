import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Filter, Layers } from "lucide-react";
import { MISSIONS, REGION_META, type Region } from "@/data/kusqa";

export const Route = createFileRoute("/app/mapa")({
  component: MapPage,
});

function MapPage() {
  const [region, setRegion] = useState<Region | "todas">("todas");
  const [selected, setSelected] = useState(MISSIONS[0].id);

  const filtered = region === "todas" ? MISSIONS : MISSIONS.filter((m) => m.region === region);
  const sel = MISSIONS.find((m) => m.id === selected)!;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display font-bold text-3xl">Mapa de misiones</h1>
          <p className="text-sm text-muted-foreground">
            Misiones brillando en tiempo real por todo el Perú.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["todas", "costa", "sierra", "selva"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRegion(r)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-smooth ${
                region === r
                  ? "bg-foreground text-background border-foreground"
                  : "bg-surface border-border hover:bg-secondary"
              }`}
            >
              {r === "todas" ? "Todo el Perú" : REGION_META[r].name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-5">
        {/* Map */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-andes aspect-[4/5] lg:aspect-auto lg:min-h-[640px] shadow-lift">
          <div className="absolute inset-0 bg-mesh opacity-50" />
          {/* Stylized Peru shape (abstract blob) */}
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="land" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0" stopColor="oklch(0.78 0.12 80 / 0.25)" />
                <stop offset="1" stopColor="oklch(0.62 0.16 155 / 0.2)" />
              </linearGradient>
            </defs>
            <path
              d="M 12,18 Q 28,8 38,24 Q 45,18 58,28 Q 72,22 82,38 Q 92,52 80,72 Q 70,88 50,90 Q 30,92 22,76 Q 8,62 12,46 Z"
              fill="url(#land)"
              stroke="oklch(1 0 0 / 0.25)"
              strokeWidth="0.3"
            />
            {/* Andean route lines */}
            <path
              d="M 18,72 Q 35,55 50,52 Q 65,50 78,32"
              stroke="oklch(0.78 0.17 75 / 0.6)"
              strokeWidth="0.4"
              strokeDasharray="1.2 1.5"
              fill="none"
            />
          </svg>

          {/* Mission pins */}
          {filtered.map((m, i) => {
            const meta = REGION_META[m.region];
            const isSel = selected === m.id;
            return (
              <motion.button
                key={m.id}
                onClick={() => setSelected(m.id)}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, type: "spring" }}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${m.coords.x}%`, top: `${m.coords.y}%` }}
              >
                <span className={`absolute inset-0 rounded-full ${meta.gradient} animate-pulse-ring`} />
                <span
                  className={`relative grid place-items-center rounded-full ${meta.gradient} text-white shadow-glow border-2 border-white/80 transition-smooth ${
                    isSel ? "h-14 w-14 text-2xl ring-4 ring-white/40" : "h-10 w-10 text-lg hover:scale-110"
                  }`}
                >
                  {m.emoji}
                </span>
              </motion.button>
            );
          })}

          {/* Floating legend */}
          <div className="absolute top-4 left-4 glass-strong rounded-xl p-3 text-xs space-y-1.5">
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Capas
            </div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-coast" /> Costa</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sierra" /> Sierra</div>
            <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-jungle" /> Selva</div>
          </div>

          <div className="absolute bottom-4 right-4 glass-strong rounded-xl px-3 py-2 text-xs font-semibold text-foreground flex items-center gap-2">
            <Filter className="h-3.5 w-3.5" />
            {filtered.length} misiones activas
          </div>
        </div>

        {/* Selected detail panel */}
        <motion.div
          key={sel.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-3xl bg-card border border-border/60 overflow-hidden shadow-card flex flex-col"
        >
          <div className={`${REGION_META[sel.region].gradient} p-6 text-white relative`}>
            <div className="absolute inset-0 bg-mesh opacity-30" />
            <div className="relative">
              <div className="text-5xl">{sel.emoji}</div>
              <div className="mt-3 text-[10px] uppercase tracking-widest font-bold opacity-90">
                {REGION_META[sel.region].name} · {sel.category}
              </div>
              <div className="font-display font-bold text-2xl mt-1 leading-tight">{sel.title}</div>
              <div className="text-sm opacity-90 mt-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {sel.district}
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4 flex-1">
            <p className="text-sm text-muted-foreground leading-relaxed">{sel.description}</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "XP", v: `+${sel.xp}` },
                { l: "Cupos", v: sel.spotsLeft },
                { l: "Nivel", v: sel.difficulty },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-secondary p-3 text-center">
                  <div className="font-display font-bold">{s.v}</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-secondary/60 p-3 text-xs">
              <div className="text-muted-foreground">Impacto esperado</div>
              <div className="font-semibold text-foreground mt-0.5">{sel.impact}</div>
            </div>
          </div>
          <div className="p-4 border-t border-border/60 flex gap-2">
            <Link
              to="/app/mision/$missionId"
              params={{ missionId: sel.id }}
              className="flex-1 inline-flex justify-center items-center rounded-xl bg-gradient-sunrise text-white px-4 py-3 font-semibold shadow-soft hover:scale-[1.02] transition-smooth"
            >
              Unirme a la misión
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
