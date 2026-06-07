/**
 * PublicProfileTimeline — recent civic activity, served by
 * civic_events. Each event renders as a row with a kind-specific icon
 * and a deep-link to the target (mission / proposal / district).
 *
 * Empty state is honest: "Sin movimientos aún" rather than fabricating
 * a fake first action.
 */

import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, Check, Sparkles, Users, Shield, Flag, Activity } from "lucide-react";
import { formatRelativeDate } from "@/utils/date";
import {
  CIVIC_EVENT_COPY,
  type CivicProfileEvent,
  type CivicEventKind,
} from "@/services/civicEventsRepository";

interface PublicProfileTimelineProps {
  events: CivicProfileEvent[];
}

const ICON_MAP = {
  support: Heart,
  comment: MessageCircle,
  check: Check,
  spark: Sparkles,
  people: Users,
  flag: Flag,
  shield: Shield,
} as const;

function buildTargetHref(event: CivicProfileEvent): string | null {
  switch (event.targetType) {
    case "mission":
      return `/app/mision/${event.targetId}`;
    case "proposal":
      return `/app/propuesta/${event.targetId}`;
    case "district":
      if (event.districtSlug) {
        return `/app/distrito/${event.districtSlug}`;
      }
      return null;
    case "comment":
    case "evidence":
    case "profile":
    default:
      return null;
  }
}

export function PublicProfileTimeline({ events }: PublicProfileTimelineProps) {
  return (
    <section className="rounded-2xl border border-border/40 bg-card p-3 sm:p-4 space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <Activity className="h-3.5 w-3.5" /> Actividad reciente
      </h2>
      {events.length === 0 ? (
        <p className="text-xs text-muted-foreground py-3">
          Sin movimientos aún. Cuando esta persona participe, su huella aparecerá aquí.
        </p>
      ) : (
        <ol className="space-y-2">
          {events.map((e) => {
            const copy = CIVIC_EVENT_COPY[e.kind as CivicEventKind];
            const Icon = copy ? ICON_MAP[copy.icon] : Activity;
            const href = buildTargetHref(e);
            const districtLabel = e.districtName ?? e.districtSlug ?? null;
            const inner = (
              <div className="flex items-start gap-2">
                <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-xs leading-snug">
                    {copy?.title ?? e.kind}
                    {districtLabel && (
                      <span className="text-muted-foreground"> · {districtLabel}</span>
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatRelativeDate(e.occurredAt)}
                  </p>
                </div>
              </div>
            );
            return (
              <li
                key={e.id}
                className="rounded-lg border border-border/20 p-2 hover:bg-secondary/20 transition-colors"
              >
                {href ? <Link to={href}>{inner}</Link> : inner}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
