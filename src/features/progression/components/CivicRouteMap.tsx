/**
 * CivicRouteMap — Ruta KUSQA: La Expedición Sagrada
 *
 * Inspired by the Qhapaq Ñan — the Great Inca Trail that once unified
 * the continent. This route maps civic progress through Peru's three
 * great natural landscapes: Coast → Sierra → Selva.
 *
 * The trail is sacred, exploratory, and territorial — not arcade-like.
 */

import { motion } from "framer-motion";
import { Lock, CheckCircle2, MapPin } from "lucide-react";
import { CIVIC_ROUTE } from "../constants/civicRoute";
import type { ProgressionStage, StageStatus } from "../types";

interface CivicRouteMapProps {
  userXp: number;
  compact?: boolean;
}

function getStageStatus(stage: ProgressionStage, userXp: number): StageStatus {
  if (userXp >= stage.xpTo) return "completed";
  if (userXp >= stage.xpFrom) return "current";
  return "locked";
}

// Landscape zone boundaries (0-1 normalized across 7 stages)
const LANDSCAPE_ZONES = [
  { label: "🌊 Costa", color: "#C4962A", textColor: "text-amber-700", from: 0, to: 0.28 },
  { label: "⛰️ Sierra", color: "#C47A2A", textColor: "text-orange-800", from: 0.29, to: 0.57 },
  { label: "🌿 Selva", color: "#2D7A4A", textColor: "text-emerald-700", from: 0.58, to: 1 },
];

// y-offsets for each of the 7 stage nodes on the organic trail
const NODE_Y_PX = [60, 28, 48, 32, 52, 36, 20];
// x-offsets for each node (in viewBox units, 0-700)
const NODE_X_PX = [50, 150, 250, 350, 450, 560, 650];

// Build the SVG path string through all node positions
const buildSVGPath = (): string => {
  if (NODE_X_PX.length < 2) return "";
  const pts = NODE_X_PX.map((x, i) => ({ x, y: NODE_Y_PX[i] ?? 40 }));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]!;
    const curr = pts[i]!;
    const cpX = (prev.x + curr.x) / 2;
    d += ` Q ${cpX} ${prev.y} ${curr.x} ${curr.y}`;
  }
  return d;
};

const TRAIL_PATH = buildSVGPath();

