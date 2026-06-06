import { Heart, Share2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KusqaButton } from "@/components/ui/kusqa-button";
import { useSupportProposal } from "@/features/proposals/hooks/useSupportProposal";
import { getProposalPhase, getProposalPhaseCopy } from "@/domain/proposalLifecycle";
import type { Proposal } from "@/services/proposalContract";

interface ProposalStickyCTAProps {
  proposal: Proposal;
}

export function ProposalStickyCTA({ proposal }: ProposalStickyCTAProps) {
  const phase = getProposalPhase(proposal.status);
  const copy = getProposalPhaseCopy(phase);
  const { supportProposal, isSupported, isSupporting } = useSupportProposal();

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = proposal.title;
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {
        /* fall through to clipboard */
      }
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* noop */
      }
    }
  };

  return (
    <div className="fixed bottom-[80px] left-0 right-0 z-30 px-4 pb-3 pt-2 bg-gradient-to-t from-background via-background/95 to-background/0 lg:static lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-0 lg:mt-6">
      <div className="max-w-3xl mx-auto flex items-center gap-2">
        {copy.ctaPrimary ? (
          <KusqaButton
            onClick={() => supportProposal({ proposalId: proposal.id })}
            disabled={isSupporting || isSupported(proposal.id) || phase === "dismissed"}
            className="flex-1 text-sm py-3.5"
            aria-label={copy.ctaPrimary}
          >
            <Heart className={`h-4 w-4 mr-2 ${isSupported(proposal.id) ? "fill-current" : ""}`} />
            {isSupported(proposal.id) ? "Ya apoyas" : isSupporting ? "Apoyando…" : copy.ctaPrimary}
          </KusqaButton>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            className="flex-1"
            disabled
            aria-label="Esta iniciativa no acepta más apoyo"
          >
            {copy.label}
          </Button>
        )}

        {copy.ctaSecondary === "Compartir" && (
          <Button
            variant="outline"
            size="lg"
            onClick={handleShare}
            aria-label="Compartir propuesta"
            className="shrink-0"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Compartir</span>
          </Button>
        )}

        {copy.ctaSecondary === "Ver misión" && (
          <Button
            variant="outline"
            size="lg"
            disabled
            aria-label="Ver misión relacionada (próximamente)"
            className="shrink-0"
          >
            <ArrowRight className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Ver misión</span>
          </Button>
        )}
      </div>
    </div>
  );
}
