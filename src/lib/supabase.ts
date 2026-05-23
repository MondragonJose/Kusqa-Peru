import { createClient } from "@supabase/supabase-js";
import { validateEnv } from "./env";

/**
 * Cliente de Supabase
 * Inicializa con validación de env vars
 * Disponible para usar en services
 */

const env = validateEnv();

export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);