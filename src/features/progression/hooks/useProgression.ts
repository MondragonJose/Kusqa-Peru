/**
 * useProgression — Civic journey state derived from user XP
 * Returns the current stage, progress, milestones, and next stage.
 */

import { useMemo } from "react";
import { useCurrentUser } from "@/features/auth";
import { CIVIC_ROUTE, getStageByXp } from "../constants/civicRoute";
import type { UserProgression, ProgressionStage, StageStatus } from "../types";

export function useProgression(): UserProgression {
  const user = useCurrentUser();
  const xp = user?.xp ?? 0;

  return useMemo(() => {
    const currentStage = getStageByXp(xp);
    const stageIndex = CIVIC_ROUTE.findIndex((s) => s.level === currentStage.level);

    const nextStage: ProgressionStage | null =
      stageIndex < CIVIC_ROUTE.length - 1 ? CIVIC_ROUTE[stageIndex + 1] : null;

    const previousStages = CIVIC_ROUTE.slice(0, stageIndex);

    const xpInStage = xp - currentStage.xpFrom;
    const stageRange = currentStage.xpTo - currentStage.xpFrom;
    const progressPct = Math.min(100, Math.max(0, (xpInStage / stageRange) * 100));
    const xpToNextStage = nextStage ? currentStage.xpTo - xp : 0;

    const status: StageStatus =
      xp >= currentStage.xpTo ? "completed" : "current";

    return {
      currentStage,
      previousStages,
      nextStage,
      progressPct,
      xpInStage,
      xpToNextStage,
      status,
    };
  }, [xp]);
}

/**
 * Returns status for a given stage relative to the user's XP
 */
export function useStageStatus(
  stageLevel: number,
  userXp: number
): StageStatus {
  const stage = CIVIC_ROUTE.find((s) => s.level === stageLevel);
  if (!stage) return "locked";

  if (userXp >= stage.xpTo) return "completed";
  if (userXp >= stage.xpFrom) return "current";
  return "locked";
}
