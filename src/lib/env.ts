/**
 * Validación de variables de entorno
 * Usa Zod para garantizar que todas las env vars requeridas existen y tienen tipos correctos
 *
 * Ejecuta al startup de la app para fallar rápido si faltan configs
 */

import { z } from "zod";

/**
 * Schema de validación para env vars de Vite
 * Nota: En Vite, las vars de env están en import.meta.env
 */
const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url("VITE_SUPABASE_URL must be a valid URL"),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, "VITE_SUPABASE_ANON_KEY seems invalid (too short)"),
});

type EnvType = z.infer<typeof EnvSchema>;

/**
 * Valida env vars al iniciar la app
 * Lanza error si faltan o son inválidas
 */
export function validateEnv(): EnvType {
  try {
    const env = {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    };

    if (import.meta.env.DEV) {
      console.log("[env] Validating environment variables...");
    }
    const validated = EnvSchema.parse(env);
    if (import.meta.env.DEV) {
      console.log("[env] ✅ Environment variables valid");
    }

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[env] ❌ Environment validation failed:");
      error.errors.forEach((e) => {
        console.error(`   - ${e.path.join(".")}: ${e.message}`);
      });
    }
    throw new Error("Invalid environment configuration");
  }
}

/**
 * Devuelve vars de env validadas
 * Se puede llamar en cualquier lugar de la app
 */
export function getEnv(): EnvType {
  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  };
}
