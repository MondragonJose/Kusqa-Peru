import type { MapCoords } from "@/types";

export const PERU_DEFAULT_CENTER: MapCoords = {
  lat: -9.19,
  lng: -75.0152,
};

export const MAP_DEFAULT_ZOOM = 6;
export const MAP_DETAIL_ZOOM = 14;

// Bounding box for Peru to discard outlier GPS coordinates
export const PERU_BOUNDING_BOX = {
  minLat: -18.5,
  maxLat: -0.0,
  minLng: -81.5,
  maxLng: -68.5,
};

/** Dark tile layer (optional, toggle via UI) */
export const MAP_TILE_LAYER_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

export const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** Light tile layer — DEFAULT for KUSQA civic-social context (Voyager) */
export const MAP_TILE_LIGHT_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
