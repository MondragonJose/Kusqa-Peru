import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MapPin, CalendarDays, Sparkles, Clock } from "lucide-react";
import type { Proposal } from "@/services/proposalContract";
import {
  getProposalPhase,
  getProposalPhaseCopy,
  getProposalThreshold,
} from "@/domain/proposalLifecycle";
import { computeProposalAnchor } from "@/domain/initiative";
import { regionGradient, regionLabel, type Region } from "@/domain/regions";
import { categoryEmoji, type MissionCategory } from "@/domain/categories";

interface ProposalHeroProps {
  proposal: Proposal;
}

export function ProposalHero({ proposal }: ProposalHeroProps) {
  const phase = getProposalPhase(proposal.status);
  const phaseCopy = getProposalPhaseCopy(phase);
  const emoji = categoryEmoji(proposal.category as MissionCategory);
  const bandClass = regionGradient(proposal.region);
  const displaySummary = proposal.summary?.trim() || "";
  const anchor = computeProposalAnchor(
    proposal.status,
    proposal.proposedDate,
    proposal.createdAt,
    proposal.convertedAt,
    proposal.completedAt,
    0,
    getProposalThreshold(proposal.teamSize),
  );
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
                {regionLabel(proposal.region)}
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
              {anchor.label}
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
