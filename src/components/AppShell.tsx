import { Link, useRouterState } from "@tanstack/react-router";
import {
  Compass,
  Map,
  Plus,
  Trophy,
  Bell,
  User,
  Sparkles,
  Search,
} from "lucide-react";
import { useCurrentUser, useUserXpProgress } from "@/features/auth";
import { motion } from "framer-motion";
import { ErrorBoundary } from "./ErrorBoundary";

type NavItem = { to: string; label: string; labelMobile: string; icon: typeof Compass; exact?: boolean };
// P1 FIX: Reducir navegación a 3 items core - eliminar "Crear" y "Notificaciones"
// P0 FIX: Labels mobile explícitos para evitar truncamiento técnico
// P0 FIX: Añadir "Crear" como tab central para acceso directo a creación de proyectos
// P0 FIX: Label más explícito "Crear proyecto" para reforzar core value de la app
const NAV: NavItem[] = [
  { to: "/app", label: "Inicio", labelMobile: "Inicio", icon: Compass, exact: true },
  { to: "/app/mapa", label: "Mapa", labelMobile: "Mapa", icon: Map },
  { to: "/app/crear", label: "Crear proyecto", labelMobile: "Crear", icon: Plus },
  { to: "/app/perfil", label: "Perfil", labelMobile: "Mi perfil", icon: User },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const state = useRouterState();
  const path = state.location.pathname;
  const currentUser = useCurrentUser();
  const { progressPct } = useUserXpProgress();

  // Fallback seguro si currentUser es null (profile no creado aún)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background relative overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 bg-mesh opacity-60" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,oklch(0.78_0.17_75/0.2),transparent_50%)]" />

      {/* Sidebar - desktop */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-screen w-72 flex-col gap-2 border-r border-border/60 bg-sidebar/70 backdrop-blur-xl px-5 py-6 z-30 overflow-y-auto">
          <Link to="/" className="flex items-center gap-2.5 px-2 mb-8">
            <div className="relative h-9 w-9 rounded-xl bg-gradient-sunrise grid place-items-center shadow-glow">
              <span className="text-white font-bold text-lg leading-none">K</span>
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-none">KUSQA</div>
              <div className="text-[10px] text-muted-foreground tracking-widest uppercase mt-1">
                Misiones cívicas
              </div>
            </div>
          </Link>

          <nav className="flex flex-col gap-1">
            {NAV.map((item) => {
              const active = item.exact ? path === item.to : path.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-smooth ${
                    item.to === "/app/crear"
                      ? "bg-gradient-sunrise text-white font-semibold shadow-glow hover:opacity-90"
                      : active
                        ? "bg-foreground text-background font-semibold shadow-soft"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User card */}
          <Link
            to="/app/perfil"
            className="mt-auto rounded-2xl glass p-4 hover:shadow-card transition-smooth"
          >
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-sunrise grid place-items-center text-xl shadow-soft">
                {currentUser.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{currentUser.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  Nivel {currentUser.level} · {currentUser.xp.toLocaleString()} XP
                </div>
              </div>
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-gradient-sunrise"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </Link>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 pb-20 lg:pb-8 lg:ml-72 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex-shrink-0 sticky top-0 z-20 glass border-b border-border/60 px-5 lg:px-10 py-3 flex items-center gap-3">
            <Link to="/" className="lg:hidden flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-sunrise grid place-items-center text-white font-bold">
                K
              </div>
            </Link>
            {/* P1 FIX: Eliminar search bar inactivo - causa confusión */}
            {/* <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar misiones, distritos, líderes…"
                disabled
                className="w-full rounded-xl border border-border/60 bg-surface/60 backdrop-blur pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 font-medium">
                Próximamente
              </span>
            </div> */}
            {/* P0 FIX: Eliminado display de racha - streak siempre es 0 (hardcoded), métrica sin datos reales */}
          </header>

          <div className="flex-1 overflow-y-auto">
            <ErrorBoundary>
              <motion.div
                key={path}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="px-5 lg:px-10 py-6 lg:py-8"
              >
                {children}
              </motion.div>
            </ErrorBoundary>
          </div>
        </main>

        {/* Bottom nav - mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-strong rounded-t-2xl shadow-lift px-3 py-3 flex justify-between safe-area-bottom" style={{paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)"}}>
          {NAV.map((item) => {
            const active = item.exact ? path === item.to : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 text-[10px] font-medium transition-smooth min-w-[48px] min-h-[48px] justify-center ${
                  item.to === "/app/crear"
                    ? "bg-gradient-sunrise text-white shadow-glow"
                    : active
                      ? "text-accent bg-accent/10"
                      : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.labelMobile}</span>
              </Link>
            );
          })}
        </nav>
      </div>
  );
}
