import { BookOpen, CheckCircle2, Archive } from "lucide-react";
import type {
  DistrictMemory,
  DistrictMemoryMilestone,
  DistrictRhythm,
} from "@/domain/territorialMemory";
import type { Initiative, InitiativeLifecycle } from "@/domain/initiative";

interface CivicMemorySectionProps {
  memory: DistrictMemory;
  completedDormantInitiatives?: Initiative[];
}

const MILESTONE_EMOJI: Record<DistrictMemoryMilestone["type"], string> = {
  first_initiative: "🌱",
  first_conversion: "🔄",
  first_completion: "✅",
  coalition_moment: "🤝",
  revival: "🌿",
};

const RHYTHM_LABEL: Record<DistrictRhythm, string> = {
  quiet: "pausado",
  first_steps: "primeros pasos",
  steady: "constante",
  bursty: "por oleadas",
  building: "acelerándose",
};

const RHYTHM_EMOJI: Record<DistrictRhythm, string> = {
  quiet: "🌙",
  first_steps: "🌱",
  steady: "🚶",
  bursty: "🌊",
  building: "📈",
};

function lifecycleLabel(lifecycle: InitiativeLifecycle): string {
  switch (lifecycle) {
    case "completed":
      return "Completada";
    case "dormant":
      return "Archivada";
    default:
      return "";
  }
}

function anchorLabel(initiative: Initiative): string {
  return initiative.temporalAnchor?.label ?? "";
}

export function CivicMemorySection({
  memory,
  completedDormantInitiatives,
}: CivicMemorySectionProps) {
  const { milestones, themes, rhythm, narrative } = memory;
  const hasEntries = completedDormantInitiatives && completedDormantInitiatives.length > 0;

  return (
    <section
      className="rounded-lg border border-border/40 bg-card/40 p-4 sm:p-5"
      aria-label="Memoria del distrito"
    >
      <div className="flex items-start gap-3">
        <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0 space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Memoria del distrito
          </h2>

          <p className="text-sm leading-relaxed text-foreground/85">{narrative}</p>

          {milestones.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider">
                Huellas
              </p>
              <ul className="space-y-1">
                {milestones.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                    <span aria-hidden className="mt-0.5 shrink-0">
                      {MILESTONE_EMOJI[m.type]}
                    </span>
                    <span>{m.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {themes.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider">
                Temas abordados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {themes.slice(0, 4).map((t) => (
                  <span
                    key={t.category}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/60 text-[11px] text-muted-foreground"
                  >
                    {t.category}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasEntries && (
            <div className="space-y-1.5 pt-1">
              <p className="text-[11px] text-muted-foreground/60 font-medium uppercase tracking-wider">
                Ciclos completados
              </p>
              <ul className="space-y-1.5">
                {completedDormantInitiatives!.slice(0, 6).map((initiative) => (
                  <li
                    key={initiative.id}
                    className="flex items-start gap-2 text-xs text-foreground/70"
                  >
                    {initiative.lifecycle === "completed" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
                    ) : (
                      <Archive className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{initiative.title}</p>
                      <p className="text-[11px] text-muted-foreground/60">
                        {lifecycleLabel(initiative.lifecycle)}
                        {anchorLabel(initiative) ? ` · ${anchorLabel(initiative)}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
            <span aria-hidden>{RHYTHM_EMOJI[rhythm]}</span>
            <span>Ritmo: {RHYTHM_LABEL[rhythm]}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
