import { useMemo } from "react";
import { MapPin, Sparkles, Users, Shield } from "lucide-react";
import { REGION_META } from "@/constants/gamification";
import {
  projectMapSidebarItem,
  type SidebarItemProjection,
} from "../projections/mapEntityProjection";
import type { InitiativeMapEntity } from "@/domain/initiativeMapEntity";
import type { InitiativeAction } from "@/domain/initiativeActions";
import { MapDetailPanel } from "./MapDetailPanel";
import { MapPeekCard } from "./MapPeekCard";
import { getDifficultyMeta } from "@/domain/difficulty";

export type MapSidebarProps = {
  entities: InitiativeMapEntity[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  isLoading: boolean;
  /** When set, renders MapDetailPanel embedded instead of the entity list */
  detailEntity?: InitiativeMapEntity | null;
  onCloseDetail?: () => void;
  /** When set, renders a compact peek card instead of the entity list */
  peekEntity?: InitiativeMapEntity | null;
  onViewDetail?: () => void;
  onPeekAction?: (action: InitiativeAction) => void;
  onSupport?: (proposalId: string) => void;
  onJoin?: (missionId: string) => void;
};

function SidebarItem({
  item,
  isSelected,
  isHovered,
  onClick,
  onHover,
}: {
  item: SidebarItemProjection;
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (v: boolean) => void;
}) {
  const regionMeta = REGION_META[item.region as keyof typeof REGION_META] ?? REGION_META.costa;
  const isProposal = item.organizerName === null && item.spotsLeft === null;
  const diffMeta = getDifficultyMeta(item.difficulty);
  const DifficultyIcon = diffMeta?.icon ?? null;
  const difficultyColor = diffMeta?.color ?? "text-muted-foreground";

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? "bg-accent/10 border-accent/30 shadow-sm"
          : isHovered
            ? "bg-secondary/60 border-border/30"
            : "bg-transparent border-transparent hover:bg-secondary/40 hover:border-border/20"
      }`}
    >
      <div className="relative shrink-0 mt-0.5">
        <span
          className={`h-8 w-8 rounded-full grid place-items-center text-base ${
            isProposal
              ? "bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/40"
              : `bg-gradient-to-br ${regionMeta.gradient} text-white`
          }`}
        >
          {item.emoji}
        </span>
        {isProposal && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-violet-500 border-2 border-background grid place-items-center">
            <Sparkles className="h-2 w-2 text-white" />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-foreground truncate">{item.title}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <MapPin className="h-2.5 w-2.5 text-muted-foreground/60 shrink-0" />
          <span className="text-[9px] text-muted-foreground/70 truncate">{item.district}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {item.temporalLabel && (
            <span className="text-[8px] font-medium text-accent truncate">
              {item.temporalLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {item.xp != null && (
          <span className="text-[9px] font-bold text-amber-500 dark:text-amber-400 flex items-center gap-0.5">
            <Sparkles className="h-2.5 w-2.5" />+{item.xp}
          </span>
        )}
        {item.spotsLeft != null && (
          <span className="text-[8px] text-muted-foreground flex items-center gap-0.5">
            <Users className="h-2 w-2" />
            {item.spotsLeft}
          </span>
        )}
        {DifficultyIcon && item.difficulty && (
          <span className={`text-[8px] flex items-center gap-0.5 ${difficultyColor}`}>
            <DifficultyIcon className="h-2 w-2" />
            {item.difficulty}
          </span>
        )}
      </div>
    </button>
  );
}

export function MapSidebar({
  entities,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  isLoading,
  detailEntity,
  onCloseDetail,
  peekEntity,
  onViewDetail,
  onPeekAction,
  onSupport,
  onJoin,
}: MapSidebarProps) {
  const items = useMemo(() => entities.map(projectMapSidebarItem), [entities]);

  if (detailEntity) {
    return (
      <MapDetailPanel
        entity={detailEntity}
        onClose={onCloseDetail ?? (() => {})}
        onSupport={onSupport}
        onJoin={onJoin}
      />
    );
  }

  if (peekEntity) {
    return (
      <MapPeekCard
        entity={peekEntity}
        variant="sidebar"
        onClose={onCloseDetail ?? (() => {})}
        onViewDetail={onViewDetail ?? (() => {})}
        onPrimaryAction={onPeekAction ?? (() => {})}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="h-full bg-card border border-border/40 rounded-2xl p-3 space-y-2 overflow-y-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-secondary/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="h-full bg-card border border-border/40 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
        <div className="text-3xl mb-3">🔍</div>
        <p className="text-xs font-semibold text-muted-foreground">
          Ninguna iniciativa coincide con los filtros
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Prueba con otros criterios</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-card border border-border/40 rounded-2xl flex flex-col overflow-hidden">
      <div className="px-3 py-2.5 border-b border-border/20 flex items-center justify-between shrink-0">
        <span className="text-xs font-bold text-foreground">
          {items.length} iniciativa{items.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            isSelected={item.id === selectedId}
            isHovered={item.id === hoveredId}
            onClick={() => onSelect(item.id)}
            onHover={(v) => onHover(v ? item.id : null)}
          />
        ))}
      </div>
    </div>
  );
}
