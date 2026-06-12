import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, AlertCircle, Archive } from "lucide-react";
import { ReportModal } from "@/features/moderation/components/ReportModal";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useProposal } from "@/features/proposals";
import { useSupportProposal } from "@/features/proposals/hooks/useSupportProposal";
import { useCurrentUserId } from "@/features/auth";
import { canArchiveProposal } from "@/domain/proposalGovernance";
import { proposalRepository } from "@/services/proposalRepository";
import { isUnifiedWritesEnabled } from "@/features/initiative/mutations/initiativeMutationTypes";
import { runMissionWrite } from "@/features/auth/mutations/missionMutationEngine";
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
import { deriveLifecycleFromProposal, computeProposalAnchor } from "@/domain/proposalLifecycle";
import type { InitiativeAction } from "@/domain/initiativeActions";
import { deriveRelationship } from "@/domain/initiativeActions";
import { InitiativeActionBar } from "@/features/actions/components/InitiativeActionBar";
import { shareInitiative } from "@/features/actions/shareInitiative";
import { useJoinInitiativeAction } from "@/features/actions/useJoinInitiativeAction";
import { categoryEmoji, type MissionCategory } from "@/domain/categories";
import { CivicAfterglow } from "@/features/initiative/components/CivicAfterglow";
import { ContinueAffordance } from "@/features/initiative/components/ContinueAffordance";
import { isLivingTerritoryEnabled } from "@/lib/operationalFeature";

export const Route = createFileRoute("/app/propuesta/$proposalId")({
  component: ProposalDetail,
});

function ProposalDetail() {
  const queryClient = useQueryClient();
  const { proposalId } = useParams({ from: "/app/propuesta/$proposalId" });
  const { data: proposal, isLoading, isError, error } = useProposal(proposalId);
  const currentUserId = useCurrentUserId();
  const { supportProposal, isSupported, isSupporting } = useSupportProposal();
  const { handleJoin } = useJoinInitiativeAction();
  const [archiving, setArchiving] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const handleArchive = async () => {
    if (!proposal || archiving) return;
    setArchiving(true);
    try {
      if (isUnifiedWritesEnabled()) {
        await runMissionWrite(queryClient, {
          kind: "archiveInitiative",
          writeContext: { proposalIds: [proposal.id] },
          steps: [
            async () => {
              const result = await proposalRepository.updateProposal(proposal.id, {
                status: "rejected",
              });
              if (result.status === "error") throw new Error(result.error);
            },
          ],
          invalidate: { proposalIds: [proposal.id] },
        });
      } else {
        const result = await proposalRepository.updateProposal(proposal.id, {
          status: "rejected",
        });
        if (result.status === "error") throw new Error(result.error);
      }
      toast.success("Propuesta archivada");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al archivar";
      toast.error(msg);
    } finally {
      setArchiving(false);
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

  const handleSupport = () => {
    if (!proposal) return;
    if (!isSupported(proposal.id) && !isSupporting) {
      supportProposal({ proposalId: proposal.id });
    }
  };

  const handleActionBar = (action: InitiativeAction) => {
    if (!proposal) return;
    const authRequired: InitiativeAction[] = ["support", "join", "report", "edit"];
    if (!currentUserId && authRequired.includes(action)) {
      toast.info("Inicia sesión para realizar esta acción");
      return;
    }
    switch (action) {
      case "support":
        handleSupport();
        break;
      case "join":
        if (!initiativeForBar) return;
        handleJoin(initiativeForBar.sourceId, { lifecycle: initiativeForBar.lifecycle });
        break;
      case "share":
        shareInitiative(proposal.title, window.location.href);
        break;
      case "report":
        if (currentUserId) setReportOpen(true);
        break;
      case "edit":
        handleArchive();
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
      className="min-h-screen bg-background pb-[calc(8rem+env(safe-area-inset-bottom,0px))] lg:pb-12"
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
          {initiativeForBar && isLivingTerritoryEnabled() && (
            <div className="pt-1">
              <CivicAfterglow
                initiative={initiativeForBar}
                districtName={proposal.district}
              />
            </div>
          )}
          {initiativeForBar && isLivingTerritoryEnabled() && (
            <div className="pt-1">
              <ContinueAffordance initiative={initiativeForBar} kind="proposal" />
            </div>
          )}
          {initiativeForBar && (
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/20">
              <InitiativeActionBar
                initiative={initiativeForBar}
                relationship={deriveRelationship({
                  currentUserId: currentUserId ?? undefined,
                  isSupported: isSupported(proposal.id),
                  isOwner: !!currentUserId && currentUserId === proposal.userId,
                })}
                variant="compact"
                maxVisible={2}
                onAction={handleActionBar}
              />
              {currentUserId && canArchiveProposal(proposal.userId, currentUserId, proposal.status) && (
                <button
                  onClick={handleArchive}
                  disabled={archiving}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground bg-secondary/40 hover:bg-secondary/80 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Archive className="h-3.5 w-3.5" />
                  Archivar
                </button>
              )}
            </div>
          )}
        </div>
      </article>

      <ProposalStickyCTA proposal={proposal} />

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="proposal"
        targetId={proposal.id}
        reporterId={currentUserId ?? ""}
      />
    </motion.div>
  );
}
