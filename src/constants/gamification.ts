/**
 * Configuración de gamificación: XP ranges
 * P0 FIX: LEVELS consolidado en src/features/progression/constants/civicRoute.ts (fuente de verdad única)
 * P0 FIX: BADGES consolidado en src/features/badges/constants/civicBadges.ts (fuente de verdad única)
 */

/** Rango de XP por dificultad */
export const XP_BY_DIFFICULTY = {
  Suave: { min: 100, max: 400 },
  Andina: { min: 400, max: 700 },
  Cumbre: { min: 700, max: 1000 },
} as const;

export { REGION_META } from "@/domain/regions";
