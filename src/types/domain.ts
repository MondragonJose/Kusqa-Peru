/**
 * Tipos de dominio principal de KUSQA
 * Entidades del sistema: User, Mission, Badge, Notification
 */

import type { Region, MissionCategory, MissionDifficulty, MapCoords } from "./common";
import type { MissionLifecycleInfo } from "./lifecycle";
import type { CompletionState } from "./evidence";

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
type MissionOrganizer = {
  name: string;
  avatar: string;
};

/** Misión en KUSQA */
export type Mission = {
  id: string;
  title: string;
  description: string;
  district: string;
  /** Phase 4C.1: optional FK to `districts.id`. Optional so legacy
   *  rows and seed mocks that haven't been back-filled still typecheck.
   *  New writes should always include this. */
  districtId?: string | null;
  region: Region;
  category: MissionCategory;
  xp: number;
  participants: number;
  spotsLeft: number;
  date: string | null;
  distanceKm: number | null;
  impact: string | null;
  difficulty: MissionDifficulty | null;
  organizer: MissionOrganizer | null;
  coords: MapCoords;
  emoji: string;
  status?: "proposed" | "active" | "completed";
  startDate: string | null;
  endDate: string | null;
  lifecycleInfo: MissionLifecycleInfo;
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
  completionState: CompletionState;
  joinedAt: string | null;
  completedAt: string | null;
  xpEarned: number | null;
  mission: Mission;
};
