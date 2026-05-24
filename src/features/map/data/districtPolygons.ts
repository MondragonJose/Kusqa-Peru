/**
 * districtPolygons.ts
 * GeoJSON polygon data for civic-active districts.
 * Source: currently static data; future: Supabase `districts` table
 *
 * To add new districts: append to the `features` array.
 * To load from Supabase: replace this export with a React Query hook call.
 */

export type DistrictPolygonProperties = {
  name: string;
  region: "costa" | "sierra" | "selva";
  score: number; // 0-100 civic activity score
};

export const DISTRICT_POLYGONS = {
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: { name: "Barranco & Miraflores (Costa)", region: "costa" as const, score: 88 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-77.0450, -12.1050],
            [-77.0100, -12.1050],
            [-77.0100, -12.1650],
            [-77.0450, -12.1650],
            [-77.0450, -12.1050],
          ],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "Valle Sagrado & Cusco (Sierra)", region: "sierra" as const, score: 92 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-72.1000, -13.3200],
            [-71.8500, -13.3200],
            [-71.8500, -13.5600],
            [-72.1000, -13.5600],
            [-72.1000, -13.3200],
          ],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "Iquitos Río Itaya (Selva)", region: "selva" as const, score: 76 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-73.3100, -3.6900],
            [-73.2100, -3.6900],
            [-73.2100, -3.8100],
            [-73.3100, -3.8100],
            [-73.3100, -3.6900],
          ],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "Trujillo Metropolitano (Costa)", region: "costa" as const, score: 68 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-79.1300, -8.0400],
            [-78.9700, -8.0400],
            [-78.9700, -8.1600],
            [-79.1300, -8.1600],
            [-79.1300, -8.0400],
          ],
        ],
      },
    },
    {
      type: "Feature" as const,
      properties: { name: "Puno Lago Titicaca (Sierra)", region: "sierra" as const, score: 52 },
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-70.1000, -15.7800],
            [-69.8600, -15.7800],
            [-69.8600, -15.9300],
            [-70.1000, -15.9300],
            [-70.1000, -15.7800],
          ],
        ],
      },
    },
  ],
};
