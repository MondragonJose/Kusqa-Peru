import { Heart, Share2, Users, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { KusqaButton } from "@/components/ui/kusqa-button";
import { toast } from "sonner";
import { useSupportProposal } from "@/features/proposals/hooks/useSupportProposal";
import { getProposalPhase, getProposalPhaseCopy } from "@/domain/proposalLifecycle";
import type { Proposal } from "@/services/proposalContract";
import { QuieroCoOrganizarModal } from "./QuieroCoOrganizarModal";
import { useCurrentUserId } from "@/features/auth";

interface ProposalStickyCTAProps {
  proposal: Proposal;
}

export function ProposalStickyCTA({ proposal }: ProposalStickyCTAProps) {
  const phase = getProposalPhase(proposal.status);
  const copy = getProposalPhaseCopy(phase);
  const { supportProposal, isSupported, isSupporting } = useSupportProposal();
  const userId = useCurrentUserId();
  const [coOrganizeOpen, setCoOrganizeOpen] = useState(false);

  const isAuthor = !!userId && userId === proposal.userId;

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
        toast.success("Enlace copiado al portapapeles");
      } catch {
        toast.info("Comparte esta URL con tu red cívica");
      }
    }
  };

  return (
    <div className="fixed bottom-[80px] left-0 right-0 z-30 px-4 pb-3 pt-2 bg-gradient-to-t from-background via-background/95 to-background/0 lg:static lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-0 lg:mt-6">
      <div className="max-w-3xl mx-auto flex items-center gap-2">
        {copy.action === "support" && copy.ctaPrimary && (
          <KusqaButton
            onClick={() => supportProposal({ proposalId: proposal.id })}
            disabled={isSupporting || isSupported(proposal.id)}
            className="flex-1 text-sm py-3.5"
            aria-label={copy.ctaPrimary}
          >
            {isSupported(proposal.id) ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Heart className={`h-4 w-4 mr-2 ${isSupported(proposal.id) ? "fill-current" : ""}`} />
            )}
            {isSupported(proposal.id) ? "Ya apoyas" : isSupporting ? "Apoyando…" : copy.ctaPrimary}
          </KusqaButton>
        )}

        {copy.action === "coorganize" && copy.ctaPrimary && isAuthor && (
          <KusqaButton
            onClick={() => setCoOrganizeOpen(true)}
            className="flex-1 text-sm py-3.5"
            aria-label={copy.ctaPrimary}
          >
            <Users className="h-4 w-4 mr-2" />
            {copy.ctaPrimary}
          </KusqaButton>
        )}

        {copy.action === "coorganize" && copy.ctaPrimary && !isAuthor && (
          <Button
            variant="secondary"
            size="lg"
            disabled
            className="flex-1"
            aria-label="Solo la persona que propuso puede co-organizar"
          >
            <Users className="h-4 w-4 mr-2" />
            {copy.ctaPrimary}
          </Button>
        )}

        {copy.action === "view_mission" && (
          <Button
            variant="secondary"
            size="lg"
            disabled
            className="flex-1"
            aria-label="La propuesta se convirtió en una misión"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {copy.label}
          </Button>
        )}

        {copy.action === "none" && (
          <Button
            variant="secondary"
            size="lg"
            disabled
            className="flex-1"
            aria-label="Esta iniciativa no procede"
          >
            {copy.label}
          </Button>
        )}

        {copy.ctaSecondary === "Compartir" && copy.action !== "none" && (
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
      </div>

      <QuieroCoOrganizarModal
        proposal={proposal}
        open={coOrganizeOpen}
        onOpenChange={setCoOrganizeOpen}
      />
    </div>
  );
}
