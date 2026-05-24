/**
 * Tipos del sistema de progresión cívica de KUSQA
 * Ruta KUSQA — inspirada en el Qhapaq Ñan y los paisajes del Perú
 */

import type { Region } from "@/types";

/** Estado de un tramo de la ruta */
export type StageStatus = "locked" | "reached" | "current" | "completed";

/** Un hito dentro de un tramo de la ruta */
export type StageMilestone = {
  id: string;
  label: string;
  xpRequired: number;
  unlockLabel?: string;
};

/** Un tramo de la Ruta KUSQA */
export type ProgressionStage = {
  level: number;
  /** Nombre cívico del tramo */
  name: string;
  /** Subtítulo narrativo del terreno */
  terrain: string;
  /** Región geográfica del Perú */
  region: Region | "cumbre";
  /** Emoji del terreno */
  icon: string;
  /** Descripción narrativa inmersiva */
  narrative: string;
  /** XP de inicio del tramo */
  xpFrom: number;
  /** XP de fin del tramo */
  xpTo: number;
  /** Clase de gradiente CSS del terreno */
  gradientClass: string;
  /** Hitos dentro del tramo */
  milestones: StageMilestone[];
  /** Qué desbloquea al alcanzar este nivel */
  unlocks: string[];
};

/** Estado de la expedición del usuario */
export type UserProgression = {
  currentStage: ProgressionStage;
  previousStages: ProgressionStage[];
  nextStage: ProgressionStage | null;
  progressPct: number;
  xpInStage: number;
  xpToNextStage: number;
  status: StageStatus;
};
