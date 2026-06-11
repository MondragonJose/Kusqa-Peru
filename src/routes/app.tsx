import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { MissionRealtimeSync } from "@/components/MissionRealtimeSync";
import { useAuthState } from "@/features/auth";
import { useEventPropagation } from "@/hooks/useEventPropagation";
import { useEventHydrationBootstrap } from "@/hooks/useEventHydrationBootstrap";

function AppRouteComponent() {
  const queryClient = useQueryClient();
  useEventPropagation(queryClient);
  const { state, isReady, user } = useAuthState();
  useEventHydrationBootstrap(user?.id);

  // Estado 1: initializing → Mostrar loading (AuthProvider restaurando sesión)
  if (state === "initializing") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  // The following routes require authentication for their functionality,
  // but the layout itself does not gate them — individual route components
  // handle auth requirements with intent-based guards (redirect or CTA gating).
  //
  // Anonymous users can browse:
  //   /app, /app/mapa, /app/mision/:id, /app/propuesta/:id,
  //   /app/perfil/:userId, /app/distrito/:slug
  //
  // Personal routes guard themselves:
  //   /app/perfil, /app/progreso, /app/notificaciones, /app/crear

  const isAnonymous = state === "unauthenticated" && isReady;

  return (
    <AppShell isAnonymous={isAnonymous}>
      <MissionRealtimeSync />
      <Outlet />
    </AppShell>
  );
}

export const Route = createFileRoute("/app")({
  component: AppRouteComponent,
});
