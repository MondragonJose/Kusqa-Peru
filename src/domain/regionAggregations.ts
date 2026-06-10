import type { Initiative } from "./initiative";
import type { Region } from "./regions";

export type TerritorySummary = {
  id: string;
  name: string;
  region: Region;
  activeMissionsCount: number;
  leadCategory: string;
  preview: { emoji: string; title: string } | null;
  imageEmoji: string;
  quote: string;
  link: string;
  districtCount: number;
};

const REGION_CONFIG: Record<
  Region,
  { id: string; name: string; quote: string; category: string; emoji: string }
> = {
  costa: {
    id: "costa",
    name: "Lima & Costa",
    quote: "Rescatando la memoria visual y comunitaria en el litoral.",
    category: "Arte & cultura",
    emoji: "🌊",
  },
  sierra: {
    id: "sierra",
    name: "Sierra & Andes",
    quote: "Sembrando agua y reforestando las cuencas de los abuelos.",
    category: "Medio ambiente",
    emoji: "🏔️",
  },
  selva: {
    id: "selva",
    name: "Amazonía & Selva",
    quote: "Uniendo brigadas fluviales para limpiar nuestros ríos sagrados.",
    category: "Comunidad",
    emoji: "🌿",
  },
};

export function aggregateByRegion(initiatives: Initiative[]): TerritorySummary[] {
  const regionInitiatives: Record<Region, Initiative[]> = {
    costa: [],
    sierra: [],
    selva: [],
  };

  const regionDistricts: Record<Region, Set<string>> = {
    costa: new Set(),
    sierra: new Set(),
    selva: new Set(),
  };

  for (const init of initiatives) {
    const list = regionInitiatives[init.region];
    if (list) {
      list.push(init);
      const district = init.location?.district;
      if (district) regionDistricts[init.region].add(district);
    }
  }

  const existingRegions = Object.entries(regionInitiatives)
    .filter(([_, list]) => list.length > 0)
    .map(([r]) => r as Region);

  if (existingRegions.length === 0) return [];

  return existingRegions.map((region) => {
    const pool = regionInitiatives[region];
    const cfg = REGION_CONFIG[region];

    const counts: Record<string, number> = {};
    pool.forEach((i) => {
      counts[i.category] = (counts[i.category] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const leadCategory = sorted[0]?.[0] ?? cfg.category;

    const preview = pool[0]
      ? { emoji: pool[0].emoji, title: pool[0].title }
      : null;

    return {
      id: cfg.id,
      name: cfg.name,
      region,
      activeMissionsCount: pool.length,
      leadCategory,
      preview,
      imageEmoji: cfg.emoji,
      quote: cfg.quote,
      link: "/app/mapa",
      districtCount: regionDistricts[region].size,
    };
  });
}
