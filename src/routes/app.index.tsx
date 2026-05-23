import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { MapPin, Sparkles, ArrowRight, Users, TrendingUp, Clock, Heart, ShieldCheck, Compass, CompassIcon } from "lucide-react";
import { REGION_META } from "@/data/kusqa";
import { useCurrentUser, useUserXpProgress } from "@/features/auth";
import { useProgression } from "@/features/progression";
import { CommunityPulse } from "@/features/community";
import { useMissions } from "@/hooks/useMissions";
import type { Region } from "@/types";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: missions = [] } = useMissions();
  const featured = missions.slice(0, 3);
  const nearby = missions.filter((m) => m.region === "costa");
  const currentUser = useCurrentUser();
  const { progressPct } = useUserXpProgress();
  const { currentStage, nextStage, xpToNextStage } = useProgression();

  // Territorial scrollable targets
  const territories = [
    {
      id: "valle-sagrado",
      name: "Valle Sagrado & Cusco",
      region: "sierra" as Region,
      energy: 92,
      activeMissionsCount: 8,
      leadCategory: "Medio ambiente",
      quote: "Sembrando agua y reforestando las cuencas de los abuelos.",
      imageEmoji: "🏔️",
      link: "/app/mapa"
    },
    {
      id: "barranco",
      name: "Barranco & Miraflores",
      region: "costa" as Region,
      energy: 88,
      activeMissionsCount: 5,
      leadCategory: "Arte & cultura",
      quote: "Rescatando la memoria visual y comunitaria en el litoral.",
      imageEmoji: "🌊",
      link: "/app/mapa"
    },
    {
      id: "iquitos",
      name: "Iquitos Río Itaya",
      region: "selva" as Region,
      energy: 76,
      activeMissionsCount: 4,
      leadCategory: "Comunidad",
      quote: "Uniendo brigadas fluviales para limpiar nuestros ríos sagrados.",
      imageEmoji: "🌿",
      link: "/app/mapa"
    },
    {
      id: "puno",
      name: "Puno Lago Titicaca",
      region: "sierra" as Region,
      energy: 52,
      activeMissionsCount: 3,
      leadCategory: "Educación",
      quote: "Tejiendo saberes ancestrales con herramientas digitales.",
      imageEmoji: "🌾",
      link: "/app/mapa"
    }
  ];

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-16">
      
      {/* Cinematic Hero Section — "Portal de Expedición" */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-stone-950 text-white p-8 sm:p-12 shadow-2xl border border-white/10">
        {/* Animated Qhapaq Ñan Background Line Motifs */}
        <div className="absolute inset-0 bg-mesh opacity-15 pointer-events-none" />
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <motion.path
              d="M-100 120 Q 200 40 450 180 T 1100 80"
              fill="none"
              stroke="url(#hero-trail-gradient)"
              strokeWidth="2.5"
              strokeDasharray="6 12"
              animate={{ strokeDashoffset: [0, -40] }}
              transition={{ repeat: Infinity, ease: "linear", duration: 15 }}
            />
            <defs>
              <linearGradient id="hero-trail-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C4962A" />
                <stop offset="50%" stopColor="#6B4F8E" />
                <stop offset="100%" stopColor="#2D7A4A" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Ambient Glow Particles */}
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none animate-pulse-ring" />
        <div className="absolute right-10 bottom-0 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="relative grid lg:grid-cols-[1fr_360px] gap-8 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] uppercase font-bold tracking-widest text-amber-300 border border-white/5">
              <Compass className="h-3 w-3 animate-spin-slow" /> Expedición Activa
            </span>
            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05]">
              Cada barrio guarda <br/>
              <span className="bg-clip-text text-transparent bg-gradient-sunrise">una historia de impacto.</span>
            </h1>
            <p className="text-sm sm:text-base text-stone-300 max-w-xl font-medium leading-relaxed">
              Explora misiones, conecta con jóvenes en todo el territorio y deja huellas reales en el Perú. Un camino de participación inspirado en el Qhapaq Ñan.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/app/mapa" className="inline-flex items-center gap-2 rounded-2xl bg-white text-stone-950 px-6 py-3.5 text-xs font-black shadow-glow hover:scale-[1.02] active:scale-95 transition-all">
                Explorar el territorio <MapPin className="h-4 w-4 text-accent" />
              </Link>
              <Link to="/app/crear" className="inline-flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-6 py-3.5 text-xs font-bold hover:bg-white/20 active:scale-95 transition-all text-white">
                Comenzar mi expedición
              </Link>
            </div>
          </div>

          {/* Large Territorial Statistics */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
            {[
              { label: "distritos activos", value: "12", desc: "Red comunitaria", color: "text-amber-400" },
              { label: "expediciones", value: "24", desc: "Misiones en curso", color: "text-sky-400" },
              { label: "jóvenes activos", value: "445", desc: "Movilizados hoy", color: "text-rose-400" },
              { label: "horas cívicas", value: "1.8K", desc: "Impacto total", color: "text-emerald-400" },
            ].map((s, idx) => (
              <div key={idx} className="p-3 bg-stone-900/60 rounded-2xl border border-white/5 text-center">
                <div className={`font-display font-black text-2xl ${s.color}`}>{s.value}</div>
                <div className="text-[8px] uppercase tracking-wider font-extrabold text-stone-400 mt-1">{s.label}</div>
                <div className="text-[7px] text-stone-500 font-semibold mt-0.5 leading-none">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Territorios en Movimiento — Horizontally scrollable expedition cards */}
      <section className="space-y-4">
        <div className="flex items-end justify-between px-1">
          <div>
            <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight text-foreground flex items-center gap-2">
              <CompassIcon className="h-5 w-5 text-accent animate-pulse-ring" /> Territorios en Movimiento
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Explora las historias activas que están transformando cada región natural.</p>
          </div>
          <Link to="/app/mapa" className="text-xs uppercase tracking-wider text-primary font-bold hover:underline inline-flex items-center gap-1">
            Ver mapa completo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar snap-x snap-mandatory">
          {territories.map((t) => {
            const meta = REGION_META[t.region];
            return (
              <div 
                key={t.id}
                className="w-[280px] sm:w-[320px] shrink-0 snap-start bg-card border border-border/80 rounded-3xl overflow-hidden hover:shadow-lift transition-all duration-300 flex flex-col justify-between"
              >
                {/* Visual Header */}
                <div className={`h-24 ${meta.gradient} text-white p-4 relative`}>
                  <div className="absolute inset-0 bg-mesh opacity-20" />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-3xl filter drop-shadow-sm select-none">{t.imageEmoji}</span>
                    <span className="text-[8px] uppercase tracking-widest font-black bg-black/35 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-white">
                      {meta.name}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h3 className="font-display font-bold text-sm tracking-tight leading-none truncate">
                      {t.name}
                    </h3>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <p className="text-xs text-muted-foreground italic leading-relaxed">
                    "{t.quote}"
                  </p>
                  
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-semibold">Misiones activas</span>
                      <span className="font-extrabold text-foreground">{t.activeMissionsCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-semibold">Causa principal</span>
                      <span className="font-extrabold text-primary">{t.leadCategory}</span>
                    </div>
                    
                    {/* Energy Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                        <span>Energía Cívica</span>
                        <span className="text-accent">{t.energy}/100</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-sunrise"
                          style={{ width: `${t.energy}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="px-4 pb-4 pt-1">
                  <Link 
                    to={t.link}
                    className="w-full inline-flex justify-center items-center py-2.5 rounded-xl bg-secondary hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors text-[10px] font-black uppercase tracking-wider text-foreground"
                  >
                    Ingresar al Territorio
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Featured Recommendations */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight text-foreground">Historias Recomendadas para ti</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Expediciones locales y de alto impacto cívico.</p>
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
                  className="group block rounded-3xl bg-card border border-border/80 overflow-hidden hover:shadow-lift hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`h-36 ${meta.gradient} relative grid place-items-center text-5xl`}>
                    <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
                    <span className="select-none filter drop-shadow-sm">{m.emoji}</span>
                    <span className="absolute top-3 left-3 text-[8px] uppercase tracking-widest font-extrabold text-white bg-black/35 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                      {meta.name}
                    </span>
                    <span className="absolute top-3 right-3 text-xs font-black text-white bg-black/45 backdrop-blur px-2.5 py-1 rounded-full border border-white/10">
                      +{m.xp} XP
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                      <MapPin className="h-3.5 w-3.5 text-primary/75" /> {m.district}
                    </div>
                    <div className="font-display font-bold text-base mt-2 group-hover:text-primary transition-colors line-clamp-1">
                      {m.title}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs border-t border-border/40 pt-3">
                      <span className="text-muted-foreground/90 font-medium inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-emerald-500" /> {m.participants} participantes
                      </span>
                      <span className="font-bold text-primary">{m.spotsLeft} cupos libres</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Two columns: progress + community pulse */}
      <section className="grid lg:grid-cols-3 gap-6">
        {/* Progression Mini-Widget */}
        <div className="lg:col-span-2 rounded-3xl border border-border/80 bg-card p-6 shadow-sm overflow-hidden relative flex flex-col justify-between">
          <div className="absolute -right-12 -bottom-12 w-36 h-36 rounded-full bg-purple-500/5 blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mi Expedición KUSQA</span>
                <h3 className="font-display font-black text-2xl text-foreground mt-1.5 leading-none">
                  {currentStage.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-2">
                  Próxima parada: <strong className="text-foreground">{nextStage ? nextStage.name : "Cima cívica"}</strong>
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-gradient-andes grid place-items-center text-3xl shadow-glow border border-white/10 shrink-0">
                ⛰️
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-2">
                <span>{currentUser.xp.toLocaleString()} XP</span>
                <span>{nextStage ? `${nextStage.xpFrom.toLocaleString()} XP` : "Máximo"}</span>
              </div>
              <div className="h-3 rounded-full bg-secondary overflow-hidden p-[1px] border border-border/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-sunrise rounded-full relative"
                >
                  <div className="absolute inset-0 shimmer" />
                </motion.div>
              </div>
              {nextStage && (
                <div className="mt-3 text-xs text-muted-foreground/80 font-medium">
                  Te faltan <span className="font-bold text-foreground">{(xpToNextStage).toLocaleString()} XP</span> para subir de tramo.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border/40 pt-4">
            {[
              { l: "Impacto", v: currentUser.peopleImpacted ? `${currentUser.peopleImpacted}+` : "0", i: "❤️", textCol: "text-rose-500" },
              { l: "Territorios", v: "4 distritos", i: "📍", textCol: "text-sky-500" },
              { l: "Red Cívica", v: "12 aliados", i: "🤝", textCol: "text-purple-500" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-secondary/50 border border-border/20 p-2.5 text-center">
                <div className="text-base">{s.i}</div>
                <div className="font-display font-bold text-sm mt-1 text-foreground">{s.v}</div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Community Pulse Widget */}
        <div className="lg:col-span-1 bg-card rounded-3xl overflow-hidden shadow-sm">
          <CommunityPulse limit={2} showDetails={false} />
        </div>
      </section>

      {/* Activity Feed and Near Map */}
      <section className="grid lg:grid-cols-3 gap-6">
        {/* Civic Activity Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display font-black text-xl tracking-tight text-foreground flex items-center gap-2 pl-1">
            <Sparkles className="h-5 w-5 text-accent animate-pulse" /> Movimiento Reciente en vivo
          </h2>
          <div className="rounded-3xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60 shadow-sm">
            {[
              { who: "Sayri Ccama", what: "completó reforestación en Chinchero", emoji: "🌱", time: "hace 1h", dist: "Urubamba", status: "verificado" },
              { who: "Joaquín Ríos", what: "se unió a clases de código para escolares", emoji: "💻", time: "hace 3h", dist: "Trujillo", status: "en curso" },
              { who: "Lucía Herrera", what: "desbloqueó insignia 'Mentor'", emoji: "🎓", time: "hace 5h", dist: "Barranco", status: "verificado" },
              { who: "Camila Díaz", what: "organizó tardes con nuestros abuelos", emoji: "🌼", time: "ayer", dist: "Barranco", status: "verificado" },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-4 p-4 hover:bg-secondary/30 transition-colors">
                <div className="h-11 w-11 rounded-2xl bg-secondary grid place-items-center text-xl shrink-0 border border-border/30">
                  {a.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-foreground flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-foreground/90">{a.who}</span>{" "}
                    <span className="text-stone-500 dark:text-stone-400">{a.what}</span>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border tracking-wide uppercase ${
                      a.status === "verificado" 
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30" 
                        : "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30"
                    }`}>
                      {a.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/80 mt-0.5 font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3 opacity-60" /> {a.dist} <span className="opacity-45">•</span> <Clock className="h-3 w-3 opacity-60" /> {a.time}
                  </div>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Nearby Mini Slider */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-display font-black text-xl tracking-tight text-foreground flex items-center gap-2 pl-1">
            <Heart className="h-5 w-5 text-rose-500 animate-pulse" /> Cerca de ti
          </h2>
          <div className="space-y-3">
            {nearby.slice(0, 2).map((m) => (
              <Link
                key={m.id}
                to="/app/mision/$missionId"
                params={{ missionId: m.id }}
                className="block rounded-3xl bg-card border border-border/80 p-5 hover:shadow-sm hover:border-border transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-coast grid place-items-center text-2xl shrink-0 border border-white/5">
                    {m.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {m.title}
                    </div>
                    <div className="text-xs text-stone-500 font-semibold mt-0.5 flex items-center gap-1.5">
                      <span>{m.distanceKm} km</span>
                      <span className="opacity-45">•</span>
                      <span>{m.date}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3.5 flex items-center justify-between text-xs border-t border-border/40 pt-3">
                  <span className="font-bold text-accent">+{m.xp} XP</span>
                  <span className="text-muted-foreground/80 font-medium">{m.spotsLeft} cupos restantes</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
