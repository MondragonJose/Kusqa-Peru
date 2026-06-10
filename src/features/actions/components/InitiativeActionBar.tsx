import { ArrowRight, Sparkles, MessageCircle, Share2, Pencil, Flag } from "lucide-react";
import type { Initiative } from "@/domain/initiative";
import type { InitiativeAction, UserRelationship } from "@/domain/initiativeActions";
import { getAvailableInitiativeActions, ACTION_PRIORITY, actionToLabel } from "@/domain/initiativeActions";

const ICON_MAP: Record<InitiativeAction, typeof ArrowRight> = {
  support: Sparkles,
  join: ArrowRight,
  comment: MessageCircle,
  share: Share2,
  edit: Pencil,
  report: Flag,
};

interface InitiativeActionBarProps {
  initiative: Initiative;
  relationship: UserRelationship;
  variant?: "row" | "compact" | "popup";
  maxVisible?: number;
  onAction?: (action: InitiativeAction) => void;
}

export function InitiativeActionBar({
  initiative,
  relationship,
  variant = "row",
  maxVisible = 3,
  onAction,
}: InitiativeActionBarProps) {
  const context = {
    lifecycle: initiative.lifecycle,
    sourceType: initiative.sourceType,
    relationship,
  };

  const available = getAvailableInitiativeActions(context)
    .sort((a, b) => ACTION_PRIORITY[a] - ACTION_PRIORITY[b])
    .slice(0, maxVisible);

  if (available.length === 0) return null;

  if (variant === "popup") {
    const primary = available[0];
    const Icon = ICON_MAP[primary];
    return (
      <button
        onClick={() => onAction?.(primary)}
        className="w-full inline-flex justify-center items-center gap-1 rounded-lg bg-accent text-white py-2 text-xs font-bold transition-all shadow-sm hover:opacity-90"
      >
        <Icon className="h-3.5 w-3.5" />
        {actionToLabel(primary)}
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1">
        {available.map((action) => {
          const Icon = ICON_MAP[action];
          return (
            <button
              key={action}
              onClick={() => onAction?.(action)}
              className="h-8 w-8 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/30 grid place-items-center transition-colors"
              title={actionToLabel(action)}
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {available.map((action) => {
        const Icon = ICON_MAP[action];
        return (
          <button
            key={action}
            onClick={() => onAction?.(action)}
            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:gap-1.5 ${
              action === "support"
                ? "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/50"
                : action === "join"
                  ? "text-accent bg-accent/10 hover:bg-accent/20"
                  : "text-muted-foreground bg-secondary/40 hover:bg-secondary/80"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {actionToLabel(action)}
          </button>
        );
      })}
    </div>
  );
}
