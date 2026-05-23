import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { JSX } from "react/jsx-runtime";

// 1. AÑADIMOS LOS IMPORTS NECESARIOS
import { useEffect, useState } from "react";
// IMPORTANTE: Ajusta esta ruta según dónde esté tu supabase.ts (ej. "../supabase", "../utils/supabase", etc.)
import { supabase } from "../lib/supabase"; 

// 2. PEGAMOS EL COMPONENTE DE DIAGNÓSTICO (Con tus colores)
export function SupabaseDiagnostic() {
  const [status, setStatus] = useState<{ loading: boolean; text: string; data: any[] }>({
    loading: true,
    text: 'Probando conexión...',
    data: []
  });

  useEffect(() => {
    async function testConnection() {
      try {
        const { data: authData } = await supabase.auth.getUser();
        console.log('[Supabase Test] user:', authData?.user ?? null);

        const { data, error } = await supabase
          .from('missions')
          .select('id, title, status, current_progress')
          .limit(1);

        if (error) throw error;

        console.log('[Supabase Test] ¡Lectura OK!', data);
        setStatus({
          loading: false,
          text: data?.length === 0 
            ? 'Conectado, pero no hay filas (o RLS las bloquea silenciosamente).' 
            : 'Conexión y lectura OK',
          data: data ?? []
        });
      } catch (err: any) {
        console.error('[Supabase Test] Error:', err);
        setStatus({ loading: false, text: `Error: ${err.message}`, data: [] });
      }
    }
    testConnection();
  }, []);

  return (
    <div style={{ padding: '1rem', backgroundColor: 'rgb(23,43,69)', color: '#ffffff', borderRadius: '8px', fontFamily: 'system-ui, sans-serif', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Diagnóstico de Supabase</h3>
      <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>{status.text}</p>
    </div>
  );
}

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing(): JSX.Element {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 mt-4">
          <div className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-4 shadow-soft">
            <Link to="/" className="flex items-center gap-2.5">
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
              <a href="#movimiento" className="hover:text-foreground transition-colors">El movimiento</a>
              <a href="#mapa" className="hover:text-foreground transition-colors">Mapa</a>
              <a href="#expedicion" className="hover:text-foreground transition-colors">Expedición</a>
              <a href="#voces" className="hover:text-foreground transition-colors">Voces</a>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <Link
                to="/app"
                className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground px-3 py-2"
              >
                Ingresar
              </Link>
              <Link
                to="/app"
                className="inline-flex items-center gap-1.5 rounded-xl bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-90 transition-smooth shadow-soft"
              >
                Únete <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-36 pb-24 lg:pt-44 lg:pb-32 px-5 lg:px-8">
        <div className="absolute inset-0 bg-mesh opacity-80" />
        <div className="absolute top-20 -right-20 h-[500px] w-[500px] rounded-full bg-gradient-sunrise opacity-30 blur-3xl animate-float-slow" />
        <div className="absolute bottom-10 -left-32 h-[400px] w-[400px] rounded-full bg-gradient-andes opacity-30 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />

        <div className="relative mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-xs font-medium text-foreground/80 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Movimiento joven · +124 distritos activos esta semana
            </div>
            <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-8xl leading-[0.95] tracking-tight">
              Camina el Perú.
              <br />
              <span className="text-gradient-aurora">Construye legado.</span>
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              KUSQA es la plataforma de la juventud peruana donde sumarte a tu comunidad
              se siente como una expedición. Crea, únete y lidera misiones de impacto
              real, desde tu cuadra hasta los Andes y la Amazonía.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/app"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-sunrise text-white px-6 py-3.5 text-base font-semibold shadow-glow hover:scale-[1.02] transition-smooth"
              >
                Empezar mi expedición
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/app/mapa"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface/60 backdrop-blur px-6 py-3.5 text-base font-semibold hover:bg-surface transition-smooth"
              >
                Ver misiones cerca <MapPin className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-12 flex flex-wrap gap-x-10 gap-y-4">
              {[
                { k: "18,420", v: "jóvenes activos" },
                { k: "1,260", v: "misiones completadas" },
                { k: "24", v: "regiones del Perú" },
              ].map((s) => (
                <div key={s.v}>
                  <div className="font-display text-3xl font-bold">{s.k}</div>
                  <div className="text-sm text-muted-foreground">{s.v}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Floating cards */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl">
            {[
              {
                emoji: "🎨",
                title: "Mural colectivo",
                place: "Barranco · Lima",
                xp: 320,
                rotate: "-rotate-2",
                gradient: "from-accent/20 to-sun/20",
              },
              {
                emoji: "🌱",
                title: "Reforestación",
                place: "Chinchero · Cusco",
                xp: 540,
                rotate: "rotate-1",
                gradient: "from-jungle/20 to-sierra/20",
              },
              {
                emoji: "🛶",
                title: "Limpieza del río",
                place: "Iquitos · Loreto",
                xp: 680,
                rotate: "-rotate-1",
                gradient: "from-coast/20 to-jungle/20",
              },
            ].map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.1 }}
                className={`glass-strong rounded-2xl p-5 shadow-card hover:shadow-lift transition-smooth ${c.rotate} hover:rotate-0`}
              >
                <div className={`h-32 rounded-xl bg-gradient-to-br ${c.gradient} grid place-items-center text-5xl mb-4`}>
                  {c.emoji}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {c.place}
                </div>
                <div className="font-display font-semibold mt-1">{c.title}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs px-2 py-1 rounded-full bg-secondary font-medium">
                    +{c.xp} XP
                  </span>
                  <span className="text-xs text-accent font-semibold">Únete →</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Movement */}
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
                Es una <span className="text-gradient-sunrise">expedición</span> colectiva.
              </h2>
              <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
                Inspirado en el Qhapaq Ñan, KUSQA convierte tu participación cívica en un
                viaje a través del Perú. Cada misión cumplida abre nuevos caminos, nuevos
                lugares simbólicos y nuevas formas de construir comunidad.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  { icon: Compass, title: "Descubre tu cuadra", body: "Misiones hiperlocales que aparecen en tu mapa según donde estés." },
                  { icon: Users, title: "Conecta con tu generación", body: "Equipos, retos entre distritos y comunidad activa 24/7." },
                  { icon: Trophy, title: "Crece como líder", body: "Sube de nivel, desbloquea insignias y lidera tus propios proyectos." },
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
              <div className="relative glass-strong rounded-3xl p-6 shadow-lift">
                <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-4">
                  Elige tu paisaje
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: "Costa", icon: Waves, gradient: "bg-gradient-coast", desc: "Surcos del mar" },
                    { name: "Sierra", icon: Mountain, gradient: "bg-gradient-andes", desc: "Rutas del Ande" },
                    { name: "Selva", icon: Trees, gradient: "bg-gradient-jungle", desc: "Corazón verde" },
                  ].map((r) => (
                    <div
                      key={r.name}
                      className={`relative overflow-hidden rounded-2xl ${r.gradient} p-5 aspect-[3/4] text-white shadow-card hover:scale-[1.03] transition-smooth cursor-pointer`}
                    >
                      <r.icon className="h-6 w-6 mb-auto" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="font-display font-bold text-xl">{r.name}</div>
                        <div className="text-xs opacity-80">{r.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-2xl bg-secondary p-4 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-accent shrink-0" />
                  <div className="text-sm">
                    Personaliza tu avatar y fondo con la identidad de tu distrito.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Progression visual */}
      <section id="expedicion" className="px-5 lg:px-8 py-24 relative">
        <div className="absolute inset-0 bg-gradient-andes opacity-95" />
        <div className="absolute inset-0 bg-mesh opacity-40" />
        <div className="relative mx-auto max-w-7xl text-white">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-widest text-sun font-semibold">
              Tu expedición
            </div>
            <h2 className="font-display font-bold text-4xl lg:text-5xl mt-3 leading-tight">
              De vecino activo a líder Kusqa.
            </h2>
            <p className="mt-5 text-white/70 text-lg leading-relaxed">
              Cada misión te lleva más alto en una ruta inspirada en los caminos
              ancestrales. Sube por la costa, atraviesa los Andes, llega a la
              Amazonía y deja huella en el camino.
            </p>
          </div>

          {/* Path */}
          <div className="mt-14 relative">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 300" fill="none" preserveAspectRatio="none">
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
            <div className="relative grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { lvl: 1, name: "Caminante", emoji: "🚶", active: true },
                { lvl: 2, name: "Vecino", emoji: "🏘️", active: true },
                { lvl: 3, name: "Sembrador", emoji: "🌱", active: true },
                { lvl: 4, name: "Guía", emoji: "⛰️", active: false, current: true },
                { lvl: 7, name: "Líder Kusqa", emoji: "🏆", active: false },
              ].map((s) => (
                <div key={s.lvl} className="relative">
                  <div
                    className={`aspect-square rounded-2xl grid place-items-center text-4xl ${
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
                  <div className="mt-3 text-center">
                    <div className="text-[10px] uppercase tracking-widest text-white/50">
                      Nivel {s.lvl}
                    </div>
                    <div className="font-semibold text-sm">{s.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Voices */}
      <section id="voces" className="px-5 lg:px-8 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto">
            <div className="text-xs uppercase tracking-widest text-accent font-semibold">
              Voces del movimiento
            </div>
            <h2 className="font-display font-bold text-4xl lg:text-5xl mt-3">
              Jóvenes construyendo el Perú que sueñan.
            </h2>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-5">
            {[
              {
                quote: "Antes pensaba que para cambiar algo había que esperar a ser grande. KUSQA me mostró que mi cuadra ya cuenta.",
                name: "Mateo, 19",
                place: "Trujillo",
                emoji: "🌊",
              },
              {
                quote: "Sembrar queuñas en Chinchero con otros chicos fue lo más bonito que hice este año. Me hice amigos de toda la sierra.",
                name: "Sayri, 22",
                place: "Cusco",
                emoji: "🌱",
              },
              {
                quote: "Pude organizar mi primer proyecto de clases de código. Hoy tengo 40 mentores y un cuarto nivel desbloqueado.",
                name: "Camila, 24",
                place: "Lima",
                emoji: "💻",
              },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl glass p-6 shadow-soft hover:shadow-card transition-smooth">
                <div className="text-3xl">{t.emoji}</div>
                <p className="mt-4 text-foreground leading-relaxed">"{t.quote}"</p>
                <div className="mt-5 pt-5 border-t border-border/50 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.place}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 lg:px-8 pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-sunrise p-10 lg:p-16 text-center text-white shadow-lift">
            <div className="absolute inset-0 bg-mesh opacity-30" />
            <div className="relative">
              <h2 className="font-display font-bold text-4xl lg:text-6xl leading-tight">
                Tu legado empieza
                <br />
                en tu próxima cuadra.
              </h2>
              <p className="mt-5 text-white/90 max-w-xl mx-auto text-lg">
                Súmate a la generación que está caminando el Perú con propósito.
              </p>
              <Link
                to="/app"
                className="mt-9 inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-8 py-4 font-semibold hover:scale-[1.03] transition-smooth shadow-card"
              >
                Empezar gratis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-5 lg:px-8 pb-10">
        <div className="mx-auto max-w-7xl border-t border-border/60 pt-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-sunrise grid place-items-center text-white text-xs font-bold">K</div>
            <span className="font-display font-semibold text-foreground">KUSQA</span>
            <span>· Camina el Perú, construye legado.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground">Manifiesto</a>
            <a href="#" className="hover:text-foreground">Aliados</a>
            <a href="#" className="hover:text-foreground">Contacto</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
