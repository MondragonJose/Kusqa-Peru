export type Region = "costa" | "sierra" | "selva";

export const REGIONS: Region[] = ["costa", "sierra", "selva"];

export interface RegionMeta {
  name: string;
  emoji: string;
  color: string;
  gradient: string;
  chipBg: string;
  badgeStyle: string;
  tint: string;
}

export const REGION_META: Record<Region, RegionMeta> = {
  costa: {
    name: "Costa",
    emoji: "🌊",
    color: "text-coast",
    gradient: "bg-gradient-coast",
    chipBg: "bg-coast/10 text-coast",
    badgeStyle: "text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400",
    tint: "#3b82f6",
  },
  sierra: {
    name: "Sierra",
    emoji: "⛰️",
    color: "text-sierra",
    gradient: "bg-gradient-andes",
    chipBg: "bg-sierra/10 text-sierra",
    badgeStyle: "text-orange-800 bg-orange-600/10 border-orange-600/20 dark:text-orange-400",
    tint: "#a16207",
  },
  selva: {
    name: "Selva",
    emoji: "🌿",
    color: "text-jungle",
    gradient: "bg-gradient-jungle",
    chipBg: "bg-jungle/10 text-jungle",
    badgeStyle: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400",
    tint: "#16a34a",
  },
};

export function regionLabel(region: Region): string {
  return REGION_META[region].name;
}

export function regionEmoji(region: Region): string {
  return REGION_META[region].emoji;
}

export function regionColor(region: Region): string {
  return REGION_META[region].color;
}

export function regionGradient(region: Region): string {
  return REGION_META[region].gradient;
}

export function regionChipBg(region: Region): string {
  return REGION_META[region].chipBg;
}

export function regionBadgeStyle(region: Region): string {
  return REGION_META[region].badgeStyle;
}
