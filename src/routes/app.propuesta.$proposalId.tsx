import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useProposal } from "@/features/proposals";
import { ProposalHero } from "@/features/proposals/components/ProposalHero";
import { ProposalCivicIntent } from "@/features/proposals/components/ProposalCivicIntent";
import { ProposalLocationPreview } from "@/features/proposals/components/ProposalLocationPreview";
import { ProposalSupportersRow } from "@/features/proposals/components/ProposalSupportersRow";
import { ProposalStickyCTA } from "@/features/proposals/components/ProposalStickyCTA";
import { ProposalImagesCarousel } from "@/features/proposals/components/ProposalImagesCarousel";

export const Route = createFileRoute("/app/propuesta/$proposalId")({
  component: ProposalDetail,
});

function ProposalDetail() {
  const { proposalId } = useParams({ from: "/app/propuesta/$proposalId" });
  const { data: proposal, isLoading, isError, error } = useProposal(proposalId);

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
        <ProposalCivicIntent proposal={proposal} />
        <ProposalLocationPreview proposal={proposal} />
        <ProposalSupportersRow proposalId={proposal.id} />
      </article>

      <ProposalStickyCTA proposal={proposal} />
    </motion.div>
  );
}
