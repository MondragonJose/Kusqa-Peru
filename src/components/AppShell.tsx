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

type NavItem = { to: string; label: string; icon: typeof Compass; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/app", label: "Inicio", icon: Compass, exact: true },
  { to: "/app/mapa", label: "Mapa de misiones", icon: Map },
  { to: "/app/crear", label: "Crear proyecto", icon: Plus },
  { to: "/app/progreso", label: "Mi expedición", icon: Trophy },
  { to: "/app/notificaciones", label: "Notificaciones", icon: Bell },
  { to: "/app/perfil", label: "Perfil", icon: User },
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
    <div className="min-h-screen bg-background relative">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 bg-mesh opacity-60" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,oklch(0.78_0.17_75/0.2),transparent_50%)]" />

      <div className="relative flex">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:flex sticky top-0 h-screen w-72 flex-col gap-2 border-r border-border/60 bg-sidebar/70 backdrop-blur-xl px-5 py-6 z-30">
          <Link to="/" className="flex items-center gap-2.5 px-2 mb-8">
            <div className="relative h-9 w-9 rounded-xl bg-gradient-sunrise grid place-items-center shadow-glow">
              <span className="text-white font-bold text-lg leading-none">K</span>
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-none">KUSQA</div>
              <div className="text-[10px] text-muted-foreground tracking-widest uppercase mt-1">
                Camina el Perú
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
                    active
                      ? "bg-foreground text-background font-semibold shadow-soft"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" size={18} />
                  <span>{item.label}</span>
                  {item.to === "/app/notificaciones" && (currentUser.missionsDone ?? 0) > 0 && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-accent animate-pulse" />
                  )}
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
        <main className="flex-1 min-w-0 pb-24 lg:pb-8">
          {/* Top bar */}
          <header className="sticky top-0 z-20 glass border-b border-border/60 px-5 lg:px-10 py-3 flex items-center gap-3">
            <Link to="/" className="lg:hidden flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-sunrise grid place-items-center text-white font-bold">
                K
              </div>
            </Link>
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Buscar misiones, distritos, líderes…"
                disabled
                className="w-full rounded-xl border border-border/60 bg-surface/60 backdrop-blur pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 font-medium">
                Próximamente
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-sunrise text-white text-xs font-semibold shadow-soft">
              <span>🔥</span>
              <span>Racha {currentUser.streak} días</span>
            </div>
            <Link
              to="/app/notificaciones"
              className="relative h-9 w-9 grid place-items-center rounded-xl border border-border/60 hover:bg-secondary transition-smooth"
            >
              <Bell className="h-4 w-4" />
              {(currentUser.missionsDone ?? 0) > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />}
            </Link>
          </header>

          <motion.div
            key={path}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="px-5 lg:px-10 py-6 lg:py-8"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Bottom nav - mobile */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-40 glass-strong rounded-2xl shadow-lift px-3 py-3 flex justify-between safe-area-bottom pb-[env(safe-area-inset-bottom)] pb-6">
        {[...NAV.slice(0, 4), NAV[5]].map((item) => {
          const active = item.exact ? path === item.to : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-1.5 rounded-xl px-4 py-3 text-[10px] font-medium transition-smooth min-w-[48px] min-h-[48px] justify-center ${
                active ? "text-accent bg-accent/10" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
