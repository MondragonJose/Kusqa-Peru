import type { MapCoords } from "@/types";

export type PlaceSuggestion = {
  description: string;
  district: string;
  region: "costa" | "sierra" | "selva";
  coords: MapCoords;
};

// Extensa base de datos local de distritos peruanos para fallback sin internet o sin API Key
export const PERU_LOCAL_PLACES: PlaceSuggestion[] = [
  // Lima (Costa)
  { description: "Barranco, Lima", district: "Barranco", region: "costa", coords: { lat: -12.1492, lng: -77.0222 } },
  { description: "Miraflores, Lima", district: "Miraflores", region: "costa", coords: { lat: -12.1225, lng: -77.0280 } },
  { description: "San Juan de Lurigancho, Lima", district: "San Juan de Lurigancho", region: "costa", coords: { lat: -12.0263, lng: -76.9873 } },
  { description: "Chorrillos, Lima", district: "Chorrillos", region: "costa", coords: { lat: -12.1762, lng: -77.0269 } },
  { description: "San Isidro, Lima", district: "San Isidro", region: "costa", coords: { lat: -12.0974, lng: -77.0349 } },
  { description: "Santiago de Surco, Lima", district: "Santiago de Surco", region: "costa", coords: { lat: -12.1417, lng: -76.9786 } },
  { description: "La Molina, Lima", district: "La Molina", region: "costa", coords: { lat: -12.0914, lng: -76.9248 } },
  { description: "Villa El Salvador, Lima", district: "Villa El Salvador", region: "costa", coords: { lat: -12.2081, lng: -76.9367 } },
  { description: "Magdalena del Mar, Lima", district: "Magdalena del Mar", region: "costa", coords: { lat: -12.0903, lng: -77.0706 } },
  { description: "Callao, Callao", district: "Callao", region: "costa", coords: { lat: -12.0566, lng: -77.1181 } },
  { description: "Lince, Lima", district: "Lince", region: "costa", coords: { lat: -12.0834, lng: -77.0353 } },
  { description: "Rímac, Lima", district: "Rímac", region: "costa", coords: { lat: -12.0294, lng: -77.0280 } },

  // Cusco (Sierra)
  { description: "Chinchero, Cusco", district: "Chinchero", region: "sierra", coords: { lat: -13.3914, lng: -72.0468 } },
  { description: "Cusco Centro, Cusco", district: "Cusco", region: "sierra", coords: { lat: -13.5319, lng: -71.9675 } },
  { description: "Wanchaq, Cusco", district: "Wanchaq", region: "sierra", coords: { lat: -13.5224, lng: -71.9592 } },
  { description: "Pisac, Valle Sagrado", district: "Pisac", region: "sierra", coords: { lat: -13.4219, lng: -71.8481 } },
  { description: "Ollantaytambo, Valle Sagrado", district: "Ollantaytambo", region: "sierra", coords: { lat: -13.2581, lng: -72.2634 } },
  { description: "San Jerónimo, Cusco", district: "San Jerónimo", region: "sierra", coords: { lat: -13.5422, lng: -71.8906 } },

  // Loreto (Selva)
  { description: "Iquitos Centro, Loreto", district: "Iquitos", region: "selva", coords: { lat: -3.7452, lng: -73.2516 } },
  { description: "Punchana, Loreto", district: "Punchana", region: "selva", coords: { lat: -3.7294, lng: -73.2428 } },
  { description: "Belén, Loreto", district: "Belén", region: "selva", coords: { lat: -3.7612, lng: -73.2561 } },
  { description: "San Juan Bautista, Iquitos", district: "San Juan Bautista", region: "selva", coords: { lat: -3.7852, lng: -73.2750 } },

  // Trujillo (Costa)
  { description: "Trujillo Centro, La Libertad", district: "Trujillo", region: "costa", coords: { lat: -8.1119, lng: -79.0287 } },
  { description: "Huanchaco, La Libertad", district: "Huanchaco", region: "costa", coords: { lat: -8.0772, lng: -79.1189 } },
  { description: "Alto Trujillo, La Libertad", district: "Alto Trujillo", region: "costa", coords: { lat: -8.0820, lng: -79.0010 } },
  { description: "Víctor Larco Herrera, La Libertad", district: "Víctor Larco", region: "costa", coords: { lat: -8.1344, lng: -79.0436 } },

  // Puno (Sierra)
  { description: "Puno Centro, Puno", district: "Puno", region: "sierra", coords: { lat: -15.8402, lng: -70.0219 } },
  { description: "Juliaca, Puno", district: "Juliaca", region: "sierra", coords: { lat: -15.4967, lng: -70.1333 } },
  { description: "Chucuito, Puno", district: "Chucuito", region: "sierra", coords: { lat: -15.8894, lng: -69.8894 } },

  // Arequipa (Sierra)
  { description: "Arequipa Centro, Arequipa", district: "Arequipa", region: "sierra", coords: { lat: -16.4090, lng: -71.5375 } },
  { description: "Yanahuara, Arequipa", district: "Yanahuara", region: "sierra", coords: { lat: -16.3886, lng: -71.5414 } },
];

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

