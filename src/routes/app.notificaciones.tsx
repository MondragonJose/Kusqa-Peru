import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUser } from "@/features/auth";
import { CivicFeed } from "@/features/notifications";
import { useMissions } from "@/hooks/useMissions";

export const Route = createFileRoute("/app/notificaciones")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const user = useCurrentUser();
  const { data: missions = [] } = useMissions();

  // Generate contextual notifications based on real missions
  const contextualNotifications = missions.slice(0, 5).map((mission, index) => ({
    id: `notif-${mission.id}`,
    type: "misión" as const,
    title: `Nueva misión en ${mission.district}`,
    body: mission.description,
    emoji: mission.emoji || "📍",
    timestamp: `${index + 1}h`,
    read: false,
    district: mission.district,
    region: mission.region as "costa" | "sierra" | "selva",
    missionId: mission.id,
  }));

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <CivicFeed
        notifications={contextualNotifications}
        userDistrict={user?.district}
      />
    </div>
  );
}
