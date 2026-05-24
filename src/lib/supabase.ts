import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase.generated";
import { validateEnv } from "./env";

/**
 * Cliente de Supabase
 * Inicializa con validación de env vars
 * Disponible para usar en services
 * Configurado con persistencia de sesión para OAuth
 */

const env = validateEnv();

export const supabase = createClient<Database>(
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