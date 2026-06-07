/**
 * HeaderBellBadge — Phase 4B.
 *
 * Renders the notification bell + unread count in the bottom-nav bar.
 * Subscribes to useUnreadNotificationCount (Phase B hook) and shows
 * a small badge when count > 0. Tapping the bell navigates to
 * /app/notificaciones.
 *
 * The badge is plain text, not a red dot or a glow — quiet by design.
 */

import { Link, useRouterState } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
import { useCurrentUserId } from "@/features/auth";

export function HeaderBellBadge() {
  const userId = useCurrentUserId();
  const { data: count = 0 } = useUnreadNotificationCount(userId ?? undefined);
  const location = useRouterState({ select: (s) => s.location.pathname });
  const isOnNotifications = location === "/app/notificaciones";

  if (!userId) return null;

  return (
    <Link
      to="/app/notificaciones"
      aria-label={
        count > 0
          ? `Tienes ${count} ${count === 1 ? "notificación sin leer" : "notificaciones sin leer"}`
          : "Notificaciones"
      }
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
        isOnNotifications
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      <Bell className="h-4 w-4" />
      {count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center"
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
