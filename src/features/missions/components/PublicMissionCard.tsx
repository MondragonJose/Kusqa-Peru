import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { MapPin, Users, Calendar, Zap, ArrowRight, Heart, Clock, Sparkles } from "lucide-react";
import type { Mission } from "@/types";
import type { CivicEntity } from "@/types/entity";
import { isMission, isProposal } from "@/types/entity";
import { formatRelativeDate } from "@/utils/date";
import { useSupportProposal, useSupportCount } from "@/features/proposals/hooks/useSupportProposal";
import { getSupportProgress } from "@/domain/proposalLifecycle";

const REGION_ACCENT: Record<string, string> = {
  costa: "from-coast/30 to-sun/20 border-coast/40",
  sierra: "from-sierra/30 to-sierra/10 border-sierra/40",
  selva: "from-jungle/30 to-jungle/10 border-jungle/40",
  cumbre: "from-sun/30 to-coast/10 border-sun/40",
};

const REGION_BAND: Record<string, string> = {
  costa: "bg-gradient-coast",
  sierra: "bg-gradient-andes",
  selva: "bg-gradient-jungle",
  cumbre: "bg-gradient-cumbre",
};

const REGION_LABEL: Record<string, string> = {
  costa: "Costa",
  sierra: "Sierra",
  selva: "Selva",
  cumbre: "Cumbre",
};

interface PublicMissionCardProps {
  entity: CivicEntity;
  index?: number;
}

export function PublicMissionCard({ entity, index = 0 }: PublicMissionCardProps) {
  const accentClass = REGION_ACCENT[entity.region] ?? REGION_ACCENT.costa;
  const bandClass = REGION_BAND[entity.region] ?? REGION_BAND.costa;
  const regionLabel = REGION_LABEL[entity.region] ?? entity.region;
  const isMissionEntity = isMission(entity);
  const isProposalEntity = isProposal(entity);
  const isFull = entity.spotsLeft === 0;
  const proposalId = isProposalEntity ? entity.id : "";
  const { data: supportCount = 0 } = useSupportCount(proposalId);
  const { supportProposal, isSupported, isSupporting } = useSupportProposal();

  const handleSupport = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isProposalEntity) {
      supportProposal({ proposalId: entity.id });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.07 }}
      className={`relative flex flex-col rounded-2xl border bg-gradient-to-br ${
        isProposalEntity
          ? "border-violet-200 dark:border-violet-900/30 border-dashed bg-violet-50/30 dark:bg-violet-950/10"
          : `${accentClass} glass-strong`
      } shadow-soft hover:shadow-card transition-smooth group overflow-hidden`}
    >
      {/* Top region band */}
      {isMissionEntity && <div className={`h-1.5 w-full ${bandClass}`} />}
      {isProposalEntity && <div className="h-1.5 w-full bg-gradient-to-r from-violet-400 to-violet-600 opacity-50" />}

      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div
            className={`h-12 w-12 rounded-xl grid place-items-center text-2xl shrink-0 shadow-soft ${
              isProposalEntity
                ? "bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700/30"
                : `${bandClass}`
            }`}
          >
            {isProposalEntity ? "🌱" : entity.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                {regionLabel}
              </span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">{entity.category}</span>
              {isProposalEntity && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/30 font-bold">
                  Semilla cívica
                </span>
              )}
              {isMissionEntity && entity.lifecycleInfo.lifecycle === "active" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-[8px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Activa
                </span>
              )}
              {isMissionEntity && entity.lifecycleInfo.lifecycle === "upcoming" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/30 text-[8px] font-bold text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30">
                  <Clock className="h-2.5 w-2.5" />
                  Próxima
                </span>
              )}
              {isMissionEntity && entity.lifecycleInfo.lifecycle === "completed" && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-stone-50 dark:bg-stone-950/30 text-[8px] font-bold text-stone-500 dark:text-stone-400 border border-stone-100 dark:border-stone-900/30">
                  Finalizada
                </span>
              )}
            </div>
            <h3 className="font-display font-semibold text-sm leading-snug text-foreground group-hover:text-accent transition-colors line-clamp-2">
              {entity.title}
            </h3>
          </div>
        </div>

        {/* Meta info - condensed to 2 lines */}
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {entity.district}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatRelativeDate(entity.date)}
            </span>
          </div>
          {isMissionEntity && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {entity.participants} participantes
            </span>
          )}
          {isProposalEntity && supportCount > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-violet-500" />
              <span className="text-violet-600 dark:text-violet-400">{supportCount} apoyo{supportCount !== 1 ? "s" : ""}</span>
            </span>
          )}
        </div>

        {/* Support progress bar for proposals */}
        {isProposalEntity && (
          <div className="mt-1">
            <div className="w-full h-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all duration-500"
                style={{ width: `${Math.min(100, (supportCount / Math.max(1, entity.spotsLeft || 5)) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[9px] text-violet-500 dark:text-violet-400 font-medium">
              Buscando apoyo de la comunidad
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {isMissionEntity && (
              <>
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-bold text-accent">+{entity.xp} XP</span>
              </>
            )}
            {isMissionEntity &&
              (isFull ? (
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive font-semibold">
                  Lleno
                </span>
              ) : (
                <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-surface text-muted-foreground">
                  {entity.spotsLeft} lugares
                </span>
              ))}
            {isProposalEntity && (
              <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30 font-semibold">
                En apoyo
              </span>
            )}
          </div>
          {isMissionEntity ? (
            <Link
              to="/app/mision/$missionId"
              params={{ missionId: entity.id }}
              className="inline-flex items-center gap-1 text-xs text-accent font-semibold hover:gap-2 transition-all"
            >
              Unirme <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            <button
              onClick={handleSupport}
              disabled={isSupporting || isSupported(entity.id)}
              className={`inline-flex items-center gap-1 text-xs font-semibold hover:gap-2 transition-all ${
                isSupported(entity.id) ? "text-violet-600 dark:text-violet-400" : "text-violet-600 dark:text-violet-400"
              }`}
            >
              {isSupporting ? (
                <>Apoyando...</>
              ) : isSupported(entity.id) ? (
                <>
                  Apoyado <Heart className="h-3 w-3 fill-current" />
                </>
              ) : (
                <>
                  Apoyar iniciativa <Sparkles className="h-3 w-3" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