/**
 * Determina la región de KUSQA según la latitud y longitud.
 */
export function getRegionFromCoords(coords: MapCoords): "costa" | "sierra" | "selva" {
  if (coords.lng < -76.5) return "costa";
  if (coords.lat > -6.0) return "selva";
  return "sierra";
}

/**
 * Obtiene sugerencias de lugares (distritos de Perú) a partir de una consulta.
 * Emplea Google Geocoding API si la clave está disponible, sino usa el fallback local.
 */
export async function getPlaceSuggestions(input: string): Promise<PlaceSuggestion[]> {
  if (!input || input.trim().length < 2) return [];

  // Si existe API Key, realiza consulta a la API de Google
  if (GOOGLE_API_KEY) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          input + ", Peru"
        )}&key=${GOOGLE_API_KEY}&language=es`
      );
      const data = await response.json();

      if (data.status === "OK" && data.results) {
        return data.results.map((res: any) => {
          const lat = res.geometry.location.lat;
          const lng = res.geometry.location.lng;
          const coords = { lat, lng };

          // Encontrar nombre del distrito
          let district = "";
          const localityComp = res.address_components.find(
            (c: any) => c.types.includes("locality") || c.types.includes("sublocality")
          );
          const adminAreaComp = res.address_components.find(
            (c: any) => c.types.includes("administrative_area_level_3")
          );
          
          district = localityComp?.long_name || adminAreaComp?.long_name || res.formatted_address.split(",")[0];

          return {
            description: res.formatted_address,
            district,
            region: getRegionFromCoords(coords),
            coords,
          };
        });
      }
    } catch (err) {
      console.warn("Google Geocoding failed, falling back to local search:", err);
    }
  }

  // Fallback local con búsqueda inteligente difusa/subcadena
  const query = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return PERU_LOCAL_PLACES.filter((place) => {
    const normDesc = place.description.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return normDesc.includes(query);
  }).slice(0, 5);
}

/**
 * Realiza la búsqueda inversa de dirección a partir de coordenadas GPS.
 */
export async function reverseGeocode(coords: MapCoords): Promise<{ district: string; region: "costa" | "sierra" | "selva" }> {
  const region = getRegionFromCoords(coords);

  if (GOOGLE_API_KEY) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.lat},${coords.lng}&key=${GOOGLE_API_KEY}&language=es`
      );
      const data = await response.json();

      if (data.status === "OK" && data.results[0]) {
        const res = data.results[0];
        const localityComp = res.address_components.find(
          (c: any) => c.types.includes("locality") || c.types.includes("sublocality")
        );
        const adminAreaComp = res.address_components.find(
          (c: any) => c.types.includes("administrative_area_level_3")
        );

        return {
          district: localityComp?.long_name || adminAreaComp?.long_name || "Perú",
          region,
        };
      }
    } catch (err) {
      console.warn("Google Reverse Geocoding failed:", err);
    }
  }

  // Fallback local: Encuentra la sugerencia más cercana
  let closestPlace = PERU_LOCAL_PLACES[0];
  let minDistance = Infinity;

  for (const place of PERU_LOCAL_PLACES) {
    const dy = place.coords.lat - coords.lat;
    const dx = place.coords.lng - coords.lng;
    const dist = dy * dy + dx * dx;
    if (dist < minDistance) {
      minDistance = dist;
      closestPlace = place;
    }
  }

  return {
    district: closestPlace.district,
    region,
  };
}
