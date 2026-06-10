import type { Initiative } from "./initiative";

export type DistrictSummary = {
  district: string;
  initiativeCount: number;
  activeCount: number;
  sampleEmoji: string;
};

export function selectTopDistricts(initiatives: Initiative[], topN = 5): DistrictSummary[] {
  const districtMap = new Map<string, { count: number; active: number; emoji: string }>();

  for (const init of initiatives) {
    const district = init.location?.district;
    if (!district) continue;

    const existing = districtMap.get(district);
    if (existing) {
      existing.count++;
      if (init.lifecycle === "active") existing.active++;
    } else {
      districtMap.set(district, {
        count: 1,
        active: init.lifecycle === "active" ? 1 : 0,
        emoji: init.emoji,
      });
    }
  }

  return Array.from(districtMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, topN)
    .map(([district, data]) => ({
      district,
      initiativeCount: data.count,
      activeCount: data.active,
      sampleEmoji: data.emoji,
    }));
}
