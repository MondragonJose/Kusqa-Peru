/**
 * CivicTrustBadge — KUSQA Civic Reputation Layer
 *
 * These are NOT XP-based levels. They are socially earned trust statuses:
 * visible signals of consistent civic presence, verified participation,
 * and community recognition.
 *
 * The system should feel communal, transparent, and human.
 * Not corporate verification. Not a score. A social signal.
 */

import { motion } from "framer-motion";
import { Shield, Leaf, Compass, Link2, Star } from "lucide-react";

export type CivicTrustStatus =
  | "semilla"
  | "explorador"
  | "guardian"
  | "tejedor"
  | "lider";

export interface CivicTrustProfile {
  status: CivicTrustStatus;
  /** District where the trust was earned */
  district?: string;
  /** Number of verified participations */
  verifiedCount?: number;
  /** Human-readable validation note */
  validatedBy?: string;
}

const TRUST_META: Record<
  CivicTrustStatus,
  {
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    border: string;
    ring: string;
  }
> = {
  semilla: {
    label: "Semilla comunitaria",
    description: "Primeros pasos verificados en tu territorio",
    icon: <Leaf className="h-3.5 w-3.5" />,
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800/40",
    ring: "ring-emerald-400/30",
  },
  explorador: {
    label: "Explorador barrial",
    description: "Presencia activa en múltiples distritos",
    icon: <Compass className="h-3.5 w-3.5" />,
    color: "text-sky-700 dark:text-sky-400",
    bg: "bg-sky-50 dark:bg-sky-900/20",
    border: "border-sky-200 dark:border-sky-800/40",
    ring: "ring-sky-400/30",
  },
  guardian: {
    label: "Guardián territorial",
    description: "Cuidado sostenido de un territorio cívico",
    icon: <Shield className="h-3.5 w-3.5" />,
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    border: "border-purple-200 dark:border-purple-800/40",
    ring: "ring-purple-400/30",
  },
  tejedor: {
    label: "Tejedor comunitario",
    description: "Conecta personas, distritos y causas",
    icon: <Link2 className="h-3.5 w-3.5" />,
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800/40",
    ring: "ring-amber-400/30",
  },
  lider: {
    label: "Líder de impacto",
    description: "Liderazgo comunitario reconocido",
    icon: <Star className="h-3.5 w-3.5 fill-current" />,
    color: "text-rose-700 dark:text-rose-400",
    bg: "bg-rose-50 dark:bg-rose-900/20",
    border: "border-rose-200 dark:border-rose-800/40",
    ring: "ring-rose-400/30",
  },
};

interface CivicTrustBadgeProps {
  profile: CivicTrustProfile;
  /** Whether to show the extended description and validation note */
  expanded?: boolean;
  /** Animation delay for staggered entries */
  delay?: number;
}

export function CivicTrustBadge({ profile, expanded = false, delay = 0 }: CivicTrustBadgeProps) {
  const meta = TRUST_META[profile.status];

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
        {expanded && (
          <>
            <p className="text-[10px] opacity-80 mt-1 leading-snug">{meta.description}</p>
            {profile.district && (
              <p className="text-[10px] opacity-70 mt-1">
                Reconocido en <strong>{profile.district}</strong>
              </p>
            )}
            {profile.validatedBy && (
              <p className="text-[10px] opacity-60 mt-0.5 italic">✓ {profile.validatedBy}</p>
            )}
          </>
        )}
      </div>
      {expanded && profile.verifiedCount !== undefined && (
        <div className={`ml-auto text-right shrink-0 ${meta.color}`}>
          <div className="text-base font-black leading-none">{profile.verifiedCount}</div>
          <div className="text-[9px] opacity-70 uppercase tracking-wide">misiones</div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * Derives a civic trust status from user activity data.
 * Trust is earned through consistency + participation, not XP alone.
 */
export function deriveCivicTrust(data: {
  missionsDone: number;
  distinctDistricts: number;
  hasLedProject: boolean;
  streak: number;
}): CivicTrustStatus {
  const { missionsDone, distinctDistricts, hasLedProject, streak } = data;

  if (hasLedProject && missionsDone >= 15 && distinctDistricts >= 3) return "lider";
  if (missionsDone >= 10 && distinctDistricts >= 3) return "tejedor";
  if (missionsDone >= 6 && streak >= 7) return "guardian";
  if (missionsDone >= 3 && distinctDistricts >= 2) return "explorador";
  return "semilla";
}
