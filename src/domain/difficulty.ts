import { Shield, TrendingUp, Mountain } from "lucide-react";
import type { ComponentType } from "react";

export type DifficultyLevel = "Suave" | "Andina" | "Cumbre";

export interface DifficultyMeta {
  icon: ComponentType<{ className?: string }>;
  color: string;
  label: string;
}

export const DIFFICULTY_META: Record<string, DifficultyMeta> = {
  Suave: {
    icon: Shield,
    color: "text-green-500",
    label: "Suave",
  },
  Andina: {
    icon: TrendingUp,
    color: "text-amber-500",
    label: "Andina",
  },
  Cumbre: {
    icon: Mountain,
    color: "text-red-500",
    label: "Cumbre",
  },
};

export function getDifficultyMeta(difficulty: string | null | undefined): DifficultyMeta | null {
  if (!difficulty) return null;
  return DIFFICULTY_META[difficulty] ?? null;
}
