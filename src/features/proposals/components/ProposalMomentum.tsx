import { Clock, Sparkles, Target } from "lucide-react";
import { useSupportCount } from "@/features/proposals";
import {
  getProposalMomentum,
  getMomentumMessage,
  getProposalAgeContext,
  getProposalThreshold,
} from "@/domain/proposalLifecycle";
import type { Proposal } from "@/services/proposalContract";

interface ProposalMomentumProps {
  proposal: Proposal;
}

export function ProposalMomentum({ proposal }: ProposalMomentumProps) {
  const { data: supportCount = 0 } = useSupportCount(proposal.id);
  const threshold = getProposalThreshold(proposal.teamSize);
  const momentum = getProposalMomentum(proposal.createdAt, supportCount);
  const message = getMomentumMessage(proposal.createdAt, supportCount, threshold);

  const ageContext = momentum ? getProposalAgeContext(momentum.daysActive) : null;

  return (
    <section className="px-4 sm:px-8 py-4 border-b border-border/40">
      <div className="flex items-center gap-3 flex-wrap">
        {momentum && (
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {momentum.daysActive} día{momentum.daysActive !== 1 ? "s" : ""} activa
            </span>
          </div>
        )}
        {momentum && momentum.supportsPerDay > 0 && (
          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            <span>
              ~{momentum.supportsPerDay} apoyo{momentum.supportsPerDay !== 1 ? "s" : ""}/día
            </span>
          </div>
        )}
        {supportCount >= threshold && (
          <div className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <Target className="h-3.5 w-3.5" />
            <span>Umbral alcanzado</span>
          </div>
        )}
      </div>
      {message && (
        <p className="mt-2 text-xs sm:text-sm text-muted-foreground italic leading-relaxed">
          {message}
        </p>
      )}
      {ageContext && (
        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
          Propuesta en su {ageContext.label}.
        </p>
      )}
    </section>
  );
}
