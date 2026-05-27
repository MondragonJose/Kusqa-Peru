import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MissionRealtimeSync } from "@/components/MissionRealtimeSync";
import { useAuthState } from "@/features/auth";

/**
 * /app route — Requiere autenticación
 * 
 * Usa el estado centralizado para:
 * 1. Esperar bootstrap de sesión (initializing)
 * 2. Validar autenticación sin race conditions
 * 3. Redirigir si no autenticado (después de que isReady = true)
 */
function AppRouteComponent() {
  const { state, isReady, user } = useAuthState();
  const location = useLocation();

  if (import.meta.env.DEV) {
    console.log("[KUSQA ROUTE APP] State machine check:", { state, isReady, userId: user?.id });
  }

  // Estado 1: initializing → Mostrar loading (AuthProvider restaurando sesión)
  if (state === "initializing") {
    if (import.meta.env.DEV) {
      console.log("[KUSQA ROUTE APP] Initializing state: waiting for session bootstrap");
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  // Estado 2: unauthenticated → Redirigir a login (solo después de isReady)
  if (state === "unauthenticated" && isReady) {
    if (import.meta.env.DEV) {
      console.log("[KUSQA ROUTE APP] Unauthenticated state: redirecting to /");
    }
    // Solo pasar redirect param si no es /app mismo para evitar loop
    // Si usuario intentó acceder a /app directamente, no crear loop
    const currentPath = location.pathname;
    const shouldRedirect = currentPath !== "/app" && currentPath !== "/app/";
    throw redirect({
      to: "/",
      search: { redirect: shouldRedirect ? location.href : "" },
    });
  }

  // Estado 3: authenticated → Renderizar app
  if (state === "authenticated") {
    if (import.meta.env.DEV) {
      console.log("[KUSQA ROUTE APP] Authenticated state: rendering app", { userId: user?.id });
    }
    return (
      <AppShell>
        <MissionRealtimeSync />
        <Outlet />
      </AppShell>
    );
  }

  // Fallback defensivo (no debería ocurrir)
  if (import.meta.env.DEV) {
    console.warn("[KUSQA ROUTE APP] Unexpected state:", state);
  }
  return null;
}

export const Route = createFileRoute("/app")({
  component: AppRouteComponent,
});
