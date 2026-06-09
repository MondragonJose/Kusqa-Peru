/**
 * Tipos de respuestas crudas de Supabase
 * Estos mapean 1:1 con las columnas de las tablas en BD
 * Se transforman a tipos de dominio en services/
 */

/**
 * Respuesta cruda de tabla missions
 * Esto es lo que Supabase retorna exactamente de la BD
 */
export type MissionRow = {
  id: string;
  title: string;
  description: string;
  district: string;
  region: string; // "costa" | "andes" | "jungle"
  category: string; // "medio-ambiente" | "educacion" | etc
  xp: number;
  difficulty: string; // "easy" | "medium" | "hard"
  date: string; // ISO date
  created_at: string;
  updated_at: string;
  organizer_id: string;
  start_date: string | null;
  end_date: string | null;
  // Estos pueden ser null o undefined según cómo los hayas creado
  participants?: number;
  spotsLeft?: number;
  distanceKm?: number;
  impact?: string;
  coords?: {
    lat: number;
    lng: number;
  };
  emoji?: string;
};

/**
 * Respuesta cruda de tabla mission_participants
 * PRODUCTION SCHEMA: no status column — completion inferred from completed_at IS NOT NULL
 */
export type MissionParticipantRow = {
  id: string;
  mission_id: string;
  user_id: string;
  created_at: string;
  completed_at: string | null;
  xp_earned: number | null;
};
