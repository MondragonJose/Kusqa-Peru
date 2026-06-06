/**
 * useLogout — Logout hook
 * Llama a supabase.auth.signOut(), limpia cache y redirect a /
 */

import { useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logout = useCallback(async () => {
    if (import.meta.env.DEV) {
      console.log("[KUSQA AUTH TRACE] Initiating logout");
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[KUSQA AUTH TRACE] Logout error:", error);
      throw error;
    }

    if (import.meta.env.DEV) {
      console.log("[KUSQA AUTH TRACE] Logout successful, clearing cache");
    }

    // Limpiar cache de React Query
    queryClient.clear();

    // Redirect a /
    navigate({ to: "/", search: { redirect: undefined } });
  }, [navigate, queryClient]);

  return { logout };
}
