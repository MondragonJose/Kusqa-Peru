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

import type { Region } from "@/types";

/** Configuración de UI para regiones - Fuente única de verdad */
export const REGION_META: Record<
  Region,
  { name: string; gradient: string; color: string; chipBg: string; emoji: string }
> = {
  costa: {
    name: "Costa",
    gradient: "bg-gradient-coast",
    color: "text-coast",
    chipBg: "bg-coast/10 text-coast",
    emoji: "🌊",
  },
  sierra: {
    name: "Sierra",
    gradient: "bg-gradient-andes",
    color: "text-sierra",
    chipBg: "bg-sierra/10 text-sierra",
    emoji: "⛰️",
  },
  selva: {
    name: "Selva",
    gradient: "bg-gradient-jungle",
    color: "text-jungle",
    chipBg: "bg-jungle/10 text-jungle",
    emoji: "🌿",
  },
};

/** Array de regiones para iteración - derivado de REGION_META */
export const REGION_THEMES = Object.entries(REGION_META).map(([id, meta]) => ({
  id: id as Region,
  label: meta.name,
  gradient: meta.gradient,
  emoji: meta.emoji,
}));

/** Badges de región - derivado de REGION_META */
export const REGION_BADGES: Record<"costa" | "sierra" | "selva", string> = {
  costa: "text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400",
  sierra: "text-orange-800 bg-orange-600/10 border-orange-600/20 dark:text-orange-400",
  selva: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400",
};

/** Gradients de nodos de mapa - derivado de REGION_META */
export const REGION_NODE_GRADIENTS: Record<"costa" | "sierra" | "selva", string> = {
  costa: "bg-gradient-coast",
  sierra: "bg-gradient-andes",
  selva: "bg-gradient-jungle",
};
