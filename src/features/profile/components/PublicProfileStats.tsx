/**
 * PublicProfileStats — 4-counter grid for the public profile.
 *
 * Renders: missions, co-organized proposals, supported proposals, and
 * distinct districts — all derived from the public profile RPC. No
 * fake gamification. The numbers are the numbers.
 */

import { MapPin, Heart, Users, Compass } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PublicProfile } from "@/services/publicProfileRepository";

interface PublicProfileStatsProps {
  profile: PublicProfile;
}

const COUNTER_CARDS: Array<{
  key: keyof Pick<
    PublicProfile,
    "missionCount" | "coOrganizedCount" | "supportedProposalCount" | "distinctDistrictCount"
  >;
  label: string;
  singular: string;
  icon: typeof Heart;
  /** Optional link to drill down (kept empty for now — 4A.5 minimal). */
  href?: string;
}> = [
  { key: "missionCount", label: "Misiones completadas", singular: "misión", icon: Compass },
  { key: "coOrganizedCount", label: "Co-organiza propuestas", singular: "propuesta", icon: Users },
  {
    key: "supportedProposalCount",
    label: "Propuestas apoyadas",
    singular: "propuesta",
    icon: Heart,
  },
  {
    key: "distinctDistrictCount",
    label: "Distritos recorridos",
    singular: "distrito",
    icon: MapPin,
  },
];

export function PublicProfileStats({ profile }: PublicProfileStatsProps) {
  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3" aria-label="Cifras cívicas">
      {COUNTER_CARDS.map((c) => {
        const value = profile[c.key];
        const Icon = c.icon;
        const inner = (
          <div className="rounded-2xl border border-border/40 bg-card p-3 sm:p-4 h-full">
            <div className="flex items-center justify-between text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
              <span className="text-[9px] uppercase tracking-wider font-bold">{c.label}</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-display font-extrabold text-foreground leading-none">
                {value}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {value === 1 ? c.singular : c.singular + "s"}
              </span>
            </div>
          </div>
        );
        return c.href ? (
          <Link key={c.key} to={c.href}>
            {inner}
          </Link>
        ) : (
          <div key={c.key}>{inner}</div>
        );
      })}
    </section>
  );
}