export function CivicRouteMap({ userXp, compact = false }: CivicRouteMapProps) {
  // Calculate total trail progress as fraction (0-1)
  const totalXpMin = CIVIC_ROUTE[0]?.xpFrom ?? 0;
  const totalXpMax = CIVIC_ROUTE[CIVIC_ROUTE.length - 1]?.xpTo ?? 1;
  const totalProgress = Math.min(1, Math.max(0, (userXp - totalXpMin) / (totalXpMax - totalXpMin)));

  // SVG total path approximate length (used for stroke-dashoffset illumination)
  const APPROX_PATH_LENGTH = 680;
  const illuminatedLength = totalProgress * APPROX_PATH_LENGTH;

  return (
    <div className="relative w-full">
      {/* Landscape zone legend */}
      {!compact && (
        <div className="flex mb-5 text-[9px] uppercase tracking-widest font-bold">
          {LANDSCAPE_ZONES.map((z) => (
            <div
              key={z.label}
              className={`flex items-center gap-1 flex-1 ${z.textColor} opacity-80`}
            >
              {z.label}
            </div>
          ))}
        </div>
      )}

      {/* Trail SVG container */}
      <div className="relative" style={{ height: compact ? "64px" : "96px" }}>
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 700 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            {/* Multi-region gradient for the trail */}
            <linearGradient id="route-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C4962A" stopOpacity="0.9" />
              <stop offset="28%" stopColor="#9B7A1A" stopOpacity="0.8" />
              <stop offset="44%" stopColor="#C47A2A" stopOpacity="0.9" />
              <stop offset="57%" stopColor="#9B7A1A" stopOpacity="0.8" />
              <stop offset="72%" stopColor="#2D7A4A" stopOpacity="0.9" />
              <stop offset="87%" stopColor="#1E5C37" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#C4962A" stopOpacity="0.95" />
            </linearGradient>

            {/* Glow filter for active segments */}
            <filter id="trail-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Background dashed trail — full length, faded */}
          <path
            d={TRAIL_PATH}
            stroke="oklch(0.85 0.04 75)"
            strokeWidth="2"
            strokeDasharray="5 10"
            strokeLinecap="round"
            fill="none"
            opacity="0.5"
          />

          {/* Animated flowing particles on the unilluminated part */}
          {!compact && (
            <path
              d={TRAIL_PATH}
              stroke="oklch(0.78 0.10 75)"
              strokeWidth="1.5"
              strokeDasharray="3 20"
              fill="none"
              className="animate-path-flow"
              opacity="0.3"
            />
          )}

          {/* Illuminated completed trail */}
          {illuminatedLength > 0 && (
            <motion.path
              d={TRAIL_PATH}
              stroke="url(#route-gradient)"
              strokeWidth={compact ? 2.5 : 3.5}
              strokeLinecap="round"
              fill="none"
              filter="url(#trail-glow)"
              initial={{
                strokeDashoffset: APPROX_PATH_LENGTH,
                strokeDasharray: `${APPROX_PATH_LENGTH} ${APPROX_PATH_LENGTH}`,
              }}
              animate={{ strokeDashoffset: APPROX_PATH_LENGTH - illuminatedLength }}
              transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            />
          )}
        </svg>

        {/* Stage nodes grid */}
        <div
          className="absolute top-0 left-0 right-0 bottom-0"
          aria-label="Ruta cívica de expedición KUSQA"
        >
          {CIVIC_ROUTE.map((stage, i) => {
            const status = getStageStatus(stage, userXp);
            const xPct = ((NODE_X_PX[i] ?? 50) / 700) * 100;
            const yPct = ((NODE_Y_PX[i] ?? 40) / 80) * 100;
            const nodeSize = compact ? 28 : 40;

            return (
              <div
                key={stage.level}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.09, type: "spring", stiffness: 180, damping: 14 }}
                  className="relative flex flex-col items-center"
                >
                  {/* Node circle */}
                  <div
                    className={`
                      relative flex items-center justify-center rounded-full border-2 shadow-sm transition-all duration-500
                      ${
                        status === "current"
                          ? `${stage.gradientClass} border-white/90 text-white`
                          : status === "completed"
                            ? `${stage.gradientClass} border-transparent text-white opacity-90`
                            : "bg-muted/70 border-muted-foreground/20 text-muted-foreground/40 backdrop-blur-sm"
                      }
                    `}
                    style={{ width: nodeSize, height: nodeSize, fontSize: compact ? 12 : 16 }}
                  >
                    {status === "locked" ? (
                      <Lock
                        style={{ width: compact ? 10 : 14, height: compact ? 10 : 14 }}
                        strokeWidth={2.5}
                      />
                    ) : status === "completed" ? (
                      <CheckCircle2
                        style={{ width: compact ? 10 : 14, height: compact ? 10 : 14 }}
                      />
                    ) : (
                      <span>{stage.icon}</span>
                    )}

                    {/* Active node glow rings */}
                    {status === "current" && (
                      <>
                        <span className="absolute inset-0 rounded-full animate-pulse-ring bg-white/20 pointer-events-none" />
                        <span className="absolute -inset-1.5 rounded-full border border-amber-400/50 animate-breathe pointer-events-none" />
                        <span className="absolute -top-1.5 -right-1.5">
                          <MapPin className="h-3.5 w-3.5 text-accent fill-accent/70 animate-foot-glow" />
                        </span>
                      </>
                    )}
                  </div>

                  {/* Node label */}
                  {!compact && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.09 + 0.3 }}
                      className="mt-2.5 text-center pointer-events-none"
                    >
                      <div
                        className={`text-[9px] font-black uppercase tracking-wider leading-none ${
                          status === "current"
                            ? "text-accent"
                            : status === "completed"
                              ? "text-foreground/70"
                              : "text-muted-foreground/40"
                        }`}
                      >
                        Nv. {stage.level}
                      </div>
                      <div
                        className={`text-[10px] font-semibold leading-tight mt-0.5 max-w-[64px] truncate ${
                          status === "current"
                            ? "text-foreground font-bold"
                            : status === "completed"
                              ? "text-muted-foreground"
                              : "text-muted-foreground/35"
                        }`}
                      >
                        {stage.name}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
