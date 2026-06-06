/**
 * BadgeCard — Civic identity artifact card
 *
 * Communicates the badge's story, rarity, and territorial identity.
 * Locked badges are subtle — not absent. The path is visible.
 */

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { CivicBadge } from "../types";
import { RARITY_STYLES } from "../types";

interface BadgeCardProps {
  badge: CivicBadge;
  index?: number;
  showNarrative?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  territorial: "🗺️",
  social: "👥",
  liderazgo: "⚡",
  ambiental: "🌿",
  cultural: "🎭",
  fundacional: "🌱",
};

export function BadgeCard({ badge, index = 0, showNarrative = true }: BadgeCardProps) {
  const style = RARITY_STYLES[badge.rarity];
  const isLegendary = badge.rarity === "legendario";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, type: "spring", stiffness: 180 }}
      className={`
        relative rounded-2xl p-5 text-center transition-smooth
        ${
          badge.earned
            ? `bg-card border border-border/60 hover:shadow-card hover:-translate-y-1 ${style.glowClass}`
            : "bg-secondary/30 border border-dashed border-border/40"
        }
        ${isLegendary && badge.earned ? "bg-gradient-to-b from-accent/5 to-transparent" : ""}
      `}
    >
      {/* Rarity indicator */}
      {badge.earned && (
        <div
          className={`absolute top-3 right-3 text-[9px] uppercase tracking-widest font-bold ${style.textClass}`}
        >
          {style.label}
        </div>
      )}

      {/* Category tag */}
      <div className="absolute top-3 left-3 text-xs opacity-50">
        {CATEGORY_ICONS[badge.category]}
      </div>

      {/* Emoji */}
      <div
        className={`
          text-5xl mt-4 mb-3 leading-none
          ${!badge.earned ? "grayscale opacity-30" : ""}
          ${badge.earned && isLegendary ? "animate-breathe" : ""}
        `}
      >
        {badge.emoji}
      </div>

      {/* Name */}
      <div
        className={`font-display font-bold text-sm leading-tight ${
          badge.earned ? "text-foreground" : "text-muted-foreground/60"
        }`}
      >
        {badge.name}
      </div>

      {/* Narrative / condition */}
      {showNarrative && (
        <p
          className={`text-xs mt-2 leading-relaxed ${badge.earned ? "text-muted-foreground" : "text-muted-foreground/40"}`}
        >
          {badge.earned ? badge.narrative : badge.unlockCondition}
        </p>
      )}

      {/* Earned state */}
      {badge.earned && (
        <div
          className={`mt-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold ${style.textClass}`}
        >
          <Sparkles className="h-3 w-3" />
          {badge.earnedAt
            ? new Date(badge.earnedAt).toLocaleDateString("es-PE", {
                month: "short",
                year: "numeric",
              })
            : "Desbloqueada"}
        </div>
      )}

      {/* Legendary shimmer overlay */}
      {isLegendary && badge.earned && (
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 shimmer opacity-20" />
        </div>
      )}
    </motion.div>
  );
}
