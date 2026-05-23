import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Sparkles, MapPin, Users, Camera, Tag } from "lucide-react";
import { getPlaceSuggestions, type PlaceSuggestion } from "@/services/googleMaps";

export const Route = createFileRoute("/app/crear")({
  component: CreateProject,
});

const STEPS = [
  { n: 1, name: "Idea", icon: Sparkles },
  { n: 2, name: "Lugar", icon: MapPin },
  { n: 3, name: "Equipo", icon: Users },
  { n: 4, name: "Detalles", icon: Tag },
  { n: 5, name: "Listo", icon: Check },
];

const CATS = ["Medio ambiente", "Educación", "Arte & cultura", "Comunidad", "Salud", "Tecnología"];

function CreateProject() {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState("Medio ambiente");
  const [district, setDistrict] = useState("Barranco, Lima");
  const [region, setRegion] = useState<"costa" | "sierra" | "selva">("costa");
  const [team, setTeam] = useState(15);
  
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);

  // Autocomplete fetch effect
  useEffect(() => {
    let isMounted = true;
    const query = district.split(",")[0].trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      const results = await getPlaceSuggestions(query);
      if (isMounted) {
        setSuggestions(results);
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(delayDebounce);
    };
  }, [district]);

  // Click outside autocomplete dropdown list
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteContainerRef.current && !autocompleteContainerRef.current.contains(event.target as Node)) {
        setSuggestions([]);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl">Crea tu misión</h1>
          <p className="text-sm text-muted-foreground">Lidera un proyecto que mueva a tu cuadra.</p>
        </div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
          Paso {step} / {STEPS.length}
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} className="flex items-center gap-2 flex-1">
              <div
                className={`h-9 w-9 rounded-xl grid place-items-center text-sm font-bold transition-smooth shrink-0 ${
                  done
                    ? "bg-jungle text-white"
                    : active
                      ? "bg-gradient-sunrise text-white shadow-glow"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-1 flex-1 rounded-full ${done ? "bg-jungle" : "bg-secondary"}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl bg-card border border-border/60 shadow-card p-7 lg:p-10 min-h-[440px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {step === 1 && (
              <div>
                <div className="text-xs uppercase tracking-widest text-accent font-semibold">Paso 1</div>
                <h2 className="font-display font-bold text-3xl mt-2">¿Cuál es tu idea?</h2>
                <p className="text-muted-foreground mt-2">En una frase, qué quieres lograr con tu comunidad.</p>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Convertir el parque en una biblioteca al aire libre"
                  className="mt-6 w-full rounded-2xl border border-border bg-surface px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50"
                />
                <div className="mt-6">
                  <div className="text-sm font-semibold mb-3">Elige una categoría</div>
                  <div className="flex flex-wrap gap-2">
                    {CATS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCat(c)}
                        className={`px-4 py-2 rounded-full text-sm border transition-smooth ${
                          cat === c
                            ? "bg-foreground text-background border-foreground"
                            : "bg-surface border-border hover:bg-secondary"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <div className="text-xs uppercase tracking-widest text-accent font-semibold">Paso 2</div>
                <h2 className="font-display font-bold text-3xl mt-2">¿Dónde ocurrirá?</h2>
                <p className="text-muted-foreground mt-2">Tu misión aparecerá brillando en el mapa de la región.</p>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  {(["costa", "sierra", "selva"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRegion(r)}
                      className={`relative aspect-[3/4] rounded-2xl text-white p-5 overflow-hidden transition-smooth ${
                        r === "costa" ? "bg-gradient-coast" : r === "sierra" ? "bg-gradient-andes" : "bg-gradient-jungle"
                      } ${region === r ? "ring-4 ring-accent scale-[1.03]" : "opacity-80 hover:opacity-100"}`}
                    >
                      <div className="text-3xl mb-auto">{r === "costa" ? "🌊" : r === "sierra" ? "⛰️" : "🌿"}</div>
                      <div className="absolute bottom-4 left-4 font-display font-bold capitalize">{r}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-6 relative" ref={autocompleteContainerRef}>
                  <label className="text-sm font-semibold">Distrito</label>
                  <input
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50"
                    placeholder="Busca y selecciona un distrito en Perú..."
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute top-[108%] left-0 right-0 bg-card border border-border/40 rounded-xl shadow-lift overflow-hidden z-50">
                      {suggestions.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setDistrict(s.description);
                            setRegion(s.region);
                            setCoords(s.coords);
                            setSuggestions([]);
                          }}
                          className="w-full text-left px-4 py-3 text-xs text-foreground hover:bg-secondary/60 active:bg-secondary border-b border-border/10 last:border-b-0 cursor-pointer transition-colors"
                        >
                          {s.description}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="text-xs uppercase tracking-widest text-accent font-semibold">Paso 3</div>
                <h2 className="font-display font-bold text-3xl mt-2">¿Cuántos seremos?</h2>
                <p className="text-muted-foreground mt-2">Define el tamaño ideal del equipo.</p>
                <div className="mt-8 text-center">
                  <div className="font-display font-bold text-7xl text-gradient-sunrise">{team}</div>
                  <div className="text-sm text-muted-foreground mt-1">jóvenes en tu equipo</div>
                </div>
                <input
                  type="range"
                  min="3"
                  max="80"
                  value={team}
                  onChange={(e) => setTeam(Number(e.target.value))}
                  className="mt-6 w-full accent-accent"
                />
                <div className="mt-6 grid grid-cols-4 gap-2">
                  {[5, 15, 30, 50].map((n) => (
                    <button key={n} onClick={() => setTeam(n)} className="rounded-xl border border-border py-3 text-sm font-semibold hover:bg-secondary transition-smooth">
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <div className="text-xs uppercase tracking-widest text-accent font-semibold">Paso 4</div>
                <h2 className="font-display font-bold text-3xl mt-2">Detalles finales</h2>
                <p className="text-muted-foreground mt-2">Cuenta más sobre tu misión.</p>
                <textarea
                  rows={5}
                  placeholder="Describe en pocas líneas qué van a hacer, qué necesitan y qué impacto buscas."
                  className="mt-6 w-full rounded-2xl border border-border bg-surface p-4 focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 resize-none"
                />
                <div className="mt-4 rounded-2xl border-2 border-dashed border-border p-6 text-center hover:bg-secondary/40 transition-colors cursor-pointer">
                  <Camera className="h-7 w-7 mx-auto text-muted-foreground" />
                  <div className="mt-2 font-semibold text-sm">Agrega una foto inspiradora</div>
                  <div className="text-xs text-muted-foreground">PNG o JPG, hasta 5MB</div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="text-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mx-auto h-24 w-24 rounded-3xl bg-gradient-sunrise grid place-items-center text-5xl shadow-glow"
                >
                  ✨
                </motion.div>
                <h2 className="font-display font-bold text-3xl mt-6">¡Tu misión está lista!</h2>
                <p className="text-muted-foreground mt-3 max-w-md mx-auto">
                  Aparecerá en el mapa de <span className="font-semibold text-foreground">{district}</span> y notificaremos a jóvenes de tu zona.
                </p>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm">
                  Has ganado <span className="font-bold text-accent">+150 XP</span> por liderar 🚀
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-6 flex justify-between gap-3">
        <button
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 font-semibold hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-smooth"
        >
          <ArrowLeft className="h-4 w-4" /> Atrás
        </button>
        <button
          onClick={() => setStep((s) => Math.min(STEPS.length, s + 1))}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-sunrise text-white px-6 py-3 font-semibold shadow-glow hover:scale-[1.02] transition-smooth"
        >
          {step === STEPS.length ? "Publicar misión" : "Continuar"} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
