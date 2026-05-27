/**
 * DistrictLeaderboard Component — KUSQA
 * Displays the friendly territorial competition of civic energy and total hours.
 * Motivates regional belonging and collective actions.
 */

import { motion } from "framer-motion";
import { Trophy, Medal, Flame, Calendar, Award } from "lucide-react";
import { DISTRICT_ACTIVITIES } from "../constants/districtActivity";
import type { Region } from "@/types";

interface DistrictLeaderboardProps {
  sortBy?: "hours" | "energy";
}

const REGION_THEMES: Record<Region, { text: string; bg: string; textCol: string; border: string; gradient: string }> = {
  costa: {
    text: "Costa",
    bg: "bg-sky-500/10",
    textCol: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/20",
    gradient: "from-sky-500/15 via-blue-500/5 to-transparent",
  },
  sierra: {
    text: "Sierra",
    bg: "bg-purple-500/10",
    textCol: "text-purple-600 dark:text-purple-400",
    border: "border-purple-500/20",
    gradient: "from-purple-500/15 via-indigo-500/5 to-transparent",
  },
  selva: {
    text: "Selva",
    bg: "bg-emerald-500/10",
    textCol: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    gradient: "from-emerald-500/15 via-green-500/5 to-transparent",
  },
};

export function DistrictLeaderboard({ sortBy = "hours" }: DistrictLeaderboardProps) {
  // Sort districts based on selected metric
  const sortedDistricts = [...DISTRICT_ACTIVITIES].sort((a, b) => {
    if (sortBy === "hours") {
      return b.totalHours - a.totalHours;
    }
    return b.energyScore - a.energyScore;
  });

  // Podium icons
  const getRankBadge = (rank: number) => {
    if (rank === 0) return <Trophy className="h-5 w-5 text-amber-500 filter drop-shadow-sm" />;
    if (rank === 1) return <Medal className="h-5 w-5 text-slate-400 filter drop-shadow-sm" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-amber-700 filter drop-shadow-sm" />;
    return <span className="text-xs font-bold text-muted-foreground w-5 text-center">{rank + 1}</span>;
  };

  return (
    <div className="w-full rounded-3xl border border-border bg-card p-6 shadow-sm overflow-hidden relative">
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 via-purple-500 to-emerald-400" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground tracking-tight text-lg">Liga de Distritos Activos</h3>
            <p className="text-xs text-muted-foreground">Impacto colectivo territorial</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-xl border border-border/40 font-medium">
          <Calendar className="h-3.5 w-3.5" />
          <span>Mayo 2026</span>
        </div>
      </div>

      {/* Main leaderboard table */}
      <div className="space-y-3">
        {sortedDistricts.map((district, idx) => {
          const theme = REGION_THEMES[district.region];
          const isTopThree = idx < 3;

          return (
            <motion.div
              key={district.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                isTopThree 
                  ? "bg-gradient-to-r border-border/75 shadow-sm" 
                  : "bg-background/40 border-border/40 hover:bg-background/70"
              }`}
              style={{
                backgroundImage: isTopThree ? `linear-gradient(to right, var(--tw-gradient-stops))` : undefined,
              }}
              // Tailwind doesn't compile dynamically styled linear-gradients correctly without presets, so we inline the style.
            >
              {/* Regional background glow for top districts */}
              {isTopThree && (
                <div 
                  className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-60 pointer-events-none`} 
                />
              )}

              {/* Rank Position */}
              <div className="flex items-center justify-center w-8 z-10">
                {getRankBadge(idx)}
              </div>

              {/* District info */}
              <div className="flex-1 min-w-0 z-10">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                    {district.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 flex-shrink-0">
                    {district.province}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className={`font-semibold text-[10px] px-1.5 py-0.5 rounded-md border ${theme.bg} ${theme.textCol} ${theme.border}`}>
                    {theme.text}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {district.activeCount} jóvenes hoy
                  </span>
                </div>
              </div>

              {/* Score / Metrics */}
              <div className="text-right z-10 flex flex-col justify-center items-end">
                {sortBy === "hours" ? (
                  <>
                    <span className="text-sm font-black text-foreground tabular-nums">
                      {district.totalHours.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                      horas
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-black text-orange-500 flex items-center gap-0.5 tabular-nums">
                      <Flame className="h-3.5 w-3.5 fill-orange-500/20" />
                      {district.energyScore}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">
                      energía
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footer footer-note */}
      <div className="mt-5 text-center text-[10px] text-muted-foreground flex items-center justify-center gap-1.5 border-t border-border/40 pt-4">
        <Award className="h-3.5 w-3.5 text-amber-500" />
        <span>Los 3 primeros distritos ganan un reto regional comunitario al fin del mes.</span>
      </div>
    </div>
  );
}
