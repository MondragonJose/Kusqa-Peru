import { z } from "zod";

const booleanCoerce = z
  .union([z.literal("true"), z.literal("false"), z.boolean()])
  .transform((v) => (typeof v === "boolean" ? v : v === "true"));

const EnvSchema = z.object({
  VITE_SUPABASE_URL: z.string().url("VITE_SUPABASE_URL must be a valid URL"),
  VITE_SUPABASE_ANON_KEY: z.string().min(20, "VITE_SUPABASE_ANON_KEY seems invalid (too short)"),

  // Feature flags (all optional, default false)
  VITE_USE_LIVE_USER: booleanCoerce.optional().default("false"),
  VITE_USE_RPC_TRANSACTIONS: booleanCoerce.optional().default("false"),
  VITE_USE_REALTIME_SYNC: booleanCoerce.optional().default("false"),
  VITE_EVIDENCE_UPLOAD_ENABLED: booleanCoerce.optional().default("false"),
  VITE_TELEMETRY_ENABLED: booleanCoerce.optional().default("false"),
  VITE_USE_INITIATIVE_READ_MODEL: booleanCoerce.optional().default("false"),
  VITE_MUNICIPAL_COLLAB: booleanCoerce.optional().default("false"),

  // Optional API keys
  VITE_GOOGLE_MAPS_API_KEY: z.string().optional().default(""),
  VITE_SENTRY_DSN: z.string().optional().default(""),
  VITE_POSTHOG_KEY: z.string().optional().default(""),
});

type EnvType = z.infer<typeof EnvSchema>;

export function validateEnv(): EnvType {
  try {
    const env = {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      VITE_USE_LIVE_USER: import.meta.env.VITE_USE_LIVE_USER,
      VITE_USE_RPC_TRANSACTIONS: import.meta.env.VITE_USE_RPC_TRANSACTIONS,
      VITE_USE_REALTIME_SYNC: import.meta.env.VITE_USE_REALTIME_SYNC,
      VITE_EVIDENCE_UPLOAD_ENABLED: import.meta.env.VITE_EVIDENCE_UPLOAD_ENABLED,
      VITE_TELEMETRY_ENABLED: import.meta.env.VITE_TELEMETRY_ENABLED,
      VITE_USE_INITIATIVE_READ_MODEL: import.meta.env.VITE_USE_INITIATIVE_READ_MODEL,
      VITE_MUNICIPAL_COLLAB: import.meta.env.VITE_MUNICIPAL_COLLAB,
      VITE_GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
      VITE_POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY,
    };

    if (import.meta.env.DEV) {
      console.log("[env] Validating environment variables...");
    }
    const validated = EnvSchema.parse(env);
    if (import.meta.env.DEV) {
      console.log("[env] Environment variables valid");
      if (validated.VITE_USE_REALTIME_SYNC) console.log("[env]   Realtime sync: ON");
      if (validated.VITE_EVIDENCE_UPLOAD_ENABLED) console.log("[env]   Evidence upload: ON");
      if (validated.VITE_TELEMETRY_ENABLED) console.log("[env]   Telemetry: ON");
    }

    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("[env] Environment validation failed:");
      error.errors.forEach((e) => {
        console.error(`   - ${e.path.join(".")}: ${e.message}`);
      });
    }
    throw new Error("Invalid environment configuration");
  }
}

export function getEnv(): EnvType {
  return {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_USE_LIVE_USER: import.meta.env.VITE_USE_LIVE_USER,
    VITE_USE_RPC_TRANSACTIONS: import.meta.env.VITE_USE_RPC_TRANSACTIONS,
    VITE_USE_REALTIME_SYNC: import.meta.env.VITE_USE_REALTIME_SYNC,
    VITE_EVIDENCE_UPLOAD_ENABLED: import.meta.env.VITE_EVIDENCE_UPLOAD_ENABLED,
    VITE_TELEMETRY_ENABLED: import.meta.env.VITE_TELEMETRY_ENABLED,
    VITE_USE_INITIATIVE_READ_MODEL: import.meta.env.VITE_USE_INITIATIVE_READ_MODEL,
    VITE_MUNICIPAL_COLLAB: import.meta.env.VITE_MUNICIPAL_COLLAB,
    VITE_GOOGLE_MAPS_API_KEY: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
    VITE_POSTHOG_KEY: import.meta.env.VITE_POSTHOG_KEY,
  };
}
