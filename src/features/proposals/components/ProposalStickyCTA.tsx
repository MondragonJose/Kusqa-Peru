import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getProposalPhase, getProposalPhaseCopy, deriveLifecycleFromProposal, computeProposalAnchor } from "@/domain/proposalLifecycle";
import { categoryEmoji, type MissionCategory } from "@/domain/categories";
import type { Proposal } from "@/services/proposalContract";
import type { Initiative } from "@/domain/initiative";
import { InitiativeActionBar } from "@/features/actions/components/InitiativeActionBar";
import { QuieroCoOrganizarModal } from "./QuieroCoOrganizarModal";
import { useCurrentUserId } from "@/features/auth";
import { useSupportProposal } from "@/features/proposals/hooks/useSupportProposal";

interface ProposalStickyCTAProps {
  proposal: Proposal;
}

export function ProposalStickyCTA({ proposal }: ProposalStickyCTAProps) {
  const phase = getProposalPhase(proposal.status);
  const copy = getProposalPhaseCopy(phase);
  const userId = useCurrentUserId();
  const navigate = useNavigate();
  const { supportProposal, isSupported, isSupporting } = useSupportProposal();
  const [coOrganizeOpen, setCoOrganizeOpen] = useState(false);

  const isAuthor = !!userId && userId === proposal.userId;

  const initiative: Initiative = {
    id: `proposal_${proposal.id}`,
    sourceType: "proposal",
    sourceId: proposal.id,
    title: proposal.title,
    summary: proposal.summary ?? proposal.description ?? proposal.title,
    category: proposal.category as MissionCategory,
    region: proposal.region,
    lifecycle: deriveLifecycleFromProposal(
      proposal.status,
      proposal.convertedAt,
      proposal.completedAt,
    ),
    temporalAnchor: computeProposalAnchor(
      proposal.status,
      proposal.proposedDate,
      proposal.createdAt,
      proposal.convertedAt,
      proposal.completedAt,
      0,
      3,
    ),
    emoji: categoryEmoji(proposal.category as MissionCategory),
  };

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
        /* no-op */
      }
    }
  };

  const handleSupport = () => {
    if (!isSupported(proposal.id) && !isSupporting) {
      supportProposal({ proposalId: proposal.id });
    }
  };

  const handleJoin = () => {
    if (copy.action === "coorganize") {
      if (isAuthor) {
        setCoOrganizeOpen(true);
      }
      // non-author: no-op (the bar shows the button disabled since there's no handler)
    } else if (copy.action === "view_mission") {
      navigate({ to: "/app/mision/$missionId", params: { missionId: proposal.id } });
    }
  };

  const joinLabel =
    copy.action === "coorganize"
      ? (copy.ctaPrimary ?? "Quiero co-organizar")
      : copy.action === "view_mission"
        ? "Ver misión"
        : undefined;

  return (
    <div className="fixed bottom-[calc(6.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-30 px-4 pb-3 pt-2 bg-gradient-to-t from-background via-background/95 to-background/0 lg:static lg:bg-transparent lg:px-0 lg:pt-0 lg:pb-0 lg:mt-6">
      <div className="max-w-3xl mx-auto">
        <InitiativeActionBar
          initiative={initiative}
          relationship="visitor"
          variant="row"
          onSupport={handleSupport}
          onShare={handleShare}
          onJoin={handleJoin}
          labelOverrides={joinLabel ? { join: joinLabel } : undefined}
        />
      </div>

      {/*
       * Única CTA específica de propuesta fuera de la barra canónica.
       * El modal "Quiero co-organizar" se enruta desde el slot join vía
       * labelOverrides.join + onJoin, y solo se abre para la persona autora.
       */}
      <QuieroCoOrganizarModal
        proposal={proposal}
        open={coOrganizeOpen}
        onOpenChange={setCoOrganizeOpen}
      />
    </div>
  );
}
