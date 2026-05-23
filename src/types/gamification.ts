/**
 * Tipos para el sistema de gamificación de KUSQA
 */

import type { Region } from "./common";

/** Nivel de progresión del usuario */
export type Level = {
  level: number;
  name: string;
  name2?: string;
  from: number;
  to: number;
  region: Region;
};

/** Progreso del usuario en gamificación */
export type GamificationProgress = {
  currentXp: number;
  nextLevelXp: number;
  currentLevel: number;
  progress: number; // 0-100
};

/** Evidencia de una misión completada */
export type EvidenceUpload = {
  id: string;
  missionId: string;
  userId: string;
  type: "photo" | "video" | "document";
  url: string;
  uploadedAt: string;
  status: "pending" | "verified" | "rejected";
};

/** Resultado de una misión */
export type MissionCompletion = {
  missionId: string;
  userId: string;
  completedAt: string;
  xpEarned: number;
  badgeEarned?: string;
};
