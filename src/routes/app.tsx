import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MissionRealtimeSync } from "@/components/MissionRealtimeSync";
import { useAuth } from "@/features/auth/AuthProvider";

function AppRouteComponent() {
  const { session, loading } = useAuth();
  const location = useLocation();

  // Waiting for session to load from AuthProvider
  if (loading) {
    if (import.meta.env.DEV) console.log("[KUSQA ROUTE GUARD TRACE] /app component: loading session...");
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-sm text-muted-foreground">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  // Session check after AuthProvider initialization completes
  if (!session) {
    if (import.meta.env.DEV) console.log("[KUSQA ROUTE GUARD TRACE] /app component: no session, redirecting to /");
    throw redirect({
      to: "/",
      search: { redirect: location.href },
    });
  }

  if (import.meta.env.DEV) console.log("[KUSQA ROUTE GUARD TRACE] /app component: authenticated", { userId: session.user?.id });

  return (
    <AppShell>
      <MissionRealtimeSync />
      <Outlet />
    </AppShell>
  );
}

export const Route = createFileRoute("/app")({
  component: AppRouteComponent,
});
