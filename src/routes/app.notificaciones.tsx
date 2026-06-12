import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/features/auth";
import { userSessionQueryOptions } from "@/features/auth/queryOptions";
import { CivicFeed } from "@/features/notifications";
import { useLiveNotificationInbox, useMarkNotificationRead } from "@/hooks/useNotifications";
import { formatRelativeDate } from "@/utils/date";
import type { CivicNotification, CivicNotificationType } from "@/features/notifications/types";

export const Route = createFileRoute("/app/notificaciones")({
  component: NotificationsPage,
});

const NOTIFICATION_TYPE_MAP: Record<string, { type: CivicNotificationType; emoji: string }> = {
  mission_joined: { type: "misión", emoji: "📍" },
  mission_completed: { type: "misión", emoji: "✅" },
  evidence_received: { type: "presencia", emoji: "📷" },
  moderation_update: { type: "comunidad", emoji: "🔍" },
  community_pulse: { type: "comunidad", emoji: "💚" },
};

function notificationRowToCivic(row: {
  id: string;
  notificationType: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}): CivicNotification {
  const mapped = NOTIFICATION_TYPE_MAP[row.notificationType] ?? {
    type: "comunidad" as CivicNotificationType,
    emoji: "📬",
  };
  return {
    id: row.id,
    type: mapped.type,
    title: row.title,
    body: row.body,
    emoji: mapped.emoji,
    timestamp: formatRelativeDate(row.createdAt),
    read: row.readAt !== null,
    missionId: (row.payload?.mission_id as string | undefined) ?? undefined,
  };
}

function NotificationsPage() {
  const user = useCurrentUser();
  if (!user) throw redirect({ to: "/app" });
  const { data: userId } = useQuery(userSessionQueryOptions());
  const { data: dbRows = [] } = useLiveNotificationInbox(userId ?? undefined);
  const markReadMutation = useMarkNotificationRead(userId ?? undefined);

  const notifications: CivicNotification[] = dbRows.map(notificationRowToCivic);

  const handleMarkOne = (id: string) => {
    markReadMutation.mutate(id);
  };

  const handleMarkAll = () => {
    const unreadIds = dbRows.filter((r) => r.readAt === null).map((r) => r.id);
    unreadIds.forEach((id) => markReadMutation.mutate(id));
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <CivicFeed
        notifications={notifications}
        userDistrict={user?.district}
        onMarkRead={handleMarkOne}
        onMarkAllRead={handleMarkAll}
      />
    </div>
  );
}
