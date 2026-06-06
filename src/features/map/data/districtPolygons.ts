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
            [-77.045, -12.105],
            [-77.01, -12.105],
            [-77.01, -12.165],
            [-77.045, -12.165],
            [-77.045, -12.105],
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
            [-72.1, -13.32],
            [-71.85, -13.32],
            [-71.85, -13.56],
            [-72.1, -13.56],
            [-72.1, -13.32],
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
            [-73.31, -3.69],
            [-73.21, -3.69],
            [-73.21, -3.81],
            [-73.31, -3.81],
            [-73.31, -3.69],
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
            [-79.13, -8.04],
            [-78.97, -8.04],
            [-78.97, -8.16],
            [-79.13, -8.16],
            [-79.13, -8.04],
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
            [-70.1, -15.78],
            [-69.86, -15.78],
            [-69.86, -15.93],
            [-70.1, -15.93],
            [-70.1, -15.78],
          ],
        ],
      },
    },
  ],
};
