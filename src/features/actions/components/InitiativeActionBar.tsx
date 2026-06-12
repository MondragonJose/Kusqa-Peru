import { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  MessageCircle,
  Share2,
  Pencil,
  Flag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Initiative } from "@/domain/initiative";
import { isDormant } from "@/domain/initiative";
import type { InitiativeAction, UserRelationship } from "@/domain/initiativeActions";
import {
  getAvailableInitiativeActions,
  ACTION_PRIORITY,
  actionToLabel,
} from "@/domain/initiativeActions";

const ICON_MAP: Record<InitiativeAction, React.ComponentType<{ className?: string }>> = {
  support: Sparkles,
  join: ArrowRight,
  comment: MessageCircle,
  share: Share2,
  edit: Pencil,
  report: Flag,
};

export interface InitiativeActionBarProps {
  initiative: Initiative;
  relationship?: UserRelationship;
  onSupport?(): void;
  onJoin?(): void;
  onShare?(): void;
  onComment?(): void;
  onEdit?(): void;
  onReport?(): void;
  /** Catch-all handler — called when no specific handler is provided */
  onAction?: (action: InitiativeAction) => void;
  labelOverrides?: Partial<Record<InitiativeAction, string>>;
  variant?: "row" | "stack" | "compact" | "popup";
  maxVisible?: number;
}

export function InitiativeActionBar({
  initiative,
  relationship = "visitor",
  onSupport,
  onJoin,
  onShare,
  onComment,
  onEdit,
  onReport,
  onAction,
  labelOverrides,
  variant = "row",
  maxVisible = 3,
}: InitiativeActionBarProps) {
  const [showAll, setShowAll] = useState(false);
  const dormant = isDormant(initiative);

  const actions = getAvailableInitiativeActions({
    lifecycle: initiative.lifecycle,
    sourceType: initiative.sourceType,
    relationship,
  }).sort((a, b) => ACTION_PRIORITY[a] - ACTION_PRIORITY[b]);

  if (actions.length === 0) return null;

  const getLabel = (action: InitiativeAction): string =>
    labelOverrides?.[action] ??
    actionToLabel(action, initiative.lifecycle, initiative.sourceType, dormant);

  const getHandler = (action: InitiativeAction): (() => void) | undefined => {
    const specific = {
      support: onSupport,
      join: onJoin,
      share: onShare,
      comment: onComment,
      edit: onEdit,
      report: onReport,
    }[action];
    if (specific) return specific;
    if (onAction) return () => onAction(action);
    return undefined;
  };

  const isPrimary = (a: InitiativeAction) => a === "support" || a === "join";
  const isReportAction = (a: InitiativeAction) => a === "report";

  const visible = showAll ? actions : actions.slice(0, maxVisible);
  const hasOverflow = actions.length > maxVisible;

  function ActionButton({ action }: { action: InitiativeAction }) {
    const Icon = ICON_MAP[action];
    const handler = getHandler(action);
    const label = getLabel(action);
    const disabled = !handler;

    if (variant === "compact") {
      if (isPrimary(action)) {
        return (
          <button
            key={action}
            onClick={handler}
            disabled={disabled}
            title={disabled ? "No disponible" : undefined}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent text-white px-3 py-2 text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      }
      return (
        <button
          key={action}
          onClick={handler}
          disabled={disabled}
          title={disabled ? "No disponible" : label}
          aria-label={label}
          className="h-8 w-8 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/30 grid place-items-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      );
    }

    if (variant === "popup") {
      if (isPrimary(action)) {
        return (
          <button
            key={action}
            onClick={handler}
            disabled={disabled}
            title={disabled ? "No disponible" : undefined}
            className="w-full inline-flex justify-center items-center gap-1.5 rounded-lg bg-accent text-white py-2.5 px-4 text-xs font-bold transition-all shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      }
      return (
        <button
          key={action}
          onClick={handler}
          disabled={disabled}
          title={label}
          aria-label={label}
          className="h-8 w-8 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/30 grid place-items-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      );
    }

    const baseBtn =
      "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed";

    const btnStyle = isPrimary(action)
      ? "bg-accent text-white hover:opacity-90"
      : isReportAction(action)
        ? "text-muted-foreground bg-secondary/40 hover:bg-secondary/80"
        : "text-muted-foreground bg-secondary/40 hover:bg-secondary/80";

    const btn = (
      <button
        key={action}
        onClick={handler}
        disabled={disabled}
        title={disabled ? "No disponible" : undefined}
        className={`${baseBtn} ${btnStyle}`}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </button>
    );

    if (variant === "stack") {
      return (
        <div key={action} className="w-full">
          {btn}
        </div>
      );
    }

    return btn;
  }

  function OverflowButton() {
    if (!hasOverflow) return null;
    if (showAll) {
      const Btn =
        variant === "compact" ? (
          <button
            onClick={() => setShowAll(false)}
            className="h-8 w-8 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/30 grid place-items-center transition-colors"
            title="Ver menos"
            aria-label="Ver menos"
          >
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ) : (
          <button
            onClick={() => setShowAll(false)}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground bg-secondary/40 hover:bg-secondary/80 transition-colors"
          >
            <ChevronUp className="h-3 w-3" />
            Ver menos
          </button>
        );
      return Btn;
    }

    if (variant === "compact") {
      return (
        <button
          onClick={() => setShowAll(true)}
          className="h-8 w-8 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/30 grid place-items-center transition-colors"
          title={`+${actions.length - maxVisible} más`}
          aria-label="Ver más acciones"
        >
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      );
    }

    return (
      <button
        onClick={() => setShowAll(true)}
        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground bg-secondary/40 hover:bg-secondary/80 transition-colors"
      >
        +{actions.length - maxVisible} Más
        <ChevronDown className="h-3 w-3" />
      </button>
    );
  }

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1">
        {visible.map((a) => (
          <ActionButton key={a} action={a} />
        ))}
        <OverflowButton />
      </div>
    );
  }

  if (variant === "popup") {
    const primary = actions.find(isPrimary) ?? actions[0];
    const secondary = actions.filter((a) => a !== primary);
    return (
      <div className="flex flex-col gap-1.5">
        <ActionButton action={primary} />
        {secondary.length > 0 && (
          <div className="flex items-center gap-1 justify-center">
            {secondary.map((a) => (
              <ActionButton key={a} action={a} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // row / stack
  const layoutClass =
    variant === "stack" ? "flex flex-col w-full gap-1" : "flex items-center gap-1.5 flex-wrap";

  return (
    <div className={layoutClass}>
      {visible.map((a) => (
        <ActionButton key={a} action={a} />
      ))}
      <OverflowButton />
    </div>
  );
}
