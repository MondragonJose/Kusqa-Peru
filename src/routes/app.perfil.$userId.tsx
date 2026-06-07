import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  usePublicProfile,
  usePublicProfileActivity,
  PublicProfileHeader,
  PublicProfileStats,
  PublicProfileTerritory,
  PublicProfileTimeline,
} from "@/features/profile";
import { useCurrentUserId } from "@/features/auth";

export const Route = createFileRoute("/app/perfil/$userId")({
  component: PublicProfilePage,
});

function PublicProfilePage() {
  const { userId } = useParams({ from: "/app/perfil/$userId" });
  const currentUserId = useCurrentUserId();
  const { data: profile, isLoading, isError } = usePublicProfile(userId);
  const { data: events = [] } = usePublicProfileActivity(userId, 20);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <h1 className="text-lg font-display font-semibold">No encontramos este perfil</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Es posible que la persona haya decidido no mostrar su huella pública, o que el enlace esté
          incompleto.
        </p>
        <Link
          to="/app"
          aria-label="Volver al inicio"
          className="mt-2 text-sm text-accent hover:underline inline-flex items-center gap-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
        </Link>
      </div>
    );
  }

  const isOwnProfile = !!currentUserId && currentUserId === profile.id;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-background pb-24 lg:pb-12"
    >
      <div className="sticky top-0 z-20 bg-background/85 backdrop-blur border-b border-border/40">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 sm:px-6 h-12">
          <Link
            to="/app"
            aria-label="Volver al inicio"
            className="h-9 w-9 grid place-items-center rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="text-sm font-semibold text-muted-foreground truncate">
            {isOwnProfile ? "Tu perfil público" : "Perfil"}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <PublicProfileHeader profile={profile} isOwnProfile={isOwnProfile} />
        <PublicProfileStats profile={profile} />
        <div className="grid lg:grid-cols-2 gap-4">
          <PublicProfileTerritory profile={profile} />
          <PublicProfileTimeline events={events} />
        </div>
      </div>
    </motion.div>
  );
}
