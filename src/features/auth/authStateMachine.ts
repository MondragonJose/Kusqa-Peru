/**
 * Auth State Machine — Centraliza la lógica de autenticación
 *
 * Propósito:
 * - Unificar el estado de autenticación en un solo lugar
 * - Eliminar lógica duplicada entre router y componentes
 * - Garantizar transiciones de estado predecibles
 * - Evitar race conditions entre bootstrap y routing
 *
 * Estados:
 * - initializing: Restaurando sesión desde localStorage (cold start)
 * - authenticated: Usuario autenticado con sesión válida
 * - unauthenticated: Sin sesión o logout completado
 */

import type { Session, User } from "@supabase/supabase-js";

export type AuthState = "initializing" | "authenticated" | "unauthenticated";

export interface AuthStateSnapshot {
  state: AuthState;
  user: User | null;
  session: Session | null;
  isReady: boolean;
}

/**
 * Deriva el estado de autenticación actual basado en:
 * - session: Sesión desde Supabase (null si no hay)
 * - loading: Si el bootstrap inicial está en progreso
 * - user: Usuario de la sesión
 */
export function deriveAuthState(
  session: Session | null,
  loading: boolean,
  user: User | null,
): AuthStateSnapshot {
  // Mientras AuthProvider está restaurando sesión → initializing
  if (loading) {
    return {
      state: "initializing",
      user: null,
      session: null,
      isReady: false,
    };
  }

  // Bootstrap completado: tenemos sesión → authenticated
  if (session && user) {
    return {
      state: "authenticated",
      user,
      session,
      isReady: true,
    };
  }

  // Bootstrap completado: sin sesión → unauthenticated
  return {
    state: "unauthenticated",
    user: null,
    session: null,
    isReady: true,
  };
}

/**
 * Predicados para verificar estado
 */
export function isAuthenticated(state: AuthState): boolean {
  return state === "authenticated";
}

export function isInitializing(state: AuthState): boolean {
  return state === "initializing";
}

export function isUnauthenticated(state: AuthState): boolean {
  return state === "unauthenticated";
}
