import { Link, useNavigate } from "@tanstack/react-router";
import { MapPin, X, Sparkles, Users, Shield } from "lucide-react";
import { REGION_META } from "@/constants/gamification";
import { districtSlugify } from "@/utils/districtSlug";
import { mapEntityToActionInitiative } from "../projections/mapEntityProjection";
import type { InitiativeMapEntity } from "@/domain/initiativeMapEntity";
import type { InitiativeAction } from "@/domain/initiativeActions";
import { getInitiativeDetailRoute } from "@/domain/initiativeRoute";
import { InitiativeActionBar } from "@/features/actions/components/InitiativeActionBar";
import { shareInitiative } from "@/features/actions/shareInitiative";
import { getDifficultyMeta } from "@/domain/difficulty";

export type MapDetailPanelProps = {
  entity: InitiativeMapEntity;
  onClose: () => void;
  /** Called when user clicks "support" on a proposal. When omitted, navigates to the proposal page. */
  onSupport?: (proposalId: string) => void;
  /** Called when user clicks "join" on a mission. When omitted, navigates to the mission page. */
  onJoin?: (missionId: string) => void;
};

export function MapDetailPanel({ entity, onClose, onSupport, onJoin }: MapDetailPanelProps) {
  const navigate = useNavigate();
  const regionMeta = REGION_META[entity.region as keyof typeof REGION_META] ?? REGION_META.costa;
  const diffMeta = getDifficultyMeta(entity.difficulty);

  const stats = [
    { label: "Puntos XP", value: `+${entity.xp ?? 0}`, icon: Sparkles, color: "text-muted-foreground" },
    { label: "Cupos", value: entity.spotsLeft ?? "—", icon: Users, color: "text-muted-foreground" },
    { label: "Dificultad", value: entity.difficulty ?? "—", icon: diffMeta?.icon ?? Shield, color: diffMeta?.color ?? "text-muted-foreground" },
  ];

  return (
    <div className="h-full bg-card border border-border/40 rounded-2xl flex flex-col overflow-hidden">
      {/* Header gradient + close */}
      <div className={`${regionMeta.gradient} p-4 text-white relative shrink-0`}>
        <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div className="text-3xl drop-shadow-md select-none">{entity.emoji}</div>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-full bg-black/20 hover:bg-black/30 grid place-items-center transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 text-[9px] uppercase tracking-widest font-bold opacity-90">
            {regionMeta.name} · {entity.category}
          </div>
          <h2 className="font-display font-bold text-sm mt-0.5 leading-tight drop-shadow-sm truncate">
            {entity.title}
          </h2>
          <div className="text-[10px] opacity-95 mt-1 flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <Link
              to="/app/distrito/$slug"
              params={{
                slug: districtSlugify(entity.location?.district ?? entity.region),
              }}
              className="truncate hover:underline"
            >
              {entity.location?.district ?? entity.region}
            </Link>
          </div>
          {entity.temporalAnchor?.label && (
            <div className="text-[9px] font-medium text-white/80 mt-0.5">
              {entity.temporalAnchor.label}
            </div>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-xs text-muted-foreground leading-relaxed">{entity.summary}</p>

        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl bg-secondary/50 border border-border/20 p-2.5 text-center"
            >
              <s.icon className={`h-3.5 w-3.5 mx-auto mb-0.5 ${s.color}`} />
              <div className="font-display font-extrabold text-foreground text-xs">{s.value}</div>
              <div className="text-[7px] uppercase tracking-wider text-muted-foreground mt-0.5 font-bold">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {entity.impact && (
          <div className="rounded-xl bg-accent/5 border border-accent/15 p-3 text-xs">
            <div className="text-accent font-bold uppercase tracking-wider text-[7px] mb-0.5">
              Impacto esperado
            </div>
            <div className="font-bold text-foreground">{entity.impact}</div>
          </div>
        )}

        {entity.organizerName && (
          <div className="flex items-center gap-3 pt-2 border-t border-border/10 text-xs">
            <span className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-base select-none">
              {entity.organizerAvatar ?? "🧑"}
            </span>
            <div>
              <div className="text-[9px] text-muted-foreground">Organizador</div>
              <div className="font-bold text-foreground">{entity.organizerName}</div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-border/20">
          <InitiativeActionBar
            initiative={mapEntityToActionInitiative(entity)}
            relationship="visitor"
            variant="row"
            maxVisible={4}
            onAction={(action: InitiativeAction) => {
              switch (action) {
                case "support":
                  if (onSupport) {
                    onSupport(entity.sourceId);
                  } else {
                    const route = getInitiativeDetailRoute(entity);
                    navigate(route);
                  }
                  break;
                case "join":
                  if (onJoin) {
                    onJoin(entity.id);
                  } else {
                    const route = getInitiativeDetailRoute(entity);
                    navigate(route);
                  }
                  break;
                case "share":
                  shareInitiative(entity.title, window.location.href);
                  break;
                case "comment": {
                  const route = getInitiativeDetailRoute(entity);
                  navigate({ ...route, hash: "comments" });
                  break;
                }
                case "edit":
                case "report": {
                  const route = getInitiativeDetailRoute(entity);
                  navigate(route);
                  break;
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
