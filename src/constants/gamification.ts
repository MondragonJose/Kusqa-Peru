/**
 * Configuración de gamificación: Badges, Levels, XP ranges
 */

import type { Badge, Level } from "@/types";

export const BADGES: Badge[] = [
  { id: "1", name: "Primer paso", emoji: "🌅", region: "todas", earned: true, description: "Tu primera misión completada" },
  { id: "2", name: "Vecino activo", emoji: "🏘️", region: "costa", earned: true, description: "5 misiones en tu distrito" },
  { id: "3", name: "Sembrador", emoji: "🌱", region: "sierra", earned: true, description: "Plantaste tu primer árbol" },
  { id: "4", name: "Pez del Itaya", emoji: "🐟", region: "selva", earned: false, description: "Misión en la Amazonía" },
  { id: "5", name: "Mentor", emoji: "🎓", region: "todas", earned: true, description: "Enseñaste a 10 personas" },
  { id: "6", name: "Cumbre andina", emoji: "🏔️", region: "sierra", earned: false, description: "Llega a +4000 msnm" },
  { id: "7", name: "Marea limpia", emoji: "🌊", region: "costa", earned: false, description: "Limpieza de playa" },
  { id: "8", name: "Voz del barrio", emoji: "📣", region: "todas", earned: false, description: "Lidera un proyecto propio" },
];

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
