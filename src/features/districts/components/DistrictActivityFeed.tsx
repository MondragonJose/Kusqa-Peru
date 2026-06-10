import { MessageCircle, Heart, Activity } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatRelativeDate } from "@/utils/date";
import type { TerritorialEvent } from "@/domain/territorialEvent";
import { TERRITORIAL_EVENT_VERB } from "@/domain/territorialEvent";

interface DistrictActivityFeedProps {
  events: TerritorialEvent[];
  currentUserId: string | null;
}

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  comment: MessageCircle,
  support: Heart,
};

export function DistrictActivityFeed({
  events,
  currentUserId: _currentUserId,
}: DistrictActivityFeedProps) {
  return (
    <section className="space-y-3" aria-label="Actividad reciente">
      <h2 className="text-sm font-medium flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        Actividad reciente
      </h2>
      <ul className="space-y-2">
        {events.map((e) => {
          const verb = TERRITORIAL_EVENT_VERB[e.type] ?? e.type;
          const isMission = e.entityType === "mission";
          const Icon =
            ACTIVITY_ICONS[
              e.type === "proposal.comment_added"
                ? "comment"
                : e.type === "proposal.supported"
                  ? "support"
                  : "__none__"
            ];
          return (
            <li
              key={e.id}
              className="flex items-start gap-2 rounded-md border border-border/30 p-2"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={e.actor.avatarUrl ?? undefined} alt={e.actor.firstName} />
                <AvatarFallback className="text-xs">
                  {e.actor.firstName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-xs leading-relaxed">
                  <span className="font-medium">{e.actor.firstName}</span>{" "}
                  <span className="text-muted-foreground">{verb}</span>{" "}
                  <span className="font-medium">
                    {isMission ? "una misión territorial" : "una propuesta ciudadana"}
                  </span>
                  {e.entityTitle && (
                    <>
                      : <span className="italic text-foreground/80">"{e.entityTitle}"</span>
                    </>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatRelativeDate(e.createdAt)}
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
