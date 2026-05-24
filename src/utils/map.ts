/**
 * Utilidades para mapas y coordenadas geográficas.
 */

import type { MapCoords } from "@/types";
import { calculateHaversineDistance, isValidLatLng } from "@/features/map/utils/projection";

/**
 * Calcula la distancia en kilómetros entre dos coordenadas GPS (Haversine)
 */
export function calculateMapDistance(from: MapCoords, to: MapCoords): number {
  return calculateHaversineDistance(from, to);
}

/**
 * Convierte coordenadas para compatibilidad (obsoleto con Leaflet)
 */
export function mapCoordsToPercent(coords: MapCoords): { left: string; top: string } {
  return {
    left: "0%",
    top: "0%",
  };
}

/**
 * Obtiene la región aproximada según coordenadas geográficas
 */
export function getClosestRegion(coords: MapCoords): "costa" | "sierra" | "selva" {
  // Aproximación simple para el Perú
  if (coords.lng < -76.5) {
    if (import.meta.env.DEV) {
      console.log("[KUSQA REGION TRACE] coords:", coords, "→ costa (lng < -76.5)");
    }
    return "costa"; // Costa oeste
  }
  if (coords.lat > -6.0) {
    if (import.meta.env.DEV) {
      console.log("[KUSQA REGION TRACE] coords:", coords, "→ selva (lat > -6.0)");
    }
    return "selva";   // Selva norte/oriente
  }
  if (import.meta.env.DEV) {
    console.log("[KUSQA REGION TRACE] coords:", coords, "→ sierra (default)");
  }
  return "sierra";                         // Andes / Sierra centro y sur
}

/**
 * Verifica si las coordenadas GPS están dentro de la caja delimitadora del Perú
 */
export function isWithinMapBounds(coords: MapCoords): boolean {
  return isValidLatLng(coords.lat, coords.lng);
}
