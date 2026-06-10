/**
 * PublicProfileHeader — top section of /app/perfil/$userId.
 *
 * Renders the public-safe projection: avatar, name, handle, district
 * chip, region badge, bio, and a territory-trust badge. No editing
 * affordances (this is a read-only public view; the user edits their
 * own profile in /app/perfil).
 */

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Sparkles } from "lucide-react";
import { REGION_META, regionLabel } from "@/domain/regions";
import {
  deriveCivicTrust,
  TRUST_STATUS_META,
} from "@/features/community/components/CivicTrustBadge";
import type { PublicProfile } from "@/services/publicProfileRepository";

interface PublicProfileHeaderProps {
  profile: PublicProfile;
  isOwnProfile: boolean;
}

function formatJoinDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("es-PE", {
      year: "numeric",
      month: "long",
    });
  } catch {
    return "";
  }
}

export function PublicProfileHeader({ profile, isOwnProfile }: PublicProfileHeaderProps) {
  const region = profile.region as keyof typeof REGION_META | null;
  const regionMeta = region && REGION_META[region] ? REGION_META[region] : null;

  // Trust badge is derived from public data only — no streak, no internal
  // counters that aren't on the public projection. The function gracefully
  // degrades when a field is zero.
  const trustStatus = deriveCivicTrust({
    missionsDone: profile.missionCount,
    distinctDistricts: profile.distinctDistrictCount,
    hasLedProject: profile.coOrganizedCount > 0,
    streak: 0,
  });
  const trustMeta = TRUST_STATUS_META?.[trustStatus];

  return (
    <section className="relative rounded-3xl overflow-hidden shadow-sm bg-card border border-border">
      <div
        className={`h-32 sm:h-40 ${regionMeta ? regionMeta.gradient : "bg-gradient-coast"}`}
        aria-hidden="true"
      />
      <div className="px-4 sm:px-6 pb-6 -mt-12 sm:-mt-16 relative">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex items-end gap-3">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background shadow-md shrink-0">
              <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.fullName} />
              <AvatarFallback className="text-xl">
                {profile.fullName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 pb-1">
              <h1 className="text-lg sm:text-xl font-display font-bold text-foreground leading-tight">
                {profile.fullName}
              </h1>
              <p className="text-xs text-muted-foreground">@{profile.username}</p>
            </div>
          </div>
          {isOwnProfile && (
            <Badge variant="secondary" className="text-[10px]">
              <Sparkles className="h-3 w-3 mr-1" /> Tu perfil público
            </Badge>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {(profile.district || regionMeta) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {profile.district && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {profile.district}
                </span>
              )}
              {region && (
                <span className={regionMeta?.chipBg + " px-1.5 py-0.5 rounded text-foreground"}>
                  {regionLabel(region)}
                </span>
              )}
            </div>
          )}

          {profile.bio && (
            <p className="text-sm text-foreground/90 leading-relaxed max-w-prose">{profile.bio}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatJoinDate(profile.joinedAt)}
            </span>
            <span className="text-foreground font-semibold">{trustMeta?.label ?? trustStatus}</span>
            {trustMeta?.description && (
              <span className="text-foreground/60">{trustMeta.description}</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
