/**
 * Utilidades para cálculos de progreso y XP
 */


/**
 * Formatea XP para mostrar (ej: 4,280 XP)
 */
export function formatXp(xp: number): string {
  return xp.toLocaleString("es-PE");
}

/**
 * Calcula el porcentaje de progreso hacia el siguiente nivel
 * @param currentXp XP actual
 * @param nextLevelXp XP requerido para el siguiente nivel
 * @returns Porcentaje (0-100)
 */
export function calculateProgressPercentage(
  currentXp: number,
  nextLevelXp: number
): number {
  if (nextLevelXp === 0) return 100;
  const percentage = (currentXp / nextLevelXp) * 100;
  return Math.min(Math.max(percentage, 0), 100);
}

/**
 * Retorna el color de badge según progreso
 */
export function getProgressColor(progress: number): string {
  if (progress < 25) return "bg-red-500";
  if (progress < 50) return "bg-yellow-500";
  if (progress < 75) return "bg-blue-500";
  return "bg-green-500";
}
