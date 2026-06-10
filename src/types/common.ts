/**
 * Types comunes compartidas en KUSQA
 * Lenguaje del dominio geográfico y categórico
 */

/** Regiones geográficas del Perú según KUSQA */
export type { Region } from "@/domain/regions";

/** Categorías de misiones */
export type { MissionCategory } from "@/domain/categories";

/** Niveles de dificultad de misiones */
export type MissionDifficulty = "Suave" | "Andina" | "Cumbre";

/** Coordenadas geográficas del mapa (latitud, longitud) */
export type MapCoords = {
  lat: number;
  lng: number;
};
