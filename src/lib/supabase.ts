import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase.generated";
import { validateEnv } from "./env";

/**
 * Cliente de Supabase
 * Inicializa con validación de env vars
 * Disponible para usar en services
 * Configurado con persistencia de sesión para OAuth
 */

let _supabase: ReturnType<typeof createClient<Database>> | undefined;

export function getSupabaseClient() {
  if (!_supabase) {
    const env = validateEnv();
    _supabase = createClient<Database>(
      env.VITE_SUPABASE_URL,
      env.VITE_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
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