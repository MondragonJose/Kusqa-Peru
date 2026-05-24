import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { MissionRealtimeSync } from "@/components/MissionRealtimeSync";

export const Route = createFileRoute("/app")({
  beforeLoad: async ({ location }) => {
    if (import.meta.env.DEV) console.log("[KUSQA ROUTE GUARD TRACE] /app beforeLoad:", { path: location.pathname });

    const { supabase } = await import("@/lib/supabase");
    const { data: { session } } = await supabase.auth.getSession();

    if (import.meta.env.DEV) console.log("[KUSQA ROUTE GUARD TRACE] /app auth check:", { userId: session?.user?.id, authenticated: !!session });

    if (!session) {
      if (import.meta.env.DEV) console.log("[KUSQA ROUTE GUARD TRACE] /app redirecting to / (unauthenticated)");
      throw redirect({
        to: "/",
        search: { redirect: location.href },
      });
    }
  },
  component: () => (
    <AppShell>
      <MissionRealtimeSync />
      <Outlet />
    </AppShell>
  ),
});
