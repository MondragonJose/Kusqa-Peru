import { motion } from "framer-motion";
import { Quote, ListTree } from "lucide-react";
import type { Proposal } from "@/services/proposalContract";

interface ProposalCivicIntentProps {
  proposal: Proposal;
}

export function ProposalCivicIntent({ proposal }: ProposalCivicIntentProps) {
  const why = proposal.why?.trim() || "";
  const description = proposal.description?.trim() || "";
  const hasWhy = why.length > 0;
  const hasDescription = description.length > 0;

  if (!hasWhy && !hasDescription) return null;

  // Author voice: render the "why" only. If the author didn't write a "why",
  // fall back to a single neutral line that does NOT duplicate the description.
  const fallbackBlurb = hasDescription
    ? "Aún no hemos escuchado la voz del autor. Te dejamos su descripción completa mientras tanto."
    : "Esta iniciativa se está organizando. Pronto compartiremos más detalles con la comunidad.";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="px-5 sm:px-8 py-6 border-b border-border/40"
    >
      <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3 inline-flex items-center gap-1.5">
        <Quote className="h-3.5 w-3.5" /> Por qué importa
      </h2>

      {hasWhy ? (
        <figure className="relative pl-4 border-l-2 border-accent/50">
          <Quote className="absolute -left-3 -top-1 h-5 w-5 text-accent bg-background rounded-full p-0.5" />
          <blockquote className="text-[15px] sm:text-base text-foreground/90 leading-relaxed italic">
            {why}
          </blockquote>
        </figure>
      ) : (
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {fallbackBlurb}
        </p>
      )}

      {hasDescription && (
        <details className="mt-4 group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-accent transition-colors select-none inline-flex items-center gap-1.5">
            <ListTree className="h-3.5 w-3.5" />
            <span>Ver detalles logísticos</span>
          </summary>
          <p className="mt-3 text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </details>
      )}
    </motion.section>
  );
}
