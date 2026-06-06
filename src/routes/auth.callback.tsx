import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/callback" });
  // useRef evita que el efecto se ejecute doble en React StrictMode de forma innecesaria
  const processing = useRef(false);

  useEffect(() => {
    if (processing.current) return;
    processing.current = true;

    if (import.meta.env.DEV)
      console.log("[KUSQA AUTH TRACE] Callback mounted, handling session token...");

    // Declaramos la suscripción y timeout fuera para poder limpiarlos correctamente
    let authSubscription: any = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const handleAuthentication = async () => {
      // 1. Intentar obtener la sesión inmediatamente
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        if (import.meta.env.DEV) console.error("[KUSQA AUTH TRACE] Error getting session:", error);
        window.location.href = "/?error=auth_failed";
        return;
      }

      if (data.session) {
        if (import.meta.env.DEV)
          console.log("[KUSQA AUTH TRACE] Session found immediately:", data.session.user.id);
        window.location.hash = "";
        // Simplified: always navigate to landing with redirect param
        // Landing will decide final destination based on auth state
        // Default to /app if no specific redirect provided
        navigate({ to: "/", search: { redirect: search.redirect || "/app" } });
        return;
      }

      if (import.meta.env.DEV)
        console.log("[KUSQA AUTH TRACE] No immediate session, listening for auth state change...");

      // 2. Timeout fallback para Safari iOS edge case (10s)
      timeoutId = setTimeout(() => {
        if (import.meta.env.DEV)
          console.error("[KUSQA AUTH TRACE] Auth callback timeout - no session received");
        window.location.href = "/?error=auth_timeout";
      }, 10000);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (import.meta.env.DEV) console.log("[KUSQA AUTH TRACE] Auth event captured:", event);

        if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
          if (timeoutId) clearTimeout(timeoutId);
          if (processing.current) {
            window.location.hash = "";
            // Simplified: always navigate to landing with redirect param
            // Landing will decide final destination based on auth state
            navigate({ to: "/", search: { redirect: search.redirect } });
          }
        }
      });

      authSubscription = subscription;
    };

    handleAuthentication();

    // ✅ CORRECCIÓN: El cleanup se devuelve directamente al useEffect
    return () => {
      if (authSubscription) {
        if (import.meta.env.DEV) console.log("[KUSQA AUTH TRACE] Unsubscribing from auth listener");
        authSubscription.unsubscribe();
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [navigate]);

  // Mantenemos tu componente visual original con el spinner animado
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Procesando autenticación...</p>
      </div>
    </div>
  );
}
