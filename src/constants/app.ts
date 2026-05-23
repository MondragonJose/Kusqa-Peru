/**
 * Configuración global de la aplicación KUSQA
 */

export const APP_CONFIG = {
  // Mapa
  MAP_BOUNDS: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
  MAP_CENTER: { x: 50, y: 50 },
  
  // Upload
  MAX_FILE_SIZE_MB: 10,
  ALLOWED_FILE_TYPES: ["image/jpeg", "image/png", "video/mp4"],
  
  // Timing
  DEBOUNCE_MS: 300,
  TOAST_DURATION_MS: 3000,
  
  // API (para integración futura)
  API_TIMEOUT_MS: 30000,
} as const;
