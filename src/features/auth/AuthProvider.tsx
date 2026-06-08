/**
 * AuthProvider — Bootstrap de sesión Supabase + State Machine
 *
 * Responsabilidad única:
 * - Restaurar sesión desde Supabase en cold start
 * - Escuchar cambios de estado en tiempo real
 * - Exponer estado centralizado vía authState machine
 *
 * NO debe contener lógica de validación de rutas (eso es responsabilidad del componente).
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { AuthSession as Session, AuthUser as User } from "@supabase/supabase-js";
import { deriveAuthState, type AuthStateSnapshot } from "./authStateMachine";

interface AuthContextType {
  /** Estado derivado de la máquina de estados */
  authState: AuthStateSnapshot;
  /** Sesión cruda (para casos especiales que necesiten tokens) */
  session: Session | null;
  /** Usuario de la sesión */
  user: User | null;
  /** @deprecated Use authState.state === 'initializing' */
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  authState: {
    state: "initializing",
    user: null,
    session: null,
    isReady: false,
  },
  session: null,
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Derivar estado centralizado desde sesión + loading
  const authState = deriveAuthState(session, loading, user);

  // Debug log para rastrear transiciones de estado
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[KUSQA AUTH TRACE] AuthProvider state machine:", {
        state: authState.state,
        isReady: authState.isReady,
        userId: authState.user?.id,
      });
    }
  }, [authState.state, authState.isReady]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[KUSQA AUTH TRACE] AuthProvider: Initializing secured session bootstrap");
    }
    let mounted = true;
    let bootstrapComplete = false;

    // 1. Bootstrap inicial: restaurar sesión desde Supabase/localStorage
    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (initialSession) {
          if (import.meta.env.DEV) {
            console.log(
              "[KUSQA AUTH TRACE] Session restored from storage:",
              initialSession.user.id,
            );
          }
          setSession(initialSession);
          setUser(initialSession.user);
        } else {
          if (import.meta.env.DEV) {
            console.log("[KUSQA AUTH TRACE] No session in storage (new user or logged out)");
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[KUSQA AUTH TRACE] Error during session bootstrap:", error);
        }
      } finally {
        if (mounted) {
          // Bootstrap completado → authState pasa a "authenticated" o "unauthenticated"
          bootstrapComplete = true;
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // 2. Listener pasivo: cambios en tiempo real (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!mounted) return;

      // Solo procesar eventos después de que bootstrap inicial complete
      // Evita race condition entre initializeAuth y onAuthStateChange
      if (!bootstrapComplete) {
        if (import.meta.env.DEV) {
          console.log(`[KUSQA AUTH TRACE] Ignoring auth event during bootstrap: ${event}`);
        }
        return;
      }

      if (import.meta.env.DEV) {
        console.log(`[KUSQA AUTH TRACE] Auth state changed: ${event}`, {
          userId: currentSession?.user?.id,
        });
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authState,
        session,
        user,
        loading,
      }}
    >
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

/**
 * Hook único para acceder al estado centralizado de autenticación
 *
 * Reemplaza múltiples checks dispersos de:
 * - if (!user)
 * - if (loading)
 * - if (!session)
 *
 * Retorna una interfaz consistente para routing y componentes
 */
export function useAuthState() {
  const { authState, user } = useAuth();

  return {
    state: authState.state,
    isAuthenticated: authState.state === "authenticated",
    isInitializing: authState.state === "initializing",
    isUnauthenticated: authState.state === "unauthenticated",
    isReady: authState.isReady,
    user: authState.user,
    /** @deprecated Use state directly or isAuthenticated predicate */
    isLoading: authState.state === "initializing",
  };
}
