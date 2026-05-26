import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase.generated";
import { validateEnv } from "./env";

/**
 * Cliente de Supabase
 * Inicializa con validación de env vars
 * Disponible para usar en services
 * Configurado con persistencia de sesión para OAuth en cliente
 * Durante SSR (Node.js): persistSession deshabilitado (no existe localStorage)
 */

let _supabase: ReturnType<typeof createClient<Database>> | undefined;

const isSSR = typeof window === "undefined";

export function getSupabaseClient() {
  if (!_supabase) {
    const env = validateEnv();
    _supabase = createClient<Database>(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: !isSSR,
          autoRefreshToken: !isSSR,
          detectSessionInUrl: !isSSR,
        },
      }
    );
  }
  return _supabase;
}

export const supabase = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(_target, prop) {
    return (getSupabaseClient() as any)[prop];
  },
});