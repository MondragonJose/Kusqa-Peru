import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, AlertCircle, Archive } from "lucide-react";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useProposal } from "@/features/proposals";
import { useCurrentUserId } from "@/features/auth";
import { canArchiveProposal } from "@/domain/proposalGovernance";
import { moderationRepository } from "@/services/moderationRepository";
import { proposalRepository } from "@/services/proposalRepository";
import { ProposalHero } from "@/features/proposals/components/ProposalHero";
import { ProposalStickyCTA } from "@/features/proposals/components/ProposalStickyCTA";
import { ProposalImagesCarousel } from "@/features/proposals/components/ProposalImagesCarousel";
import { ProposalTabs } from "@/features/proposals/components/ProposalTabs";
import {
  ConversionCta,
  ProposalLifecycleTimeline,
} from "@/features/proposals/components/ConversionCta";
import { ProposalMomentum } from "@/features/proposals/components/ProposalMomentum";
import type { Initiative } from "@/domain/initiative";
import { deriveLifecycleFromProposal, computeProposalAnchor } from "@/domain/initiative";
import type { InitiativeAction } from "@/domain/initiativeActions";
import { InitiativeActionBar } from "@/features/actions/components/InitiativeActionBar";
import { shareInitiative } from "@/features/actions/shareInitiative";
import { categoryEmoji, type MissionCategory } from "@/domain/categories";

export const Route = createFileRoute("/app/propuesta/$proposalId")({
  component: ProposalDetail,
});

function ProposalDetail() {
  const { proposalId } = useParams({ from: "/app/propuesta/$proposalId" });
  const { data: proposal, isLoading, isError, error } = useProposal(proposalId);
  const currentUserId = useCurrentUserId();
  const [archiving, setArchiving] = useState(false);
  const [reporting, setReporting] = useState(false);

  const handleArchive = async () => {
    if (!proposal || archiving) return;
    setArchiving(true);
    try {
      const result = await proposalRepository.updateProposal(proposal.id, { status: "rejected" });
      if (result.status === "error") {
        toast.error("No se pudo archivar", { description: result.error });
      } else {
        toast.success("Propuesta archivada");
      }
    } catch {
      toast.error("Error al archivar");
    } finally {
      setArchiving(false);
    }
  };

  const handleReport = async () => {
    if (!proposal || !currentUserId || reporting) return;
    setReporting(true);
    try {
      await moderationRepository.report({
        reporterId: currentUserId,
        targetType: "proposal",
        targetId: proposal.id,
        reasonCode: "inappropriate",
        description: "",
      });
      toast.success("Reporte enviado", {
        description: "Gracias por ayudar a mantener la comunidad.",
      });
    } catch {
      toast.error("Error al enviar reporte");
    } finally {
      setReporting(false);
    }
  };

  const initiativeForBar: Initiative | null = useMemo(() => {
    if (!proposal) return null;
    return {
      id: `proposal_${proposal.id}`,
      sourceType: "proposal" as const,
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
  }, [proposal]);

  const handleActionBar = (action: InitiativeAction) => {
    if (!proposal) return;
    switch (action) {
      case "support":
        // Support is handled by ProposalStickyCTA
        break;
      case "share":
        shareInitiative(proposal.title, window.location.href);
        break;
      case "report":
        if (currentUserId) {
          handleReport();
        }
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !proposal) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-display font-semibold">No encontramos esta propuesta</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          {error instanceof Error
            ? error.message
            : "Es posible que haya sido retirada por la comunidad."}
        </p>
        <Link
          to="/app"
          className="mt-2 text-sm text-accent hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background pb-32 lg:pb-12"
    >
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border/40">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 sm:px-6 h-12">
          <Link
            to="/app"
            aria-label="Volver al inicio"
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold text-muted-foreground truncate">Propuesta</span>
        </div>
      </div>

      <article className="max-w-3xl mx-auto bg-background">
        <ProposalImagesCarousel proposal={proposal} />
        <ProposalHero proposal={proposal} />
        <ProposalMomentum proposal={proposal} />
        <div className="px-4 sm:px-6 pb-6 space-y-4">
          <ProposalTabs proposal={proposal} />
          <ConversionCta proposalId={proposal.id} />
          <ProposalLifecycleTimeline proposalId={proposal.id} />
          {currentUserId && initiativeForBar && (
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/20">
              <div className="flex items-center gap-1">
                <InitiativeActionBar
                  initiative={initiativeForBar}
                  relationship="visitor"
                  variant="compact"
                  maxVisible={2}
                  onAction={handleActionBar}
                />
              </div>
              <div className="flex items-center gap-3">
                {canArchiveProposal(proposal.userId, currentUserId!, proposal.status) && (
                  <button
                    onClick={handleArchive}
                    disabled={archiving}
                    className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Archive className="h-3 w-3" />
                    {archiving ? "Archivando..." : "Archivar propuesta"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </article>

      <ProposalStickyCTA proposal={proposal} />
    </motion.div>
  );
}
