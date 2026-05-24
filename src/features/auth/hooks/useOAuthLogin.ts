/**
 * useOAuthLogin — Google OAuth login hook
 * Llama a supabase.auth.signInWithOAuth con redirect a /auth/callback
 */

import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { betaEvents } from "@/lib/telemetry/betaLogger";

export function useOAuthLogin() {
  const loginWithGoogle = useCallback(async () => {
    if (import.meta.env.DEV) {
      console.log("[KUSQA AUTH TRACE] Initiating Google OAuth login");
    }

    betaEvents.authStart("google");

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("[KUSQA AUTH TRACE] OAuth login error:", error);
        betaEvents.authError("google", error.message);
        toast.error("Error al iniciar sesión", {
          description: "No pudimos conectar con Google. Verifica tu conexión.",
        });
        throw error;
      }

      betaEvents.authSuccess("google");

      if (import.meta.env.DEV) {
        console.log("[KUSQA AUTH TRACE] OAuth login initiated, redirecting to Google");
      }
      return data;
    } catch (err) {
      console.error("[KUSQA AUTH TRACE] OAuth login network error:", err);
      betaEvents.authError("google", err instanceof Error ? err.message : "network_error");
      toast.error("Error de conexión", {
        description: "Verifica tu conexión a internet e intenta nuevamente.",
      });
      throw err;
    }
  }, []);

  return { loginWithGoogle };
}
