/**
 * CommunityPulse Component — KUSQA
 * A dynamic widget showing live civic movement and presence across Peru's districts.
 * Emits feelings of action, connection, and real-time movement.
 */

import { motion } from "framer-motion";
import { Users, Flame, MapPin, Radio, Activity } from "lucide-react";
import { MOCK_COMMUNITY_PULSE } from "../constants/districtActivity";
import type { Region, Mission } from "@/types";

interface CommunityPulseProps {
  limit?: number;
  showDetails?: boolean;
  missions?: Mission[];
}

const REGION_BADGES: Record<Region, { text: string; bg: string; textCol: string; border: string }> = {
  costa: { text: "Costa", bg: "bg-sky-500/10", textCol: "text-sky-500", border: "border-sky-500/20" },
  sierra: { text: "Sierra", bg: "bg-purple-500/10", textCol: "text-purple-500", border: "border-purple-500/20" },
  selva: { text: "Selva", bg: "bg-emerald-500/10", textCol: "text-emerald-500", border: "border-emerald-500/20" },
};

const REGION_GRADIENTS: Record<Region, string> = {
  costa: "from-sky-400 to-blue-500",
  sierra: "from-purple-400 to-indigo-500",
  selva: "from-emerald-400 to-green-500",
};

export function CommunityPulse({ limit = 3, showDetails = true, missions }: CommunityPulseProps) {
  // Derive stats from real missions if provided, otherwise fall back to static data
  const hasMissions = missions && missions.length > 0;

  const totalActiveToday = hasMissions
    ? missions.reduce((acc, m) => acc + m.participants, 0)
    : MOCK_COMMUNITY_PULSE.totalActiveToday;

  const activeDistrictsCount = hasMissions
    ? new Set(missions.map((m) => m.district)).size
    : MOCK_COMMUNITY_PULSE.activeDistrictsCount;

  const recentImpactDescription = hasMissions
    ? `${missions.length} misión${missions.length !== 1 ? "es" : ""} activa${missions.length !== 1 ? "s" : ""} en ${activeDistrictsCount} distrito${activeDistrictsCount !== 1 ? "s" : ""} del Perú`
    : MOCK_COMMUNITY_PULSE.recentImpactDescription;

  // Build district summaries from real missions (or fallback to static)
  const districts = hasMissions
    ? (() => {
        const byDistrict: Record<string, { missions: Mission[] }> = {};
        missions.forEach((m) => {
          if (!byDistrict[m.district]) byDistrict[m.district] = { missions: [] };
          byDistrict[m.district].missions.push(m);
        });
        return Object.entries(byDistrict)
          .map(([district, { missions: dm }]) => ({
            id: district.toLowerCase().replace(/\s+/g, "-"),
            name: district,
            province: dm[0].region === "costa" ? "Lima" : dm[0].region === "sierra" ? "Cusco" : "Loreto",
            region: dm[0].region as Region,
            activeCount: dm.reduce((a, m) => a + m.participants, 0),
            energyScore: Math.min(100, dm.length * 25),
            missionCount: dm.length,
            totalHours: dm.reduce((a, m) => a + m.participants * 3, 0),
            recentAction: {
              actorName: `${dm[0].participants} exploradores`,
              actionText: `en "${dm[0].title.length > 28 ? dm[0].title.substring(0, 28) + "…" : dm[0].title}"`,
              timestamp: dm[0].date,
            },
          }))
          .sort((a, b) => b.activeCount - a.activeCount);
      })()
    : MOCK_COMMUNITY_PULSE.districts;

  // Sort districts by energyScore/activeCount to show the most active ones first
  const sortedDistricts = [...districts]
    .sort((a, b) => b.energyScore - a.energyScore)
    .slice(0, limit);

  return (
    <div className="w-full rounded-3xl border border-border bg-card p-6 shadow-sm overflow-hidden relative">
      {/* Living pulse background effect */}
      <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-48 h-48 rounded-full bg-sky-500/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5 mb-5">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <Radio className="h-5 w-5 animate-pulse" />
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground tracking-tight text-lg">Pulso Territorial</h3>
            <p className="text-xs text-muted-foreground">Presencia colectiva en tiempo real</p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-3 bg-muted/50 rounded-2xl px-4 py-2 border border-border/40">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-medium">Activos hoy</span>
            <span className="text-lg font-bold text-foreground flex items-center gap-1.5 leading-none mt-0.5">
              <Users className="h-4 w-4 text-emerald-500" />
              {totalActiveToday}
            </span>
          </div>
          <div className="h-8 w-[1px] bg-border/80" />
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-medium">Distritos</span>
            <span className="text-lg font-bold text-foreground flex items-center gap-1.5 leading-none mt-0.5">
              <MapPin className="h-4 w-4 text-sky-500" />
              {activeDistrictsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Impact description */}
      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-500 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl px-3.5 py-2.5 mb-5 font-medium">
        <Activity className="h-3.5 w-3.5 flex-shrink-0 animate-bounce" />
        <span>{recentImpactDescription}</span>
      </div>

      {/* District list */}
      <div className="space-y-4">
        <h4 className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider pl-1">
          Distritos con Mayor Movimiento
        </h4>

        {sortedDistricts.map((district, idx) => {
          const badge = REGION_BADGES[district.region];
          return (
            <motion.div
              key={district.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="flex flex-col p-4 rounded-2xl border border-border/50 bg-background/55 hover:bg-background/80 hover:border-border transition-all duration-300 group"
            >
              {/* Row 1: Name and badge */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    {district.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    ({district.province})
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.textCol} ${badge.border}`}>
                  {badge.text}
                </span>
              </div>

              {/* Row 2: Live status bar */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                  <span className="font-semibold text-foreground">{district.activeCount}</span> activos
                </span>
                <span>•</span>
                <span>{district.missionCount} misiones</span>
                <span>•</span>
                <span>{district.totalHours} hrs</span>
              </div>

              {/* Progress bar */}
              <div className="relative w-full h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${district.energyScore}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: idx * 0.1 }}
                  className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${REGION_GRADIENTS[district.region]}`}
                />
              </div>

              {/* Recent Action */}
              {showDetails && district.recentAction && (
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/90 bg-muted/30 border border-muted/20 px-2.5 py-1.5 rounded-xl">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="truncate">
                    <strong className="text-foreground/90">{district.recentAction.actorName}</strong>{" "}
                    {district.recentAction.actionText}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground/60 whitespace-nowrap">
                    {district.recentAction.timestamp}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
