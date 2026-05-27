/**
 * Region Theme Constants
 * Defines visual themes for Peruvian regions (Costa, Sierra, Selva).
 * Used by Profile component for region-specific styling.
 */

import type { Region } from "@/types";

export const REGION_THEMES: Array<{ id: Region; label: string; gradient: string; emoji: string }> = [
  { id: "costa", label: "Costa", gradient: "bg-gradient-coast", emoji: "🌊" },
  { id: "sierra", label: "Sierra", gradient: "bg-gradient-andes", emoji: "⛰️" },
  { id: "selva", label: "Selva", gradient: "bg-gradient-jungle", emoji: "🌿" },
];

export const REGION_BADGES: Record<Region, string> = {
  costa: "text-amber-700 bg-amber-500/10 border-amber-500/20 dark:text-amber-400",
  sierra: "text-purple-700 bg-purple-500/10 border-purple-500/20 dark:text-purple-400",
  selva: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400",
};

export const REGION_NODE_GRADIENTS: Record<Region, string> = {
  costa: "bg-gradient-coast",
  sierra: "bg-gradient-andes",
  selva: "bg-gradient-jungle",
};
