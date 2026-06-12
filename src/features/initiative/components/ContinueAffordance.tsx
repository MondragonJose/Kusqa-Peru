import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import type { Initiative } from "@/domain/initiative";
import { isLivingTerritoryEnabled } from "@/lib/operationalFeature";
import { useContinueInitiative } from "@/features/initiative/mutations/useContinueInitiative";
import { toast } from "sonner";

interface ContinueAffordanceProps {
  initiative: Initiative;
  kind: "proposal" | "mission";
}

export function ContinueAffordance({ initiative, kind }: ContinueAffordanceProps) {
  const continueMutation = useContinueInitiative();

  if (!isLivingTerritoryEnabled()) return null;
  if (initiative.lifecycle !== "dormant") return null;

  const handleContinue = () => {
    continueMutation.mutate(
      { initiativeId: initiative.sourceId, kind },
      {
        onSuccess: (data) => {
          toast.success("Iniciativa retomada", {
            description: "Ya puedes reunir apoyo y mover esta causa de nuevo.",
          });
        },
        onError: (err) => {
          toast.error("No se pudo continuar", {
            description: err instanceof Error ? err.message : "Intenta de nuevo más tarde.",
          });
        },
      },
    );
  };

  const isPending = continueMutation.isPending;

  return (
    <div className="rounded-2xl p-4 border border-stone-200/40 dark:border-stone-800/30 bg-stone-50/40 dark:bg-stone-950/20">
      <div className="flex items-start gap-3">
        <div className="h-4 w-4 mt-0.5 shrink-0 grid place-items-center">
          {isPending ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-accent" />
          ) : continueMutation.isSuccess ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : continueMutation.isError ? (
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
          ) : (
            <span className="text-xs">🌱</span>
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Llévalo adelante
          </p>
          <p className="text-xs text-foreground/70 leading-relaxed">
            {continueMutation.isSuccess
              ? "Has retomado esta iniciativa. Ahora puedes reunir apoyo y darle un nuevo impulso."
              : "Esta causa puede seguir viva. Toma la posta y escribe el siguiente capítulo en tu distrito."}
          </p>
          {!continueMutation.isSuccess && (
            <button
              onClick={handleContinue}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/30 px-3 py-1.5 text-xs font-semibold text-accent transition-all disabled:opacity-40 disabled:cursor-wait"
            >
              {isPending ? "Continuando..." : "Continuar esta iniciativa"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
