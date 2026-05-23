/**
 * Utilidades para badges y achievements
 */

import type { Badge } from "@/types";

/**
 * Obtiene el ícono emoji de un badge
 */
export function getBadgeEmoji(badge: Badge): string {
  return badge.emoji;
}

/**
 * Verifica si un badge está desbloqueado
 */
export function isBadgeEarned(badge: Badge): boolean {
  return badge.earned;
}

/**
 * Filtra badges por región
 */
export function filterBadgesByRegion(badges: Badge[], region: string): Badge[] {
  return badges.filter((b) => b.region === "todas" || b.region === region);
}

/**
 * Obtiene badges ganados únicamente
 */
export function getEarnedBadges(badges: Badge[]): Badge[] {
  return badges.filter((b) => b.earned);
}

/**
 * Obtiene badges aún no desbloqueados
 */
export function getLockedBadges(badges: Badge[]): Badge[] {
  return badges.filter((b) => !b.earned);
}

/**
 * Cuenta cuántos badges ha ganado el usuario
 */
export function countEarnedBadges(badges: Badge[]): number {
  return getEarnedBadges(badges).length;
}
