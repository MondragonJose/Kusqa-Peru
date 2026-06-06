import { motion } from "framer-motion";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { lazy, Suspense } from "react";
import type { Proposal } from "@/services/proposalContract";

const SinglePinMap = lazy(() =>
  import("@/features/proposals/components/SinglePinMap").then((m) => ({ default: m.SinglePinMap })),
);

interface ProposalLocationPreviewProps {
  proposal: Proposal;
}

export function ProposalLocationPreview({ proposal }: ProposalLocationPreviewProps) {
  if (proposal.latitude == null || proposal.longitude == null) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="px-5 sm:px-8 py-5 border-b border-border/40"
      >
        <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3 inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> Lugar
        </h2>
        <p className="text-sm text-foreground/80">
          {proposal.locationLabel?.trim() || proposal.district}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Aún no hay coordenadas exactas. La ubicación se confirmará al organizar la iniciativa.
        </p>
      </motion.section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="px-5 sm:px-8 py-5 border-b border-border/40"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> Lugar
        </h2>
        <a
          href={`https://www.google.com/maps?q=${proposal.latitude},${proposal.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline inline-flex items-center gap-1"
        >
          <Navigation className="h-3 w-3" /> Abrir en Maps
          <ExternalLink className="h-2.5 w-2.5" />
        </a>
      </div>

      <p className="text-sm text-foreground/80 mb-3">
        {proposal.locationLabel?.trim() || proposal.district}
      </p>

      <div className="h-48 sm:h-64 w-full rounded-xl overflow-hidden border border-border/60 bg-muted/30">
        <Suspense
          fallback={
            <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">
              Cargando mapa…
            </div>
          }
        >
          <SinglePinMap
            latitude={proposal.latitude}
            longitude={proposal.longitude}
            region={proposal.region}
            title={proposal.title}
          />
        </Suspense>
      </div>
    </motion.section>
  );
}
