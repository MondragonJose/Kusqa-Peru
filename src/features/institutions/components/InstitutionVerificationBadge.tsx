/**
 * InstitutionVerificationBadge — read-only visual indicator for
 * institution verification_state.
 *
 * Reuses the visual grammar of CivicTrustBadge (rounded pill, icon,
 * semantic color) without importing from the community feature slice.
 */

import { motion } from "framer-motion";
import { ShieldCheck, ShieldX } from "lucide-react";

interface InstitutionVerificationBadgeProps {
  verified: boolean;
  expanded?: boolean;
  delay?: number;
}

const VERIFIED_META = {
  true: {
    label: "Verificado",
    description: "Institución con presencia cívica confirmada",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800/40",
    ring: "ring-emerald-400/30",
  },
  false: {
    label: "No verificado",
    description: "Esta institución aún no ha sido verificada",
    icon: <ShieldX className="h-3.5 w-3.5" />,
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
    ring: "ring-transparent",
  },
} as const;

export function InstitutionVerificationBadge({
  verified,
  expanded = false,
  delay = 0,
}: InstitutionVerificationBadgeProps) {
  const meta = VERIFIED_META[String(verified) as "true" | "false"];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`
        inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold
        ring-1 ring-inset
        ${meta.bg} ${meta.color} ${meta.border} ${meta.ring}
        ${expanded ? "w-full rounded-2xl px-4 py-3" : ""}
      `}
    >
      <span className={`shrink-0 ${meta.color}`}>{meta.icon}</span>
      <div className={expanded ? "flex-1 min-w-0" : ""}>
        <div className="font-bold leading-none">{meta.label}</div>
        {expanded && <p className="text-[10px] opacity-80 mt-1 leading-snug">{meta.description}</p>}
      </div>
    </motion.div>
  );
}
