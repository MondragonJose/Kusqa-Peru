import { createFileRoute, Link, useLocation, redirect, useSearch } from "@tanstack/react-router";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight,
  MapPin,
  Sparkles,
  Trophy,
  Users,
  Compass,
  Mountain,
  Waves,
  Trees,
  ChevronRight,
  Star,
} from "lucide-react";
import { useRef, useEffect, useMemo, useState } from "react";
import { JSX } from "react/jsx-runtime";
import { useLandingInitiatives } from "@/features/initiatives/hooks/useLandingInitiatives";
import { deriveInitiativeStats } from "@/domain/initiativeStats";
import { regionGradient, type Region } from "@/domain/regions";
import { InitiativeCard } from "@/features/home/components/InitiativeCard";
import { useOAuthLogin } from "@/features/auth";
import { useAuthState } from "@/features/auth";
import { toast } from "sonner";
import type { Initiative } from "@/domain/initiative";

// ─────────────────────────────────────────────────────────────────────────────
// Route
// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/")({
  component: Landing,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Animated counter hook
// ─────────────────────────────────────────────────────────────────────────────

function useAnimatedCounter(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

function StatCounter({
  icon: Icon,
  label,
  value,
  suffix,
  color,
}: {
  icon: any;
  label: string;
  value: number;
  suffix: string;
  color: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const count = useAnimatedCounter(value, 1800, inView);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2 text-center">
      <div
        className={`h-12 w-12 rounded-2xl glass grid place-items-center ${color} shadow-soft mb-1`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-display text-4xl lg:text-5xl font-bold text-white">
        {count.toLocaleString("es-PE")}
        {suffix}
      </div>
      {/* AQUÍ ESTÁ EL CAMBIO: text-white/90 en lugar de text-muted-foreground */}
      <div className="text-sm text-white/90 max-w-[130px] leading-snug">{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Peru SVG territorial outline — decorative, SSR-safe
// ─────────────────────────────────────────────────────────────────────────────

function PeruTerritoryDecoration({
  costaCount = 0,
  sierraCount = 0,
  selvaCount = 0,
}: {
  costaCount?: number;
  sierraCount?: number;
  selvaCount?: number;
}) {
  return (
    <div className="relative w-full max-w-[340px] mx-auto select-none pointer-events-none">
      {/* Background glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-40 h-40 rounded-full bg-gradient-coast opacity-20 blur-2xl animate-wander" />
      <div
        className="absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full bg-gradient-andes opacity-20 blur-2xl animate-wander"
        style={{ animationDelay: "4s" }}
      />
      <div
        className="absolute top-2/3 left-1/3 w-28 h-28 rounded-full bg-gradient-jungle opacity-20 blur-2xl animate-wander"
        style={{ animationDelay: "8s" }}
      />

      {/* Symbolic Peru outline — simplified SVG polygon */}
      <svg viewBox="0 0 240 360" fill="none" className="w-full h-auto drop-shadow-xl">
        {/* Simplified Peru silhouette */}
        <path
          d="M 60 20 L 100 10 L 140 18 L 160 30 L 175 55 L 185 80 L 180 110 L 195 140 L 200 170 L 190 200 L 195 230 L 180 260 L 160 285 L 140 310 L 120 330 L 100 345 L 80 340 L 60 320 L 45 295 L 35 265 L 30 235 L 40 205 L 35 175 L 45 145 L 40 115 L 50 85 L 45 55 Z"
          fill="url(#peruFill)"
          stroke="oklch(0.78 0.17 75 / 0.5)"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Animated Qhapaq Ñan trail */}
        <path
          d="M 100 340 Q 110 280 105 230 Q 120 185 115 145 Q 130 100 125 55 Q 135 30 140 18"
          stroke="oklch(0.78 0.17 75)"
          strokeWidth="2"
          strokeLinecap="round"
          className="animate-path-flow"
          opacity="0.7"
        />
        {/* Region dots */}
        <circle cx="90" cy="100" r="5" fill="oklch(0.7 0.18 45)" opacity="0.9">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx="120" cy="190" r="5" fill="oklch(0.55 0.2 310)" opacity="0.9">
          <animate
            attributeName="opacity"
            values="0.6;1;0.6"
            dur="3s"
            begin="0.8s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="140" cy="290" r="5" fill="oklch(0.6 0.19 160)" opacity="0.9">
          <animate
            attributeName="opacity"
            values="0.6;1;0.6"
            dur="3.5s"
            begin="1.6s"
            repeatCount="indefinite"
          />
        </circle>
        <defs>
          <linearGradient id="peruFill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.78 0.17 75 / 0.12)" />
            <stop offset="50%" stopColor="oklch(0.55 0.2 310 / 0.08)" />
            <stop offset="100%" stopColor="oklch(0.6 0.19 160 / 0.12)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Region floating labels — qualitative, no zero counts */}
      <div className="absolute top-[22%] left-[10%] bg-gradient-coast text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-soft animate-float-slow">
        Costa · 🌊 {costaCount > 0 ? `${costaCount} misiones` : "territorio activo"}
      </div>
      <div
        className="absolute top-[48%] right-[5%] bg-gradient-andes text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-soft animate-float-slow"
        style={{ animationDelay: "2s" }}
      >
        Sierra · ⛰️ {sierraCount > 0 ? `${sierraCount} misiones` : "territorio activo"}
      </div>
      <div
        className="absolute bottom-[20%] left-[8%] bg-gradient-jungle text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-soft animate-float-slow"
        style={{ animationDelay: "1s" }}
      >
        Selva · 🌿 {selvaCount > 0 ? `${selvaCount} misiones` : "territorio activo"}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Landing
// ─────────────────────────────────────────────────────────────────────────────

function Landing(): JSX.Element {
  const { data: initiatives = [] } = useLandingInitiatives();
  const { loginWithGoogle } = useOAuthLogin();
  const { state, isAuthenticated, isReady } = useAuthState();
  const search = useSearch({ from: "/" });
  const hasRedirected = useRef(false);

  // Centralized post-auth navigation decision
  // Landing is the single source of truth for routing after auth
  useEffect(() => {
    // Redirect authenticated users to /app
    // Two scenarios:
    // 1. Coming from auth callback with redirect param → use that destination
    // 2. Logged in from landing page → redirect to /app by default
    if (isAuthenticated && isReady && !hasRedirected.current) {
      hasRedirected.current = true;
      // Safe redirect validation: only allow internal paths
      const safeRedirect = search.redirect?.startsWith("/") ? search.redirect : "/app";
      // Small delay to ensure component render completes before redirect
      // Prevents "This page didn't load" error during auth transition
      setTimeout(() => {
        window.location.href = safeRedirect;
      }, 100);
    }
  }, [isAuthenticated, isReady, search.redirect]);

  const stats = deriveInitiativeStats(initiatives);

  const missionsByRegion = useMemo(() => {
    const counts: Record<string, number> = {};
    initiatives.forEach((i) => {
      counts[i.region] = (counts[i.region] || 0) + 1;
    });
    return counts;
  }, [initiatives]);

  // Show error toast if callback failed
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get("error");
    if (error === "auth_failed") {
      toast.error("Error de autenticación", {
        description: "No pudimos procesar tu sesión. Intenta nuevamente.",
      });
    } else if (error === "auth_timeout") {
      toast.error("Tiempo de espera agotado", {
        description: "La autenticación tardó demasiado. Intenta nuevamente.",
      });
    }
  }, []);

  const featuredMissions = (() => {
    if (initiatives.length === 0) return [];

    const byRegion: Record<string, Initiative[]> = {};
    initiatives.forEach((i) => {
      if (!byRegion[i.region]) byRegion[i.region] = [];
      byRegion[i.region].push(i);
    });

    const selected: Initiative[] = [];
    const regions = Object.keys(byRegion);

    regions.forEach((region) => {
      const pool = byRegion[region];
      const shuffled = pool.sort(() => Math.random() - 0.5);
      selected.push(...shuffled.slice(0, 2));
    });

    if (selected.length > 6) {
      const diverse: Initiative[] = [];
      regions.forEach((region) => {
        const regionSelected = selected.filter((i) => i.region === region);
        if (regionSelected.length > 0) {
          diverse.push(regionSelected[0]);
        }
      });
      const extras = selected.filter((i) => !diverse.includes(i)).sort(() => Math.random() - 0.5);
      diverse.push(...extras.slice(0, 6 - diverse.length));
      return diverse;
    }

    if (selected.length < 6) {
      const remaining = initiatives.filter((i) => !selected.includes(i));
      const shuffled = remaining.sort(() => Math.random() - 0.5);
      selected.push(...shuffled.slice(0, 6 - selected.length));
    }

    return selected.slice(0, 6);
  })();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── NAV ── */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 mt-4">
          <div className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-4 shadow-soft">
            <Link to="/" search={{ redirect: undefined }} className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-sunrise grid place-items-center shadow-glow">
                <span className="text-white font-bold text-lg leading-none">K</span>
              </div>
              <div>
                <div className="font-display font-bold leading-none">KUSQA</div>
                <div className="text-[9px] tracking-widest text-muted-foreground uppercase mt-0.5">
                  Camina el Perú
                </div>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6 ml-6 text-sm text-muted-foreground">
              <a href="#movimiento" className="hover:text-foreground transition-colors">
                El movimiento
              </a>
              <a href="#expediciones" className="hover:text-foreground transition-colors">
                Expediciones
              </a>
              <a href="#territorio" className="hover:text-foreground transition-colors">
                Territorio
              </a>
              <a href="#voces" className="hover:text-foreground transition-colors">
                Voces
              </a>
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={loginWithGoogle}
                className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground px-3 py-2 transition-colors"
              >
                Ingresar
              </button>
              <button
                onClick={loginWithGoogle}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-sunrise text-white px-4 py-2 text-sm font-semibold hover:opacity-90 transition-smooth shadow-soft"
              >
                Únete <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO — Cinematic expedition portal ── */}
      <section className="relative pt-24 pb-16 lg:pt-44 lg:pb-36 px-5 lg:px-8 overflow-hidden">
        {/* Ambient layers */}
        <div className="absolute inset-0 bg-mesh opacity-80" />
        <div className="absolute top-16 -right-28 h-[520px] w-[520px] rounded-full bg-gradient-sunrise opacity-15 blur-3xl animate-float-slow" />
        <div
          className="absolute bottom-0 -left-40 h-[420px] w-[420px] rounded-full bg-gradient-andes opacity-15 blur-3xl animate-float-slow"
          style={{ animationDelay: "2.5s" }}
        />

        {/* Qhapaq Ñan background SVG trail */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.04]"
            viewBox="0 0 1440 800"
            preserveAspectRatio="none"
          >
            <path
              d="M -50 700 Q 200 500 400 550 T 700 350 T 1000 250 T 1300 100 T 1490 50"
              stroke="oklch(0.78 0.17 75)"
              strokeWidth="3"
              strokeDasharray="8 14"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M -50 600 Q 150 400 350 440 T 650 260 T 950 180 T 1250 80 T 1490 20"
              stroke="oklch(0.7 0.18 45)"
              strokeWidth="2"
              strokeDasharray="5 10"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Live signal badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full glass px-3 lg:px-4 py-1.5 text-[10px] lg:text-xs font-medium text-foreground/80 mb-4 lg:mb-7 shadow-soft relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-sunrise opacity-5 animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="relative z-10 truncate">
                  {initiatives.length > 0
                    ? `Movimiento vivo · ${initiatives.length} ${initiatives.length === 1 ? "ruta activa" : "rutas activas"}`
                    : "Iniciativas nacen desde cada territorio"}
                </span>
              </motion.div>

              <h1 className="font-display font-bold text-3xl sm:text-4xl lg:text-[4.5rem] leading-[1.1] sm:leading-[1.0] lg:leading-[0.95] tracking-tight">
                Crea proyectos cívicos
                <br />
                <span className="text-gradient-aurora">en tu distrito.</span>
              </h1>

              <p className="mt-3 sm:mt-4 lg:mt-6 text-sm sm:text-base lg:text-lg text-muted-foreground max-w-xl leading-relaxed">
                KUSQA conecta jóvenes que quieren transformar su entorno. Cada proyecto que creas
                deja una huella real en tu comunidad.
              </p>

              <p className="mt-2 sm:mt-3 lg:mt-3 text-xs sm:text-sm lg:text-base text-muted-foreground/80 max-w-lg leading-relaxed italic">
                Explora misiones activas o crea tu propio proyecto en todo el Perú.
              </p>

              <div className="mt-6 lg:mt-9 flex flex-wrap items-center gap-2 lg:gap-3">
                <Link
                  to="/app/mapa"
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-sunrise text-white px-4 lg:px-6 py-2.5 lg:py-3.5 text-xs lg:text-base font-semibold shadow-glow hover:scale-[1.02] active:scale-95 transition-smooth"
                >
                  Explorar mapa <MapPin className="h-3 lg:h-4 w-3 lg:w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <button
                  onClick={loginWithGoogle}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/60 backdrop-blur px-4 lg:px-6 py-2.5 lg:py-3.5 text-xs lg:text-base font-semibold hover:bg-surface transition-smooth"
                >
                  Crear proyecto
                  <ArrowRight className="h-3 lg:h-4 w-3 lg:w-4" />
                </button>
              </div>

              {/* Mini stats row — derived from real Supabase data */}
              <div className="hidden sm:flex mt-8 lg:mt-12 flex-wrap gap-x-6 lg:gap-x-10 gap-y-3">
                {(() => {
                  const s = deriveInitiativeStats(initiatives);
                  return [
                    { k: s[2].value.toLocaleString("es-PE"), v: s[2].label },
                    { k: s[1].value.toLocaleString("es-PE"), v: s[1].label },
                    { k: s[0].value.toLocaleString("es-PE"), v: s[0].label },
                  ];
                })().map((s) => (
                  <div key={s.v}>
                    <div className="font-display text-2xl lg:text-3xl font-bold">{s.k}</div>
                    <div className="text-xs lg:text-sm text-muted-foreground">{s.v}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Hero visual — Peru territory - hidden on mobile/tablet */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.3 }}
              className="hidden lg:block"
            >
              <PeruTerritoryDecoration
                costaCount={missionsByRegion["costa"] || 0}
                sierraCount={missionsByRegion["sierra"] || 0}
                selvaCount={missionsByRegion["selva"] || 0}
              />
            </motion.div>
          </div>

          {/* Floating expedition cards */}
          {featuredMissions.length > 0 ? (
            <div className="mt-12 lg:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 max-w-5xl">
              {featuredMissions.slice(0, 3).map((initiative, i) => (
                <motion.div
                  key={initiative.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ duration: 0.6, delay: 0.5 + i * 0.12 }}
                  className="glass-strong rounded-2xl p-4 lg:p-5 shadow-card hover:shadow-lift transition-smooth cursor-pointer"
                >
                  <div
                    className={`h-20 lg:h-28 rounded-xl bg-gradient-to-br ${regionGradient(initiative.region as Region)} grid place-items-center text-3xl lg:text-5xl mb-3 lg:mb-4`}
                  >
                    {initiative.emoji}
                  </div>
                  <div className="flex items-center gap-1 text-[8px] lg:text-xs text-muted-foreground mb-2">
                    <span className="text-[7px] lg:text-[9px] uppercase tracking-widest font-semibold text-accent">
                      {initiative.region}
                    </span>
                    <span>·</span>
                    <MapPin className="h-2.5 lg:h-3 w-2.5 lg:w-3" />{" "}
                    <span className="truncate">{initiative.location?.district ?? ""}</span>
                  </div>
                  <div className="font-display font-semibold text-sm lg:text-base mb-2 lg:mb-0">
                    {initiative.title}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[8px] lg:text-xs px-2 py-1 rounded-full bg-secondary font-medium">
                      {initiative.lifecycle === "active" ? "En curso" : initiative.lifecycle === "forming" ? "Próxima" : initiative.lifecycle}
                    </span>
                    <Link
                      to="/app/mapa"
                      className="text-[8px] lg:text-xs text-accent font-semibold hover:gap-2 flex items-center gap-1 transition-all"
                    >
                      Ver más <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="mt-12 lg:mt-16 max-w-5xl">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="glass-strong rounded-2xl p-8 text-center shadow-card"
              >
                <div className="text-3xl mb-4">🏔️</div>
                <h3 className="font-display font-semibold text-lg mb-2">
                  Las primeras expediciones están naciendo
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
                  Jóvenes en todo el Perú están creando las primeras misiones en sus distritos. El mapa se llena cuando tú decides dar el primer paso.
                </p>
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* ── CIVIC OBSERVATORY ── */}
      {stats.some((s) => s.value > 0) && (
        <section className="px-5 lg:px-8 py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-sunrise opacity-85" />
          <div className="absolute inset-0 bg-mesh opacity-15" />

          <div className="relative mx-auto max-w-7xl text-white">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 mb-5">
                <span className="h-1.5 w-1.5 rounded-full bg-sun animate-pulse" />
                En tiempo real
              </div>
              <h2 className="font-display font-bold text-4xl lg:text-5xl leading-tight">
                El Perú en movimiento.
              </h2>
              <p className="mt-4 text-white/70 text-lg max-w-lg mx-auto leading-relaxed">
                Cada número representa una historia real de impacto colectivo.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-12">
              {stats.map((s: any, i: number) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <StatCounter {...s} />
                </motion.div>
              ))}
            </div>

            {/* Soft CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="mt-14 text-center"
            >
              <p className="text-white/60 text-sm mb-4">
                ¿Quieres ser parte de estas estadísticas?
              </p>
              <button
                onClick={loginWithGoogle}
                className="inline-flex items-center gap-2 rounded-xl bg-white text-foreground px-6 py-3 text-sm font-semibold hover:scale-[1.02] transition-smooth shadow-card"
              >
                Crea tu cuenta gratis <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── EL MOVIMIENTO ── */}
      <section id="movimiento" className="px-5 lg:px-8 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs uppercase tracking-widest text-accent font-semibold">
                El movimiento
              </div>
              <h2 className="font-display font-bold text-4xl lg:text-5xl mt-3 leading-tight">
                No es voluntariado.
                <br />
                Es <span className="text-gradient-sunrise">acción comunitaria</span> real.
              </h2>
              <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
                KUSQA conecta jóvenes que quieren transformar su entorno. Cada misión es una
                oportunidad real para dejar huella en tu comunidad, conocer a personas que comparten
                tu visión y construir el Perú que soñamos.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  {
                    icon: Compass,
                    title: "Actúa en tu cuadra",
                    body: "Misiones reales en tu distrito que generan impacto visible.",
                  },
                  {
                    icon: Users,
                    title: "Construye comunidad",
                    body: "Conecta con jóvenes de todo el Perú que comparten tu pasión por el cambio.",
                  },
                  {
                    icon: Trophy,
                    title: "Deja huella",
                    body: "Cada acción cuenta. Tu participación se vuelve visible y reconocida.",
                  },
                ].map((f) => (
                  <div key={f.title} className="flex gap-4 rounded-2xl glass p-4">
                    <div className="h-11 w-11 rounded-xl bg-gradient-sunrise grid place-items-center shrink-0 text-white shadow-soft">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{f.title}</div>
                      <div className="text-sm text-muted-foreground">{f.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Region selector visual */}
            <div className="relative">
              <div className="absolute -inset-6 bg-gradient-aurora opacity-20 blur-3xl rounded-3xl" />
              <div className="relative glass-strong rounded-3xl p-3 sm:p-6 shadow-lift">
                <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3 sm:mb-4">
                  Elige tu paisaje
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3">
                  {[
                    {
                      name: "Costa",
                      icon: Waves,
                      gradient: "bg-gradient-coast",
                      desc: "Surcos del mar",
                      active: missionsByRegion["costa"] || 0,
                    },
                    {
                      name: "Sierra",
                      icon: Mountain,
                      gradient: "bg-gradient-andes",
                      desc: "Rutas del Ande",
                      active: missionsByRegion["sierra"] || 0,
                    },
                    {
                      name: "Selva",
                      icon: Trees,
                      gradient: "bg-gradient-jungle",
                      desc: "Corazón verde",
                      active: missionsByRegion["selva"] || 0,
                    },
                  ].map((r) => (
                    <motion.div
                      key={r.name}
                      whileHover={{ scale: 1.03 }}
                      className={`relative overflow-hidden rounded-2xl ${r.gradient} p-4 sm:p-5 aspect-[16/9] sm:aspect-[3/4] text-white shadow-card cursor-pointer flex flex-col`}
                    >
                      {/* Subtle activity pulse */}
                      <motion.div
                        className="absolute top-2 right-2 sm:top-3 sm:right-3 w-1.5 h-1.5 rounded-full bg-white/60"
                        animate={{
                          scale: [1, 1.8, 1],
                          opacity: [0.6, 0.3, 0.6],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      <r.icon className="h-5 w-5 sm:h-6 sm:w-6 mb-auto" />
                      <div className="mt-auto">
                        <div className="font-display font-bold text-base sm:text-xl leading-tight">
                          {r.name}
                        </div>
                        <div className="text-[10px] sm:text-xs opacity-80 mt-1">{r.desc}</div>
                        <div className="text-[9px] sm:text-[10px] mt-1.5 opacity-60">
                          {r.active} misiones
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-3 sm:mt-5 rounded-2xl bg-secondary p-2 sm:p-4 flex items-start sm:items-center gap-2 sm:gap-3">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-accent shrink-0 mt-0.5 sm:mt-0" />
                  <div className="text-[10px] sm:text-sm leading-snug">
                    Personaliza tu avatar y fondo con la identidad de tu distrito.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ARCHIVO DE EXPEDICIONES ── */}
      <section id="expediciones" className="px-5 lg:px-8 py-24 bg-surface/40">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <div className="text-xs uppercase tracking-widest text-accent font-semibold mb-2">
              Acciones reales en el territorio
            </div>
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <h2 className="font-display font-bold text-4xl lg:text-5xl leading-tight">
                Jóvenes transformando
                <br />
                sus comunidades hoy.
              </h2>
              <Link
                to="/app/mapa"
                className="inline-flex items-center gap-2 text-sm text-accent font-semibold hover:gap-3 transition-all"
              >
                Ver todas las acciones <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl leading-relaxed">
              Cada misión es una historia real de jóvenes como tú dejando huella en su barrio,
              distrito y región. Explora qué está pasando — para participar, crea tu cuenta gratis.
            </p>
          </motion.div>

          {/* Mission grid */}
          {featuredMissions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredMissions.map((initiative, i) => (
                <InitiativeCard key={initiative.id} initiative={initiative} index={i} />
              ))}
            </div>
          ) : (
            <>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-muted-foreground text-base max-w-xl mb-8 leading-relaxed"
              >
                Cada iniciativa empieza con alguien que mira su barrio y dice: aquí algo puede
                cambiar. Las primeras misiones nacen así — de vecinos que deciden ser el primer
                paso. ¿Y si ese alguien fueras tú?
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="glass-strong rounded-2xl p-10 text-center shadow-card"
              >
                <div className="text-4xl mb-4">🚀</div>
                <h3 className="font-display font-semibold text-lg mb-2">
                  No hay expediciones todavía — la primera puede ser tuya
                </h3>
                <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed mb-6">
                  El mapa está vacío porque nadie ha dado el primer paso en tu región. ¿Te animas a crear la primera misión?
                </p>
                <button
                  onClick={loginWithGoogle}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-sunrise text-white px-6 py-3 text-sm font-semibold hover:scale-[1.02] transition-smooth shadow-glow"
                >
                  Crear primera misión <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            </>
          )}

          {/* Soft join CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 rounded-3xl glass-strong border border-border/60 p-8 text-center shadow-soft"
          >
            <div className="text-2xl mb-3">🌱</div>
            <h3 className="font-display font-bold text-xl mb-2">Tu comunidad te está esperando.</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto leading-relaxed">
              Únete a jóvenes de todo el Perú que están transformando sus barrios, distritos y
              regiones. Tu participación importa. Es gratis.
            </p>
            <button
              onClick={loginWithGoogle}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-sunrise text-white px-8 py-3.5 font-semibold hover:scale-[1.02] transition-smooth shadow-glow"
            >
              Comenzar mi expedición <ArrowRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── QHAPAQ ÑAN PROGRESSION ── */}
      <section id="territorio" className="px-5 lg:px-8 py-24 relative">
        <div className="absolute inset-0 bg-gradient-andes opacity-80" />
        <div className="absolute inset-0 bg-mesh opacity-20" />
        <div className="relative mx-auto max-w-7xl text-white">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-widest text-sun font-semibold">
              Tu expedición
            </div>
            <h2 className="font-display font-bold text-4xl lg:text-5xl mt-3 leading-tight">
              De vecino activo a líder Kusqa.
            </h2>
            <p className="mt-5 text-white/70 text-lg leading-relaxed">
              Cada misión te lleva más alto en una ruta inspirada en los caminos ancestrales. Sube
              por la costa, atraviesa los Andes, llega a la Amazonía y deja huella en el camino.
            </p>
          </div>

          {/* Path */}
          <div className="mt-14 relative">
            <svg
              className="absolute inset-0 w-full h-full hidden md:block"
              viewBox="0 0 1000 300"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M 50 240 Q 200 50 400 180 T 750 90 T 950 200"
                stroke="url(#g1)"
                strokeWidth="3"
                strokeDasharray="6 8"
                fill="none"
              />
              <defs>
                <linearGradient id="g1" x1="0" x2="1">
                  <stop offset="0" stopColor="oklch(0.78 0.17 75)" />
                  <stop offset="1" stopColor="oklch(0.7 0.18 45)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="relative grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
              {[
                { lvl: 1, name: "Caminante", emoji: "🚶", active: true },
                { lvl: 2, name: "Vecino", emoji: "🏘️", active: true },
                { lvl: 3, name: "Sembrador", emoji: "🌱", active: true },
                { lvl: 4, name: "Guía", emoji: "⛰️", active: false, current: true },
                { lvl: 7, name: "Líder Kusqa", emoji: "🏆", active: false },
              ].map((s) => (
                <div key={s.lvl} className="relative">
                  <div
                    className={`aspect-square rounded-2xl grid place-items-center text-3xl sm:text-4xl ${
                      s.current
                        ? "bg-gradient-sunrise shadow-glow ring-4 ring-white/30"
                        : s.active
                          ? "bg-white/15 backdrop-blur"
                          : "bg-white/5 border border-white/10 opacity-60"
                    }`}
                  >
                    {s.emoji}
                    {s.current && (
                      <span className="absolute inset-0 rounded-2xl bg-white/20 animate-pulse-ring" />
                    )}
                  </div>
                  <div className="mt-2 sm:mt-3 text-center">
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/50">
                      Nivel {s.lvl}
                    </div>
                    <div className="font-semibold text-xs sm:text-sm">{s.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Soft join prompt */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 flex flex-col sm:flex-row items-center gap-4 rounded-2xl bg-white/10 border border-white/20 p-6 backdrop-blur"
          >
            <Star className="h-8 w-8 text-sun shrink-0" />
            <div className="flex-1 text-center sm:text-left">
              <div className="font-semibold text-white">
                Tu aventura empieza en Nivel 1 — Caminante
              </div>
              <div className="text-white/60 text-sm mt-0.5">
                Cada misión que completes te acerca a ser un Líder Kusqa reconocido en tu región.
              </div>
            </div>
            <button
              onClick={loginWithGoogle}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-sun text-foreground px-5 py-2.5 text-sm font-semibold hover:scale-[1.02] transition-smooth shadow-card whitespace-nowrap"
            >
              Empezar gratis <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── VOCES DEL TERRITORIO ── */}
      <section id="voces" className="px-5 lg:px-8 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs uppercase tracking-widest text-accent font-semibold">
              Voces del territorio
            </div>
            <h2 className="font-display font-bold text-4xl lg:text-5xl mt-3">
              Jóvenes construyendo el Perú que sueñan.
            </h2>
          </div>
          <div className="mt-12">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl glass p-10 text-center shadow-soft max-w-lg mx-auto"
            >
              <div className="text-4xl mb-4">📢</div>
              <p className="text-foreground leading-relaxed text-lg">
                "Las primeras voces están escribiendo su historia — la tuya puede ser la próxima."
              </p>
              <div className="mt-6 pt-6 border-t border-border/50">
                <button
                  onClick={loginWithGoogle}
                  className="inline-flex items-center gap-2 text-sm text-accent font-semibold hover:gap-3 transition-all"
                >
                  Comparte tu historia <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section id="comienza" className="px-5 lg:px-8 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-sunrise p-10 lg:p-16 text-center text-white shadow-lift">
            <div className="absolute inset-0 bg-mesh opacity-30" />
            {/* Qhapaq Ñan decoration */}
            <svg
              className="absolute inset-0 w-full h-full opacity-10"
              viewBox="0 0 800 300"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M -20 250 Q 200 80 400 150 T 820 80"
                stroke="white"
                strokeWidth="2"
                strokeDasharray="6 10"
                fill="none"
              />
            </svg>
            <div className="relative">
              <div className="text-sm font-medium opacity-80 mb-4 tracking-wide uppercase">
                El camino te espera
              </div>
              <h2 className="font-display font-bold text-4xl lg:text-6xl leading-tight">
                Tu legado empieza
                <br />
                en tu próxima cuadra.
              </h2>
              <p className="mt-5 text-white/90 max-w-xl mx-auto text-lg">
                Súmate a la generación que está caminando el Perú con propósito. Crea tu cuenta en
                menos de un minuto.
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={loginWithGoogle}
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-foreground px-8 py-4 font-semibold hover:scale-[1.03] transition-smooth shadow-card"
                >
                  Empezar gratis <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#expediciones"
                  className="text-white/80 hover:text-white text-sm underline underline-offset-4 transition-colors"
                >
                  Explorar primero →
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-5 lg:px-8 pb-10">
        <div className="mx-auto max-w-7xl border-t border-border/60 pt-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-sunrise grid place-items-center text-white text-xs font-bold">
                K
              </div>
              <span className="font-display font-semibold text-foreground">KUSQA</span>
              <span className="text-sm text-muted-foreground">
                · Camina el Perú, construye legado.
              </span>
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <a href="#movimiento" className="hover:text-foreground transition-colors">
                Manifiesto
              </a>
              <a href="#expediciones" className="hover:text-foreground transition-colors">
                Expediciones
              </a>
              <a href="#voces" className="hover:text-foreground transition-colors">
                Voces
              </a>
              <a href="#movimiento" className="hover:text-foreground transition-colors">
                Aliados
              </a>
              <a href="#comienza" className="hover:text-foreground transition-colors">
                Contacto
              </a>
            </nav>
          </div>
          <div className="mt-6 text-xs text-muted-foreground/60">
            © 2026 KUSQA · Hecho con propósito en Perú 🇵🇪
          </div>
        </div>
      </footer>
    </div>
  );
}
