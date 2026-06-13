import { motion } from "framer-motion";
import { MapPin, Users, Heart, Clock, Zap } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { Initiative } from "@/domain/initiative";
import { getInitiativeDetailRoute } from "@/domain/initiativeRoute";
import type { InitiativeAction } from "@/domain/initiativeActions";
import { deriveRelationship } from "@/domain/initiativeActions";
import { getLifecyclePresentation } from "@/domain/lifecyclePresentation";
import { regionGradient, regionLabel, type Region } from "@/domain/regions";
import { getProposalThreshold } from "@/domain/proposalLifecycle";
import { useCurrentUserId } from "@/features/auth";
import { useSupportProposal, useSupportCount } from "@/features/proposals/hooks/useSupportProposal";
import { useJoinInitiativeAction } from "@/features/actions/useJoinInitiativeAction";
import { InitiativeActionBar } from "@/features/actions/components/InitiativeActionBar";
import { shareInitiative } from "@/features/actions/shareInitiative";
import { isMunicipalCollabEnabled, isLivingTerritoryEnabled } from "@/lib/operationalFeature";
import { EndorsementBadge } from "@/features/institutions";

const REGION_ACCENT: Record<string, string> = {
  costa: "from-coast/30 to-sun/20 border-coast/40",
  sierra: "from-sierra/30 to-sierra/10 border-sierra/40",
  selva: "from-jungle/30 to-jungle/10 border-jungle/40",
  cumbre: "from-sun/30 to-coast/10 border-sun/40",
};

interface InitiativeCardProps {
  initiative: Initiative;
  index?: number;
  xp?: number | null;
  spotsLeft?: number | null;
}

export function InitiativeCard({ initiative, index = 0, xp, spotsLeft }: InitiativeCardProps) {
  const isMission = initiative.sourceType === "mission";
  const isProposal = initiative.sourceType === "proposal";
  const district = initiative.location?.district ?? "";
  const accentClass = REGION_ACCENT[initiative.region] ?? REGION_ACCENT.costa;
  const bandClass = regionGradient(initiative.region as Region);
  const presentation = getLifecyclePresentation(initiative.lifecycle);
  const isHidden = presentation.isHidden;
  const isFull = spotsLeft === 0;
  const proposalId = isProposal ? initiative.sourceId : "";
  const { data: supportCount = 0 } = useSupportCount(proposalId);
  const { isSupported } = useSupportProposal();
  const currentUserId = useCurrentUserId();
  const navigate = useNavigate();

  const { handleJoin } = useJoinInitiativeAction();

  const relationship = deriveRelationship({
    currentUserId: currentUserId ?? undefined,
    isSupported: isSupported(initiative.sourceId),
    isOwner: !!currentUserId && currentUserId === initiative.ownerId,
  });

  const handleAction = (action: InitiativeAction) => {
    switch (action) {
      case "join":
        handleJoin(initiative.sourceId, { lifecycle: initiative.lifecycle });
        break;
      case "support":
      case "comment":
      case "edit":
      case "report": {
        const route = getInitiativeDetailRoute(initiative);
        navigate(route);
        break;
      }
      case "share":
        shareInitiative(initiative.title, window.location.href);
        break;
    }
  };

  if (isHidden) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      className={`relative flex flex-col rounded-2xl border bg-gradient-to-br ${
        isProposal
          ? "border-violet-200 dark:border-violet-900/30 border-dashed bg-violet-50/40 dark:bg-violet-950/10"
          : `${accentClass} glass-strong`
      } shadow-soft hover:shadow-card transition-smooth group overflow-hidden`}
    >
      {isMission && <div className={`h-1.5 w-full ${bandClass}`} />}
      {isProposal && (
        <div className="h-1.5 w-full bg-gradient-to-r from-violet-400 to-violet-600" />
      )}

      <div
        onClick={() => {
          const route = getInitiativeDetailRoute(initiative);
          navigate(route);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const route = getInitiativeDetailRoute(initiative);
            navigate(route);
          }
        }}
        role="button"
        tabIndex={0}
        className="flex flex-col flex-1 p-5 gap-3 cursor-pointer"
      >
        <div className="flex items-start gap-3">
          <div
            className={`h-12 w-12 rounded-xl grid place-items-center text-2xl shrink-0 shadow-soft ${
              isProposal
                ? "bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700/30"
                : `${bandClass}`
            }`}
          >
            {isProposal ? "🌱" : initiative.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                {regionLabel(initiative.region as Region)}
              </span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">{initiative.category}</span>
              {isProposal && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/30 font-bold">
                  🌱 Propuesta
                </span>
              )}
              {isMission && initiative.lifecycle === "active" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Activa
                </span>
              )}
              {isMission && initiative.lifecycle === "forming" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/30 text-[8px] font-bold text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30">
                  <Clock className="h-2.5 w-2.5" />
                  Próxima
                </span>
              )}
              {isMission && initiative.lifecycle === "completed" && !isLivingTerritoryEnabled() && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-stone-50 dark:bg-stone-950/30 text-[8px] font-bold text-stone-500 dark:text-stone-400 border border-stone-100 dark:border-stone-900/30">
                  Finalizada
                </span>
              )}
              {isMission && initiative.lifecycle === "completed" && isLivingTerritoryEnabled() && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30">
                  Memoria viva
                </span>
              )}
              {initiative.lifecycle === "archived" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800/30 text-[8px] font-bold text-stone-400 dark:text-stone-500 border border-stone-200 dark:border-stone-700/30">
                  🗄️ Archivada
                </span>
              )}
              {initiative.lifecycle === "forming" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-[8px] font-bold text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30">
                  Por realizarse
                </span>
              )}
            </div>
            <h3 className="font-display font-semibold text-sm leading-snug text-foreground group-hover:text-accent transition-colors line-clamp-2">
              {initiative.title}
            </h3>
          </div>
        </div>

          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {district}
              </span>
              <span className="flex items-center gap-1">{initiative.temporalAnchor.label}</span>
            </div>
            {isMunicipalCollabEnabled() && initiative.endorsements && initiative.endorsements.length > 0 && (
              <div className="mt-0.5">
                <EndorsementBadge endorsements={initiative.endorsements} variant="compact" />
              </div>
            )}
            {isMission && initiative.participantsCount != null && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {initiative.participantsCount} participantes
              </span>
            )}
            {isProposal && supportCount > 0 && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3 text-violet-500" />
                <span className="text-violet-600 dark:text-violet-400">
                  {supportCount} apoyo{supportCount !== 1 ? "s" : ""}
                </span>
              </span>
            )}
          </div>

        {isProposal && (
          <div className="mt-1">
            <div className="w-full h-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all duration-500"
                style={{ width: `${Math.min(100, (supportCount / Math.max(1, getProposalThreshold(initiative.teamSize ?? 5))) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[9px] text-violet-500 dark:text-violet-400 font-medium">
              Buscando apoyo de la comunidad
            </p>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {isMission && xp != null && (
              <span className="text-[9px] text-muted-foreground/40 font-medium">
                +{xp} XP
              </span>
            )}
            {isMission &&
              spotsLeft != null &&
              (isFull ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-semibold">
                  Lleno
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-muted-foreground">
                  {spotsLeft} lugares
                </span>
              ))}
            {isProposal && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30 font-semibold">
                <Heart className="h-3 w-3" /> En apoyo
              </span>
            )}
          </div>
          <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <InitiativeActionBar
              initiative={initiative}
              relationship={relationship}
              variant="compact"
              maxVisible={1}
              onAction={handleAction}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
