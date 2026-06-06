import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import type { Proposal } from "@/services/proposalContract";

interface ProposalCivicIntentProps {
  proposal: Proposal;
}

export function ProposalCivicIntent({ proposal }: ProposalCivicIntentProps) {
  const why = proposal.why?.trim();
  const description = proposal.description?.trim();

  if (!why && !description) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="px-5 sm:px-8 py-5 border-b border-border/40"
    >
      <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold mb-3">
        Por qué importa
      </h2>

      {why && (
        <figure className="relative pl-4 border-l-2 border-accent/40">
          <Quote className="absolute -left-3 -top-1 h-5 w-5 text-accent bg-background rounded-full p-0.5" />
          <blockquote className="text-[15px] sm:text-base text-foreground/90 leading-relaxed italic">
            {why}
          </blockquote>
        </figure>
      )}

      {!why && description && (
        <p className="text-[15px] sm:text-base text-foreground/85 leading-relaxed whitespace-pre-wrap">
          {description}
        </p>
      )}

      {why && description && (
        <details className="mt-4 group">
          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-accent transition-colors select-none">
            Leer la descripción completa
          </summary>
          <p className="mt-3 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        </details>
      )}
    </motion.section>
  );
}
