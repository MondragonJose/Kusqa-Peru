/**
 * Tipos de presencia comunitaria y pulso territorial de KUSQA
 */

import type { Region } from "@/types";

/** Actividad cívica en un distrito específico */
export type DistrictActivity = {
  id: string;
  name: string; // Nombre del distrito (e.g. "Barranco")
  province: string; // Provincia o departamento (e.g. "Lima")
  region: Region;
  activeCount: number; // Jóvenes activos hoy
  energyScore: number; // Puntuación de energía cívica (0-100)
  missionCount: number; // Misiones activas en curso
  totalHours: number; // Horas comunitarias acumuladas este mes
  recentAction?: {
    actorName: string;
    actionText: string; // e.g. "se unió a Reforestación"
    timestamp: string; // e.g. "hace 10 min"
  };
};

/** Pulso general de presencia comunitaria */
export type CommunityPulseData = {
  totalActiveToday: number;
  activeDistrictsCount: number;
  recentImpactDescription: string;
  districts: DistrictActivity[];
};
