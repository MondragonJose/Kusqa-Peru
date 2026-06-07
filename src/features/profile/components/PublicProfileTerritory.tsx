/**
 * PublicProfileTerritory — top districts where the user participates.
 *
 * The public profile RPC returns up to 3 districts. We render them as
 * a quiet list with a district chip that deep-links to
 * /app/distrito/$slug. Honest: the list may be empty (we just say so).
 */

import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import type { PublicProfile } from "@/services/publicProfileRepository";

interface PublicProfileTerritoryProps {
  profile: PublicProfile;
}

export function PublicProfileTerritory({ profile }: PublicProfileTerritoryProps) {
  const districts = profile.topDistricts;
  if (districts.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border/40 bg-card p-3 sm:p-4 space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Territorios donde participa
      </h2>
      <ul className="space-y-1">
        {districts.map((d) => (
          <li key={d.id}>
            <Link
              to="/app/distrito/$slug"
              params={{ slug: d.slug }}
              className="flex items-center justify-between gap-2 text-xs rounded-lg p-2 hover:bg-secondary/30 transition-colors"
            >
              <span className="flex items-center gap-1 font-medium text-foreground truncate">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                {d.displayName}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {d.missionCount} {d.missionCount === 1 ? "misión" : "misiones"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
