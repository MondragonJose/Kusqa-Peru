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
 * Respuesta cruda de tabla profiles
 */
export type ProfileRow = {
  id: string;
  user_id: string;
  name: string;
  handle: string;
  avatar: string | null;
  district: string;
  region: string;
  xp: number;
  level: number;
  rank: number;
  streak: number;
  created_at: string;
  updated_at: string;
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

/**
 * Respuesta cruda de tabla mission_evidence
 * Schema source: supabase/migrations/20260526120000_phase_b_operational_readiness.sql
 *               supabase/migrations/20260529100000_evidence_verification_schema.sql
 */
export type EvidenceRow = {
  id: string;
  mission_id: string;
  user_id: string;
  evidence_type: string; // "photo" | "text" | "checkpoint" | "mixed"
  storage_path: string | null;
  mime_type: string | null;
  byte_size: number | null;
  width_px: number | null;
  height_px: number | null;
  caption: string | null;
  description: string | null;
  media_urls: string[] | null;
  location_lat: number | null;
  location_lng: number | null;
  moderation_status: string; // "pending" | "approved" | "rejected" | "flagged"
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
};
