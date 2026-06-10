import { motion } from "framer-motion";
import { MapPin, Users, Heart, Clock, Zap } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { Initiative } from "@/domain/initiative";
import type { InitiativeAction } from "@/domain/initiativeActions";
import { getLifecyclePresentation } from "@/domain/lifecyclePresentation";
import { regionGradient, regionLabel, type Region } from "@/domain/regions";
import { useSupportProposal, useSupportCount } from "@/features/proposals/hooks/useSupportProposal";
import { InitiativeActionBar } from "@/features/actions/components/InitiativeActionBar";
import { shareInitiative } from "@/features/actions/shareInitiative";

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
  const { supportProposal, isSupported, isSupporting } = useSupportProposal();
  const navigate = useNavigate();

  const relationship = isSupported(initiative.sourceId)
    ? ("supporter" as const)
    : ("visitor" as const);

  const handleAction = (action: InitiativeAction) => {
    switch (action) {
      case "support":
        if (isProposal && !isSupported(initiative.sourceId) && !isSupporting) {
          supportProposal({ proposalId: initiative.sourceId });
        }
        break;
      case "join":
        navigate({ to: "/app/mision/$missionId", params: { missionId: initiative.sourceId } });
        break;
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
          ? "border-violet-200 dark:border-violet-900/30 border-dashed bg-violet-50/30 dark:bg-violet-950/10"
          : `${accentClass} glass-strong`
      } shadow-soft hover:shadow-card transition-smooth group overflow-hidden`}
    >
      {isMission && <div className={`h-1.5 w-full ${bandClass}`} />}
      {isProposal && <div className="h-1.5 w-full bg-gradient-to-r from-violet-400 to-violet-600 opacity-50" />}

      <div className="flex flex-col flex-1 p-5 gap-3">
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
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/30 font-bold">
                  Semilla cívica
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
              {isMission && initiative.lifecycle === "completed" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-stone-50 dark:bg-stone-950/30 text-[8px] font-bold text-stone-500 dark:text-stone-400 border border-stone-100 dark:border-stone-900/30">
                  Finalizada
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
            <span className="flex items-center gap-1">
              {initiative.temporalAnchor.label}
            </span>
          </div>
          {isMission && initiative.participantsCount != null && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {initiative.participantsCount} participantes
            </span>
          )}
          {isProposal && supportCount > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-violet-500" />
              <span className="text-violet-600 dark:text-violet-400">{supportCount} apoyo{supportCount !== 1 ? "s" : ""}</span>
            </span>
          )}
        </div>

        {isProposal && (
          <div className="mt-1">
            <div className="w-full h-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all duration-500"
                style={{ width: `${Math.min(100, (supportCount / Math.max(1, 5)) * 100)}%` }}
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
              <>
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-bold text-accent">+{xp} XP</span>
              </>
            )}
            {isMission && spotsLeft != null && (
              isFull ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-semibold">
                  Lleno
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface text-muted-foreground">
                  {spotsLeft} lugares
                </span>
              )
            )}
            {isProposal && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30 font-semibold">
                En apoyo
              </span>
            )}
          </div>
          <InitiativeActionBar
            initiative={initiative}
            relationship={relationship}
            variant="row"
            maxVisible={2}
            onAction={handleAction}
          />
        </div>
      </div>
    </motion.div>
  );
}
