import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MapPin, CalendarDays, Sparkles } from "lucide-react";
import { formatRelativeDate } from "@/utils/date";
import type { Proposal } from "@/services/proposalContract";
import { getProposalPhase, getProposalPhaseCopy } from "@/domain/proposalLifecycle";

const REGION_LABEL: Record<string, string> = {
  costa: "Costa",
  sierra: "Sierra",
  selva: "Selva",
};

const REGION_BAND: Record<string, string> = {
  costa: "bg-gradient-coast",
  sierra: "bg-gradient-andes",
  selva: "bg-gradient-jungle",
};

const CATEGORY_EMOJI: Record<string, string> = {
  "Medio ambiente": "🌱",
  Educación: "📚",
  "Arte & cultura": "🎨",
  Comunidad: "🤝",
  Salud: "❤️",
  Tecnología: "🏗️",
};

interface ProposalHeroProps {
  proposal: Proposal;
}

export function ProposalHero({ proposal }: ProposalHeroProps) {
  const phase = getProposalPhase(proposal.status);
  const phaseCopy = getProposalPhaseCopy(phase);
  const emoji = CATEGORY_EMOJI[proposal.category] ?? "📌";
  const regionLabel = REGION_LABEL[proposal.region] ?? proposal.region;
  const bandClass = REGION_BAND[proposal.region] ?? REGION_BAND.costa;
  const displaySummary = proposal.summary?.trim() || proposal.description?.trim() || "";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative w-full"
    >
      <div className={`h-1.5 w-full ${bandClass}`} />

      <div className="px-5 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-6">
        <div className="flex items-start gap-4">
          <div
            className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl ${bandClass} grid place-items-center text-3xl sm:text-4xl shrink-0 shadow-soft`}
            aria-hidden
          >
            {emoji}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                {regionLabel}
              </span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] text-muted-foreground">{proposal.category}</span>
              <Badge variant="secondary" className="ml-1 text-[10px] py-0 h-5 font-bold">
                {phaseCopy.shortLabel}
              </Badge>
            </div>

            <h1 className="font-display font-semibold text-2xl sm:text-3xl leading-tight text-foreground">
              {proposal.title}
            </h1>
          </div>
        </div>

        {displaySummary && (
          <p className="mt-4 text-[15px] sm:text-base text-foreground/85 leading-relaxed">
            {displaySummary}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {proposal.locationLabel?.trim() || proposal.district}
          </span>
          {proposal.proposedDate && (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatRelativeDate(proposal.proposedDate)}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {phaseCopy.blurb}
          </span>
        </div>
      </div>
    </motion.section>
  );
}
