/**
 * Tipos del sistema de notificaciones cívicas de KUSQA
 *
 * Las notificaciones deben sonar como vecinos, no como sistemas.
 * "Hay movimiento en tu cuadra." No "Notification received."
 */

/** Tipos de notificaciones cívicas */
export type CivicNotificationType =
  | "misión" // actividad en misiones
  | "insignia" // badge desbloqueado
  | "nivel" // subida de nivel
  | "comunidad" // actividad colectiva del distrito
  | "cívica"
  | "presencia" // señal de actividad cercana
  | "logro"; // hito o achievement

/** Notificación cívica con contexto territorial */
export type CivicNotification = {
  id: string;
  type: CivicNotificationType;
  /** Título principal — lenguaje humano */
  title: string;
  /** Cuerpo — contexto adicional */
  body: string;
  /** Emoji contextual */
  emoji: string;
  /** Tiempo relativo — "hace 2h", "ayer" */
  timestamp: string;
  /** Si ya fue leída */
  read: boolean;
  /** Distrito relacionado (opcional) */
  district?: string;
  /** Región relacionada (opcional) */
  region?: "costa" | "sierra" | "selva";
  /** Número de actores cuando es acción colectiva */
  actorCount?: number;
  /** Nombre de un actor específico */
  actorName?: string;
  /** ID de misión relacionada (para deep-link) */
  missionId?: string;
};

/** Etiquetas de categoría para UI */
export const NOTIFICATION_TYPE_LABELS: Record<CivicNotificationType, string> = {
  misión: "Misiones",
  insignia: "Insignias",
  nivel: "Expedición",
  comunidad: "Comunidad",
  cívica: "Cívica",
  presencia: "Actividad cercana",
  logro: "Logros",
};

/** Colores de fondo por tipo */
export const NOTIFICATION_TYPE_GRADIENT: Record<CivicNotificationType, string> = {
  misión: "bg-gradient-coast",
  insignia: "bg-gradient-sunrise",
  nivel: "bg-gradient-andes",
  comunidad: "bg-gradient-jungle",
  cívica: "bg-accent",
  presencia: "bg-gradient-terrain-costa",
  logro: "bg-gradient-cumbre",
};
