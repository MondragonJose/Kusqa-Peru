import { motion } from "framer-motion";
import { Sparkles, Users, Heart, CheckCircle, Zap, Clock } from "lucide-react";
import type { DistrictPulse } from "@/domain/activity";
import { formatRelativeDate } from "@/utils/date";

const SIGNAL_ICON: Record<string, typeof Sparkles> = {
  member_joined: Users,
  initiative_gained_support: Heart,
  initiative_forming: Sparkles,
  initiative_completed: CheckCircle,
  initiative_mobilizing: Zap,
  district_awakening: Sparkles,
  district_quiet: Clock,
};

function vitalityColor(score: number): string {
  if (score >= 7) return "bg-emerald-500";
  if (score >= 4) return "bg-amber-500";
  if (score >= 1) return "bg-stone-400";
  return "bg-stone-300";
}

function vitalityLabel(score: number): string {
  if (score >= 7) return "Muy activo";
  if (score >= 4) return "En movimiento";
  if (score >= 1) return "En calma";
  return "Sin actividad";
}

interface DistrictPulseCardProps {
  pulse: DistrictPulse;
}

export function DistrictPulseCard({ pulse }: DistrictPulseCardProps) {
  const recentSignals = pulse.signals.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-border/40 bg-card p-4 sm:p-5 space-y-4"
    >
      {/* Vitality header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${vitalityColor(pulse.vitalityScore)}`} />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Pulso del distrito
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {vitalityLabel(pulse.vitalityScore)} · {pulse.vitalityScore}/10
        </span>
      </div>

      {/* Narrative */}
      {pulse.narrative && (
        <p className="text-sm text-foreground/85 leading-relaxed">{pulse.narrative}</p>
      )}

      {/* Signals list */}
      {recentSignals.length > 0 && (
        <ul className="space-y-2">
          {recentSignals.map((signal) => {
            const Icon = SIGNAL_ICON[signal.type] ?? Sparkles;
            return (
              <li
                key={signal.id}
                className="flex items-start gap-2.5 text-xs text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
                <span className="flex-1 min-w-0">{signal.message}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground/50">
                  {formatRelativeDate(signal.timestamp)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {pulse.lastActivityAt && (
        <p className="text-[10px] text-muted-foreground/50 pt-1 border-t border-border/20">
          Última actividad: {formatRelativeDate(pulse.lastActivityAt)}
        </p>
      )}
    </motion.div>
  );
}
