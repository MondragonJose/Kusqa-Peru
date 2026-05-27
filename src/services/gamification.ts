/**
 * Service para gamificación
 * Cálculos de progreso, XP, badges y levels
 */

import type { GamificationProgress, Level } from "@/types";
import { CIVIC_ROUTE } from "@/features/progression/constants/civicRoute";
import { XP_BY_DIFFICULTY } from "@/constants/gamification";

/**
 * Calcula el progreso actual del usuario
 * @param currentXp XP actual acumulado
 * @returns Información de progreso (nivel, XP al siguiente nivel, porcentaje)
 */
export function calculateProgress(currentXp: number): GamificationProgress {
  // Encontrar el nivel actual
  const currentLevel = CIVIC_ROUTE.find((l) => currentXp >= l.xpFrom && currentXp < l.xpTo) || CIVIC_ROUTE[0];
  const nextLevel = CIVIC_ROUTE[currentLevel.level] || currentLevel;
  
  const xpInCurrentLevel = currentXp - currentLevel.xpFrom;
  const xpNeededForNext = currentLevel.xpTo - currentLevel.xpFrom;
  const progress = Math.round((xpInCurrentLevel / xpNeededForNext) * 100);
  
  return {
    currentXp,
    nextLevelXp: nextLevel.xpFrom,
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
  const stage = CIVIC_ROUTE.find((l) => xp >= l.xpFrom && xp < l.xpTo) || null;
  if (!stage) return null;
  // Mapear "cumbre" a "sierra" para compatibilidad con tipo Level
  const region = stage.region === "cumbre" ? "sierra" : stage.region;
  return {
    level: stage.level,
    name: stage.name,
    name2: undefined,
    from: stage.xpFrom,
    to: stage.xpTo,
    region,
  };
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
  return CIVIC_ROUTE.map((stage) => {
    // Mapear "cumbre" a "sierra" para compatibilidad con tipo Level
    const region = stage.region === "cumbre" ? "sierra" : stage.region;
    return {
      level: stage.level,
      name: stage.name,
      name2: undefined,
      from: stage.xpFrom,
      to: stage.xpTo,
      region,
    };
  });
}
