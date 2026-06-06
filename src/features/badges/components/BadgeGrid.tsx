/**
 * BadgeGrid — Filterable civic badge gallery
 *
 * Shows badges grouped by category with filter pills.
 * Earned badges always appear before locked ones within each group.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCard } from "./BadgeCard";
import type { CivicBadge, BadgeCategory } from "../types";

interface BadgeGridProps {
  badges: CivicBadge[];
  showNarrative?: boolean;
}

const CATEGORY_LABELS: Record<BadgeCategory | "todas", string> = {
  todas: "Todas",
  fundacional: "Fundacionales",
  territorial: "Territoriales",
  social: "Sociales",
  liderazgo: "Liderazgo",
  ambiental: "Ambiental",
  cultural: "Cultural",
};

const CATEGORY_ORDER: Array<BadgeCategory | "todas"> = [
  "todas",
  "fundacional",
  "territorial",
  "social",
  "liderazgo",
  "ambiental",
  "cultural",
];

export function BadgeGrid({ badges, showNarrative = true }: BadgeGridProps) {
  const [activeCategory, setActiveCategory] = useState<BadgeCategory | "todas">("todas");

  const filtered =
    activeCategory === "todas" ? badges : badges.filter((b) => b.category === activeCategory);

  // Earned first, then locked
  const sorted = [...filtered.filter((b) => b.earned), ...filtered.filter((b) => !b.earned)];

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {earnedCount} de {badges.length} insignias desbloqueadas
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="text-foreground font-semibold">
            {Math.round((earnedCount / badges.length) * 100)}%
          </span>{" "}
          de tu colección
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mb-6">
        {CATEGORY_ORDER.map((cat) => {
          const count =
            cat === "todas" ? badges.length : badges.filter((b) => b.category === cat).length;
          const earnedInCat =
            cat === "todas"
              ? earnedCount
              : badges.filter((b) => b.category === cat && b.earned).length;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`
                px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-smooth
                ${
                  activeCategory === cat
                    ? "bg-foreground text-background border-foreground"
                    : "bg-surface border-border hover:bg-secondary"
                }
              `}
            >
              {CATEGORY_LABELS[cat]}
              <span className="ml-1.5 opacity-60">
                {earnedInCat}/{count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Badge grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {sorted.map((badge, i) => (
            <BadgeCard key={badge.id} badge={badge} index={i} showNarrative={showNarrative} />
          ))}
        </motion.div>
      </AnimatePresence>

      {sorted.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Completa misiones para desbloquear insignias en esta categoría.
        </div>
      )}
    </div>
  );
}
