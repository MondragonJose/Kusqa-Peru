import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MapPin, CalendarDays, Sparkles } from "lucide-react";
import { formatProposedDate } from "@/utils/date";
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
  const displaySummary = proposal.summary?.trim() || "";
  const proposedDateLabel = formatProposedDate(proposal.proposedDate);
  const hasProposedDate = !!proposal.proposedDate;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative w-full"
    >
      <div className={`h-1.5 w-full ${bandClass}`} />

      <div className="px-5 pt-6 pb-5 sm:px-8 sm:pt-8 sm:pb-6">
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

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-2">
          <div className="inline-flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-foreground/85 font-medium">
              {proposal.locationLabel?.trim() || proposal.district}
            </span>
          </div>
          <div
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 ${
              hasProposedDate ? "bg-accent/10" : "bg-secondary/30"
            }`}
          >
            <CalendarDays
              className={`h-3.5 w-3.5 ${hasProposedDate ? "text-accent" : "text-muted-foreground"}`}
            />
            <span
              className={`text-xs font-semibold ${
                hasProposedDate ? "text-accent" : "text-muted-foreground"
              }`}
            >
              {proposedDateLabel}
            </span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-secondary/30 px-3 py-2">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{phaseCopy.label}</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
