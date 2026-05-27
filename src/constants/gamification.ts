/**
 * Configuración de gamificación: Levels, XP ranges
 * P0 FIX: BADGES consolidado en src/features/badges/constants/civicBadges.ts (fuente de verdad única)
 */

import type { Level } from "@/types";

export const LEVELS: Level[] = [
  { level: 1, name: "Caminante", from: 0, to: 500, region: "costa" },
  { level: 2, name: "Vecino", name2: "del litoral", from: 500, to: 1500, region: "costa" },
  { level: 3, name: "Sembrador", from: 1500, to: 3500, region: "sierra" },
  { level: 4, name: "Guía del valle", from: 3500, to: 6500, region: "sierra" },
  { level: 5, name: "Explorador", from: 6500, to: 10500, region: "selva" },
  { level: 6, name: "Voz del río", from: 10500, to: 16000, region: "selva" },
  { level: 7, name: "Líder Kusqa", from: 16000, to: 25000, region: "sierra" },
];

/** Rango de XP por dificultad */
export const XP_BY_DIFFICULTY = {
  "Suave": { min: 100, max: 400 },
  "Andina": { min: 400, max: 700 },
  "Cumbre": { min: 700, max: 1000 },
} as const;

/** Configuración de UI para regiones */
export const REGION_META = {
  costa: {
    name: "Costa",
    gradient: "bg-gradient-coast",
    color: "text-coast",
    chipBg: "bg-coast/10 text-coast",
  },
  sierra: {
    name: "Sierra",
    gradient: "bg-gradient-mountain",
    color: "text-sierra",
    chipBg: "bg-sierra/10 text-sierra",
  },
  selva: {
    name: "Selva",
    gradient: "bg-gradient-jungle",
    color: "text-jungle",
    chipBg: "bg-jungle/10 text-jungle",
  },
};
