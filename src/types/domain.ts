/**
 * Tipos de dominio principal de KUSQA
 * Entidades del sistema: User, Mission, Badge, Notification
 */

import type { Region, MissionCategory, MissionDifficulty, MapCoords } from "./common";

/** Usuario de KUSQA */
export type User = {
  name: string;
  handle: string;
  district: string;
  region: Region;
  avatar: string;
  xp: number;
  level: number;
  rank: number;
  streak: number;
  // Stats adicionales de gamificación (opcionales)
  hours?: number;
  missionsDone?: number;
  peopleImpacted?: number;
};

/** Organizador de una misión */
export type MissionOrganizer = {
  name: string;
  avatar: string;
};

/** Misión en KUSQA */
export type Mission = {
  id: string;
  title: string;
  description: string;
  district: string;
  region: Region;
  category: MissionCategory;
  xp: number;
  participants: number;
  spotsLeft: number;
  date: string;
  distanceKm: number;
  impact: string;
  difficulty: MissionDifficulty;
  organizer: MissionOrganizer;
  coords: MapCoords;
  emoji: string;
  status?: "proposed" | "active" | "completed";
};

/** Badge o medalla ganada */
export type Badge = {
  id: string;
  name: string;
  emoji: string;
  region: Region | "todas";
  earned: boolean;
  description: string;
};

/** Notificación del sistema */
export type Notification = {
  id: string;
  title: string;
  body: string; // Unified: single description/body field
  type: "mission" | "badge" | "achievement" | "event" | "social" | "level" | "community";
  timestamp: string; // Unified: single time field (e.g. "hace 2h")
  read: boolean; // Unified: single read/unread field (true = already read)
  emoji?: string;
};

/** Progreso territorial del usuario (tabla user_progress) */
export type UserTerritoryProgress = {
  userId: string;
  communityPoints: number;
  totalMissionsCompleted: number;
  lastActivityAt: string;
};

/** Estado de participación usuario–misión (tabla user_missions) */
export type UserMissionStatus = "in_progress" | "completed";

/** Relación usuario–misión con misión de dominio validada */
export type UserMission = {
  id: string;
  userId: string;
  missionId: string;
  status: UserMissionStatus;
  completedAt: string | null;
  xpEarned: number | null;
  mission: Mission;
};

/** Información del usuario en un perfil */
export type UserProfile = {
  user: User;
  badges: Badge[];
  totalMissionsCompleted: number;
  totalImpact: string;
};
