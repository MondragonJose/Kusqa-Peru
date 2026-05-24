/**
 * geocoding.ts — Map Feature Geocoding Service
 *
 * Handles Google Places Autocomplete and Reverse Geocoding.
 * Falls back gracefully to a local Peruvian district database.
 *
 * Architecture note: This is a map-feature service, not a global service.
 * It was moved from src/services/googleMaps.ts to maintain map isolation.
 */

// Re-export everything from the original service for now
// This indirection allows future replacement without touching consumers
export * from "../../../services/googleMaps";
