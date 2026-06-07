import { MessageCircle, Heart, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeDate } from "@/utils/date";
import type { DistrictActivity } from "@/services/districtRepository";

interface DistrictActivityFeedProps {
  activities: DistrictActivity[];
  currentUserId: string | null;
}

const ACTIVITY_LABELS: Record<string, string> = {
  join: "se sumó a",
  join_idempotent: "ya participaba en",
  complete: "completó",
  complete_idempotent: "ya había completado",
  xp_granted: "recibió XP de",
  rollback_critical: "se revirtió",
  comment: "comentó en",
  support: "apoyó",
};

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  comment: MessageCircle,
  support: Heart,
};

export function DistrictActivityFeed({
  activities,
  currentUserId: _currentUserId,
}: DistrictActivityFeedProps) {
  return (
    <section className="space-y-3" aria-label="Actividad reciente">
      <h2 className="text-sm font-medium flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        Actividad reciente
      </h2>
      <ul className="space-y-2">
        {activities.map((a) => {
          const Icon = ACTIVITY_ICONS[a.activityType] ?? null;
          const label = ACTIVITY_LABELS[a.activityType] ?? a.activityType;
          const isMission = a.entityType === "mission";
          return (
            <li
              key={a.id}
              className="flex items-start gap-2 rounded-md border border-border/30 p-2"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={a.actorAvatarUrl ?? undefined} alt={a.actorFirstName} />
                <AvatarFallback className="text-xs">
                  {a.actorFirstName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-xs leading-relaxed">
                  <span className="font-medium">{a.actorFirstName}</span>{" "}
                  <span className="text-muted-foreground">{label}</span>{" "}
                  <span className="font-medium">{isMission ? "una misión" : "una propuesta"}</span>
                  {a.detail && (
                    <>
                      : <span className="italic text-foreground/80">"{a.detail}"</span>
                    </>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatRelativeDate(a.occurredAt)}
                </p>
              </div>
              {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
