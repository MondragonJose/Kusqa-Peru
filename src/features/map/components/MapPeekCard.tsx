import { MapPin, Sparkles, Users, X } from "lucide-react";
import { REGION_META } from "@/constants/gamification";
import type { InitiativeMapEntity } from "@/domain/initiativeMapEntity";
import type { InitiativeAction } from "@/domain/initiativeActions";

export type MapPeekCardProps = {
  entity: InitiativeMapEntity;
  onClose: () => void;
  onViewDetail: () => void;
  onPrimaryAction: (action: InitiativeAction) => void;
  variant: "floating" | "sidebar";
};

export function MapPeekCard({
  entity,
  onClose,
  onViewDetail,
  onPrimaryAction,
  variant,
}: MapPeekCardProps) {
  const regionMeta = REGION_META[entity.region as keyof typeof REGION_META] ?? REGION_META.costa;
  const isProposal = entity.sourceType === "proposal";
  const primaryAction: InitiativeAction = isProposal ? "support" : "join";
  const primaryLabel = isProposal ? "Apoyar" : "Unirse";
  const PrimaryIcon = isProposal ? Sparkles : Users;

  const card = (
    <>
      <button
        onClick={onClose}
        className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/10 hover:bg-black/20 grid place-items-center transition-colors cursor-pointer z-10"
      >
        <X className="h-3 w-3" />
      </button>

      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0 mt-0.5">{entity.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">
            {regionMeta.name}
          </div>
          <h3 className="font-display font-bold text-sm leading-tight truncate text-foreground">
            {entity.title}
          </h3>
          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{entity.location?.district ?? entity.region}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => onPrimaryAction(primaryAction)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            isProposal
              ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/50"
              : "bg-accent text-white hover:opacity-90"
          }`}
        >
          <PrimaryIcon className="h-3 w-3 inline-block -mt-0.5 mr-1" />
          {primaryLabel}
        </button>
        <button
          onClick={onViewDetail}
          className="px-3 py-1.5 rounded-lg border border-border/30 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-all cursor-pointer"
        >
          Ver detalle
        </button>
      </div>
    </>
  );

  if (variant === "floating") {
    return (
      <div className="absolute bottom-[calc(3rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:right-auto sm:max-w-xs z-[1000] animate-in slide-in-from-bottom-2 duration-200 max-h-[calc(100vh-8rem)] overflow-hidden">
        <div className="bg-card border border-border/40 rounded-2xl shadow-lift p-4 relative">
          {card}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-card border border-border/40 rounded-2xl p-4 relative">{card}</div>
  );
}
