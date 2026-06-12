import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import type { InitiativeEndorsement } from "@/domain/initiative";

interface EndorsementBadgeProps {
  endorsements: InitiativeEndorsement[];
  variant?: "compact" | "expanded";
  delay?: number;
}

const RELATION_LABELS: Record<string, string> = {
  supporter: "Aval institucional",
  collaborator: "Colaborador",
  origin: "Impulsor",
};

export function EndorsementBadge({
  endorsements,
  variant = "compact",
  delay = 0,
}: EndorsementBadgeProps) {
  if (endorsements.length === 0) return null;

  const supporterCount = endorsements.filter((e) => e.relation === "supporter").length;
  const collaboratorCount = endorsements.filter((e) => e.relation === "collaborator").length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`inline-flex items-center gap-1.5 rounded-full border text-xs font-semibold ${
        variant === "compact"
          ? "px-2 py-0.5 bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/30"
          : "px-3 py-1.5 bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/40"
      }`}
    >
      <Building2 className="h-3 w-3 shrink-0" />
      {variant === "compact" ? (
        <span>
          {endorsements.length} aval{endorsements.length !== 1 ? "es" : ""}
        </span>
      ) : (
        <div className="flex flex-col gap-1">
          <span className="font-bold leading-none">
            {endorsements.length} aval{endorsements.length !== 1 ? "es" : ""}
          </span>
          {endorsements.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {supporterCount > 0 && (
                <span className="text-[10px] opacity-80">
                  {supporterCount} {RELATION_LABELS.supporter.toLowerCase()}
                  {supporterCount !== 1 ? "s" : ""}
                </span>
              )}
              {collaboratorCount > 0 && supporterCount > 0 && (
                <span className="text-[10px] opacity-60">·</span>
              )}
              {collaboratorCount > 0 && (
                <span className="text-[10px] opacity-80">
                  {collaboratorCount} {RELATION_LABELS.collaborator.toLowerCase()}
                  {collaboratorCount !== 1 ? "es" : ""}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
