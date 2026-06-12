import { CheckCircle2, Archive } from "lucide-react";
import type { Initiative } from "@/domain/initiative";
import { isLivingTerritoryEnabled } from "@/lib/operationalFeature";

interface CivicAfterglowProps {
  initiative: Initiative;
  districtName?: string;
  evidenceCount?: number;
}

function afterglowCopy(
  lifecycle: "completed" | "dormant",
  districtName?: string,
): { title: string; line: string } {
  const place = districtName ? ` de ${districtName}` : "";
  if (lifecycle === "completed") {
    return {
      title: "Memoria viva",
      line: `Esta ruta ya forma parte de la memoria colectiva${place}. Lo sembrado aquí sigue presente.`,
    };
  }
  return {
    title: "Semilla sembrada",
    line: `Esta iniciativa fue parte importante del camino${place}. Las semillas que dejó siguen en la tierra.`,
  };
}

export function CivicAfterglow({ initiative, districtName, evidenceCount }: CivicAfterglowProps) {
  if (!isLivingTerritoryEnabled()) return null;
  if (initiative.lifecycle !== "completed" && initiative.lifecycle !== "dormant") return null;

  const copy = afterglowCopy(initiative.lifecycle, districtName);
  const Icon = initiative.lifecycle === "completed" ? CheckCircle2 : Archive;

  return (
    <div className="rounded-2xl p-4 border border-emerald-200/30 dark:border-emerald-900/20 bg-emerald-50/30 dark:bg-emerald-950/10">
      <div className="flex items-start gap-3">
        <Icon className="h-4 w-4 mt-0.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            {copy.title}
          </p>
          <p className="text-xs text-foreground/70 leading-relaxed">{copy.line}</p>
          {initiative.lifecycle === "completed" && evidenceCount != null && evidenceCount > 0 && (
            <p className="text-[11px] text-muted-foreground/60 font-medium">
              {evidenceCount} evidencia{evidenceCount !== 1 ? "s" : ""} verificada
              {evidenceCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
