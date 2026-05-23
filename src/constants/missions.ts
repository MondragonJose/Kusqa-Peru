/**
 * Categorías y configuración de misiones
 */

import type { MissionCategory } from "@/types";

export const MISSION_CATEGORIES: MissionCategory[] = [
  "Medio ambiente",
  "Educación",
  "Arte & cultura",
  "Comunidad",
  "Salud",
  "Tecnología",
];

import { LucideIcon } from "lucide-react";

/** Pasos para crear una nueva misión */
export type CreationStep = {
  n: number;
  name: string;
  icon: LucideIcon;
};

export const MISSION_CREATION_STEPS: CreationStep[] = [];

/** Límites y configuración de misiones */
export const MISSION_LIMITS = {
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_PARTICIPANTS: 500,
  MIN_XP_REWARD: 100,
  MAX_XP_REWARD: 1000,
} as const;
