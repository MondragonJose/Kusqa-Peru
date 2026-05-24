/**
 * AuthProvider — Bootstrap de sesión Supabase (Optimizado)
 * Maneja de forma segura el inicio de sesión único, estados de carga y cambios de auth.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Debug log for auth state changes
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[KUSQA AUTH TRACE] AuthProvider state:", { loading, userId: user?.id, hasSession: !!session });
    }
  }, [loading, user, session]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[KUSQA AUTH TRACE] AuthProvider: Initializing secured session bootstrap");
    }
    let mounted = true;

    // 1. Ejecutar la carga inicial de la sesión de manera aislada
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (initialSession) {
          if (import.meta.env.DEV) {
            console.log("[KUSQA AUTH TRACE] Initial session resolved:", initialSession.user.id);
          }
          setSession(initialSession);
          setUser(initialSession.user);
        } else {
          if (import.meta.env.DEV) {
            console.log("[KUSQA AUTH TRACE] No initial session found");
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error("[KUSQA AUTH TRACE] Error bootstrapping auth session:", error);
      } finally {
        if (mounted) {
          // El estado de carga inicial SOLO se apaga cuando termina de revisar la sesión local
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // 2. Escuchar de forma pasiva eventos en tiempo real (login, logout, token refrescado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;
      if (import.meta.env.DEV) {
        console.log(`[KUSQA AUTH TRACE] Auth state changed event: ${event}`, currentSession?.user?.id);
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // Respaldo por si ocurre un evento de login reactivo antes de que termine el bootstrap inicial
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}