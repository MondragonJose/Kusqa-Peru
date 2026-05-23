/**
 * Service para gamificación
 * Cálculos de progreso, XP, badges y levels
 */

import type { GamificationProgress, Level } from "@/types";
import { LEVELS, XP_BY_DIFFICULTY } from "@/constants";

/**
 * Calcula el progreso actual del usuario
 * @param currentXp XP actual acumulado
 * @returns Información de progreso (nivel, XP al siguiente nivel, porcentaje)
 */
export function calculateProgress(currentXp: number): GamificationProgress {
  // Encontrar el nivel actual
  const currentLevel = LEVELS.find((l) => currentXp >= l.from && currentXp < l.to) || LEVELS[0];
  const nextLevel = LEVELS[currentLevel.level] || currentLevel;
  
  const xpInCurrentLevel = currentXp - currentLevel.from;
  const xpNeededForNext = currentLevel.to - currentLevel.from;
  const progress = Math.round((xpInCurrentLevel / xpNeededForNext) * 100);
  
  return {
    currentXp,
    nextLevelXp: nextLevel.from,
    currentLevel: currentLevel.level,
    progress: Math.min(progress, 100),
  };
}

/**
 * Obtiene el nivel correspondiente a cierto XP
 * @param xp Cantidad de XP acumulado
 * @returns Objeto Level o null si no existe
 */
export function getLevelByXp(xp: number): Level | null {
  return LEVELS.find((l) => xp >= l.from && xp < l.to) || null;
}

/**
 * Calcula XP a recompensar por completar una misión
 * @param difficulty Nivel de dificultad de la misión
 * @returns Cantidad de XP a recompensar
 */
export function calculateXpReward(difficulty: "Suave" | "Andina" | "Cumbre"): number {
  const range = XP_BY_DIFFICULTY[difficulty];
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

/**
 * Obtiene todos los niveles disponibles
 */
export function getLevels(): Level[] {
  return LEVELS;
}
