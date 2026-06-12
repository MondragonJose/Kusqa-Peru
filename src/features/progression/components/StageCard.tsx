/**
 * StageCard — Detailed view of a single Ruta KUSQA stage
 */

import { motion } from "framer-motion";
import { Lock, Sparkles, CheckCircle2 } from "lucide-react";
import type { ProgressionStage, StageStatus } from "../types";

interface StageCardProps {
  stage: ProgressionStage;
  status: StageStatus;
  userXp: number;
  index?: number;
}

const RARITY_COLOR: Record<StageStatus, string> = {
  completed: "border-accent/40 bg-accent/5",
  current: "border-accent shadow-glow",
  reached: "border-border/60",
  locked: "border-dashed border-border/40 opacity-60",
};

export function StageCard({ stage, status, userXp, index = 0 }: StageCardProps) {
  const xpInStage = Math.max(0, userXp - stage.xpFrom);
  const stageRange = stage.xpTo - stage.xpFrom;
  const stagePct = status === "completed" ? 100 : Math.min(100, (xpInStage / stageRange) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`rounded-2xl border p-5 transition-smooth ${RARITY_COLOR[status]}`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={`h-12 w-12 rounded-2xl ${stage.gradientClass} grid place-items-center text-2xl shrink-0 ${
            status === "locked" ? "grayscale opacity-50" : ""
          }`}
        >
          {status === "locked" ? <Lock className="h-5 w-5 text-white/70" /> : stage.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
            Nivel {stage.level} · {stage.terrain}
          </div>
          <div
            className={`font-display font-bold text-lg mt-0.5 truncate ${status === "locked" ? "text-muted-foreground" : ""}`}
          >
            {stage.name}
          </div>
        </div>
        {status === "completed" && <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />}
        {status === "current" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest shrink-0">
            <Sparkles className="h-3 w-3" /> Aquí
          </span>
        )}
      </div>

      {/* Narrative */}
      {status !== "locked" && (
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{stage.narrative}</p>
      )}

      {/* Progress bar for current stage */}
      {status === "current" && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{xpInStage.toLocaleString()} XP en este tramo</span>
            <span>{stageRange.toLocaleString()} XP total</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stagePct}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full bg-gradient-sunrise relative"
            >
              <div className="absolute inset-0 shimmer" />
            </motion.div>
          </div>
        </div>
      )}

      {/* Milestones */}
      {status !== "locked" && stage.milestones.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {stage.milestones.map((m) => {
            const done = userXp >= m.xpRequired;
            return (
              <div
                key={m.id}
                className={`flex items-center gap-2 text-xs ${done ? "text-foreground" : "text-muted-foreground"}`}
              >
                <div
                  className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${done ? "border-accent bg-accent text-white" : "border-border"}`}
                >
                  {done && <CheckCircle2 className="h-2.5 w-2.5" />}
                </div>
                <span className={done ? "line-through opacity-60" : ""}>{m.label}</span>
                {m.unlockLabel && done && (
                  <span className="ml-auto text-[10px] text-accent font-semibold">
                    → {m.unlockLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Locked state */}
      {status === "locked" && (
        <p className="text-xs text-muted-foreground/60 mt-3 italic">
          Alcanza {stage.xpFrom.toLocaleString()} XP para iniciar este tramo.
        </p>
      )}
    </motion.div>
  );
}
