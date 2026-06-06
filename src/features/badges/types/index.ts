/**
 * Tipos del sistema de insignias cívicas de KUSQA
 * Las insignias son artefactos de identidad, no trofeos de videojuego.
 */

import type { Region } from "@/types";

/** Rareza de la insignia — de menor a mayor */
export type BadgeRarity = "común" | "raro" | "épico" | "legendario";

/** Categoría cívica de la insignia */
export type BadgeCategory =
  | "territorial"
  | "social"
  | "liderazgo"
  | "ambiental"
  | "cultural"
  | "fundacional";

/** Insignia cívica de KUSQA */
export type CivicBadge = {
  id: string;
  /** Nombre de la insignia */
  name: string;
  /** Emoji visual */
  emoji: string;
  /** Rareza */
  rarity: BadgeRarity;
  /** Categoría cívica */
  category: BadgeCategory;
  /** Región territorial */
  region: Region | "nacional";
  /** Narrativa de la insignia — su historia */
  narrative: string;
  /** Condición de desbloqueo, lenguaje humano */
  unlockCondition: string;
  /** Si el usuario la tiene desbloqueada */
  earned: boolean;
  /** Fecha de obtención (ISO string) */
  earnedAt?: string;
};

/** Mapa de colores por rareza */
export const RARITY_STYLES: Record<
  BadgeRarity,
  {
    label: string;
    ringClass: string;
    glowClass: string;
    textClass: string;
    bgClass: string;
  }
> = {
  común: {
    label: "Común",
    ringClass: "ring-border",
    glowClass: "badge-rarity-comun",
    textClass: "text-muted-foreground",
    bgClass: "bg-secondary",
  },
  raro: {
    label: "Raro",
    ringClass: "ring-coast/50",
    glowClass: "badge-rarity-raro",
    textClass: "text-coast",
    bgClass: "bg-coast/10",
  },
  épico: {
    label: "Épico",
    ringClass: "ring-sierra/50",
    glowClass: "badge-rarity-epico",
    textClass: "text-sierra",
    bgClass: "bg-sierra/10",
  },
  legendario: {
    label: "Legendario",
    ringClass: "ring-accent/60",
    glowClass: "badge-rarity-legendario",
    textClass: "text-accent",
    bgClass: "bg-gradient-sunrise",
  },
};
