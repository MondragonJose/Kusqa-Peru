import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser, getAuthSnapshot } from "@/features/auth";
import { useProfileMissionTimeline } from "@/features/auth/hooks/useUserMissions";
import {
  useProgression,
  StageCard,
  KusqaMomentsModal,
  type KusqaMomentData,
} from "@/features/progression";
import { BadgeCard, CIVIC_BADGES, type CivicBadge } from "@/features/badges";
import { CivicTrustBadge, deriveCivicTrust } from "@/features/community";
import { MissionStoryModal } from "@/features/missions";
import {
  useSupportedProposalIds,
  useCurrentUserProposals,
  proposalKeys,
} from "@/features/proposals";
import { proposalRepository } from "@/services/proposalRepository";
import {
  getProposalPhase,
  getProposalPhaseCopy,
  getProposalThreshold,
} from "@/domain/proposalLifecycle";
import { MapPin, Sparkles, Heart, Map, Clock, ArrowRight, X, Download } from "lucide-react";
import { computeProposalAnchor } from "@/domain/proposalLifecycle";
import { deriveCivicJourney, type CivicJourneyInput } from "@/domain/civicJourney";
import { deriveCivicBiography } from "@/domain/civicBiography";
import { beatToNarrative, phaseToHeadline } from "@/domain/civicJourneyNarrative";
import { toInstitutionalRecord, toExport, type ExportFormat } from "@/domain/civicJourneyExport";

import type { Mission, UserMission } from "@/types";
import type { PlaceSuggestion } from "@/services/googleMaps";
import { getPlaceSuggestions } from "@/services/googleMaps";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { userRepository } from "@/services/userRepository";
import { useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/lib/queryKeys";
import {
  REGION_META,
  REGIONS,
  regionBadgeStyle,
  regionGradient,
  regionLabel,
  regionEmoji,
} from "@/domain/regions";
import type { Region } from "@/domain/regions";

export const Route = createFileRoute("/app/perfil")({
  beforeLoad: async () => {
    const { state, user } = await getAuthSnapshot();
    if (state === "unauthenticated" || !user) {
      throw redirect({ to: "/app" });
    }
  },
  component: Profile,
});

function computeStreak(userMissions: UserMission[]): number {
  const dates = userMissions
    .filter((um) => um.completedAt != null)
    .map((um) => um.completedAt!.split("T")[0]);
  const unique = [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  if (unique.length === 0) return 0;
  let streak = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]);
    const curr = new Date(unique[i]);
    const diff = Math.round((prev.getTime() - curr.getTime()) / 86_400_000);
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export function Profile() {
  const user = useCurrentUser()!;
  const { currentStage } = useProgression();
  const queryClient = useQueryClient();

  const { data: timeline } = useProfileMissionTimeline();
  const completedMissions: Mission[] = timeline?.missions ?? [];

  const { data: supportedIds = [] } = useSupportedProposalIds();
  const { data: supportedProposals = [] } = useQuery({
    queryKey: [...proposalKeys.supported(supportedIds), "page1"] as const,
    queryFn: () => proposalRepository.getProposalsByIds(supportedIds, { limit: 100 }),
    enabled: supportedIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const { data: ownProposals = [] } = useCurrentUserProposals();

  const [momentOpen, setMomentOpen] = useState(false);
  const [activeMoment, _setActiveMoment] = useState<KusqaMomentData | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [districtEditOpen, setDistrictEditOpen] = useState(false);
  const [districtInput, setDistrictInput] = useState("");
  const [isUpdatingDistrict, setIsUpdatingDistrict] = useState(false);

  const {
    suggestions,
    containerRef: autocompleteContainerRef,
    clearSuggestions,
  } = useAutocomplete<PlaceSuggestion>({
    query: districtInput.split(",")[0].trim(),
    fetcher: getPlaceSuggestions,
    delay: 400,
  });

  const journey = useMemo(() => {
    const input: CivicJourneyInput = {
      userMissions: timeline?.userMissions ?? [],
      supportedProposals: supportedProposals.map((p) => ({
        id: p.id,
        title: p.title,
        createdAt: p.createdAt,
      })),
      userProposals: ownProposals.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        createdAt: p.createdAt,
        convertedAt: p.convertedAt,
      })),
      userDistrict: user.district,
    };
    return deriveCivicJourney(input);
  }, [timeline, supportedProposals, ownProposals, user.district]);

  const bio = useMemo(
    () =>
      deriveCivicBiography({
        journey,
        completedMissionCount: completedMissions.length,
        supportedCount: supportedIds.length,
        proposalCount: ownProposals.length,
      }),
    [journey, completedMissions.length, supportedIds.length, ownProposals.length],
  );

  const activeRegions = journey.footprint.regions;
  const earnedBadgeIds = new Set<string>();
  if (completedMissions.length >= 1) earnedBadgeIds.add("primer-paso");
  if (activeRegions.includes("sierra")) earnedBadgeIds.add("explorador-andino");
  if (activeRegions.includes("costa")) earnedBadgeIds.add("hijo-del-pacifico");
  if (activeRegions.includes("selva")) earnedBadgeIds.add("navegante");
  if (
    activeRegions.includes("sierra") &&
    activeRegions.includes("costa") &&
    activeRegions.includes("selva")
  ) {
    earnedBadgeIds.add("tejedor");
  }
  const userBadges: CivicBadge[] = CIVIC_BADGES.map((b) => ({
    ...b,
    earned: earnedBadgeIds.has(b.id),
  }));

  // Derive civic trust status from real participation data
  const trustStatus = deriveCivicTrust({
    missionsDone: user.missionsDone || 0,
    distinctDistricts: journey.footprint.regions.length,
    hasLedProject: ownProposals.length > 0,
    streak: computeStreak(timeline?.userMissions ?? []),
  });

  const handleSaveDistrict = async () => {
    if (!districtInput.trim()) {
      alert("Por favor ingresa un distrito válido");
      return;
    }

    setIsUpdatingDistrict(true);
    try {
      const userId = await userRepository.getAuthenticatedUserId();
      if (!userId) {
        throw new Error("No authenticated user");
      }

      if (import.meta.env.DEV)
        console.log("[KUSQA LOCATION TRACE] Saving district:", districtInput);
      await userRepository.updateProfileDistrict(userId, districtInput.trim());

      // Invalidate user queries to refresh data
      queryClient.invalidateQueries({ queryKey: userKeys.current });
      queryClient.invalidateQueries({ queryKey: userKeys.profileRow(userId) });

      if (import.meta.env.DEV) console.log("[KUSQA LOCATION TRACE] District saved successfully");
      setDistrictEditOpen(false);
    } catch (error) {
      console.error("[KUSQA LOCATION TRACE] Error saving district:", error);
      toast.error("Error al actualizar distrito", {
        description: "Por favor intenta nuevamente.",
      });
    } finally {
      setIsUpdatingDistrict(false);
    }
  };

  const handleOpenMissionStory = (id: string) => {
    setSelectedStoryId(id);
    setStoryOpen(true);
  };

  const handleExport = (format: ExportFormat) => {
    const record = toInstitutionalRecord(journey);
    const content = toExport(record, format);
    const mime = format === "json" ? "application/json" : "text/csv;charset=utf-8";
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `acta-civica.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 lg:space-y-8 pb-24 lg:pb-12">
      {/* Cover / Profile Card */}
      <section className="relative rounded-3xl overflow-hidden shadow-sm bg-card border border-border">
        {/* Banner with user region's gradient */}
        <div
          className={`h-40 sm:h-48 lg:h-64 ${REGION_META[user.region]?.gradient || "bg-gradient-coast"} relative`}
        >
          <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,oklch(1_0_0/0.25),transparent)]" />
        </div>

        {/* User Info Section */}
        <div className="px-5 sm:px-6 lg:px-10 pb-6 pt-0 relative">
          <div className="flex flex-wrap gap-4 sm:gap-5 items-end -mt-12 sm:-mt-14 lg:-mt-16 mb-6">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-gradient-sunrise grid place-items-center text-4xl sm:text-5xl shadow-glow border-4 border-card z-10">
              {user.avatar}
            </div>

            <div className="flex-1 min-w-[240px] pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display font-black text-2xl sm:text-3xl text-foreground tracking-tight">
                  {user.name}
                </h1>
                <span
                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${regionBadgeStyle(user.region as Region)}`}
                >
                  {REGION_META[user.region as Region].emoji}{" "}
                  {REGION_META[user.region as Region].name}
                </span>

                {/* Civic Trust Reputation Badge */}
                <CivicTrustBadge
                  profile={{
                    status: trustStatus,
                    district: user.district,
                    verifiedCount: user.missionsDone,
                    validatedBy: "Verificado por red KUSQA",
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1.5 font-medium">
                <span>{user.handle}</span>
                <span className="text-border/80">•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary/70" /> {user.district}
                </span>
              </div>

              {/* Bio / Interests */}
              <div className="mt-3 text-sm text-muted-foreground/80 leading-relaxed max-w-2xl">
                A pie por mi territorio, conectando con mi gente y construyendo comunidad.
              </div>
            </div>

            <div className="flex gap-2 pb-1 z-10 w-full sm:w-auto">
              <Link
                to="/app/mapa"
                className="flex-1 sm:flex-initial rounded-xl bg-primary text-white border border-transparent px-4 py-3 text-xs font-bold shadow-sm hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <MapPin className="h-4 w-4" /> Explorar territorio
              </Link>
              <button
                onClick={() => handleExport("json")}
                className="rounded-xl border border-border/60 px-3 py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all flex items-center gap-1.5"
                title="Exportar acta cívica (JSON)"
              >
                <Download className="h-4 w-4" /> JSON
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="rounded-xl border border-border/60 px-3 py-3 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all flex items-center gap-1.5"
                title="Exportar acta cívica (CSV)"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
            </div>
          </div>

          {/* Identity Narrative — biography derived from participation events */}
          <div className="border-t border-border/60 pt-6 relative">
            <div
              className={`absolute -top-px left-0 right-0 h-[3px] rounded-full ${REGION_META[user.region].gradient}`}
            />
            <div className="space-y-3">
              <p className="font-display font-black text-xl sm:text-2xl text-foreground leading-tight">
                {bio.headline}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                {bio.territorialIdentity}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {bio.participationIdentity}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community Impact Section */}
      <section className="space-y-4">
        <h2 className="font-display font-black text-xl tracking-tight text-foreground flex items-center gap-2 pl-1">
          <Heart className="h-5 w-5 text-rose-500" /> Huella en el territorio
        </h2>
        <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
          {/* Territorial Footprint Summary */}
          <div className="p-5 border-b border-border/40 bg-gradient-to-br from-muted/20 to-transparent">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Distritos alcanzados",
                  value: journey.footprint.districtCount,
                  icon: "📍",
                },
                { label: "Iniciativas apoyadas", value: supportedIds.length, icon: "🤝" },
                { label: "Propuestas creadas", value: ownProposals.length, icon: "📋" },
                { label: "Misiones completadas", value: completedMissions.length, icon: "✅" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl bg-card/60 border border-border/30 p-3 text-center"
                >
                  <span className="text-lg block mb-0.5">{s.icon}</span>
                  <div className="font-display font-bold text-lg text-foreground tabular-nums">
                    {s.value}
                  </div>
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="p-5 border-b border-border/40">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Causas activas
            </div>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const categoryCounts: Record<string, number> = {};
                completedMissions.forEach((m) => {
                  categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
                });
                supportedProposals.forEach((p) => {
                  categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
                });
                ownProposals.forEach((p) => {
                  categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
                });
                const sorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]) as [
                  string,
                  number,
                ][];
                if (sorted.length === 0) {
                  return <div className="text-sm text-muted-foreground">Aún sin participación</div>;
                }
                return sorted.slice(0, 4).map(([category, count]: [string, number]) => {
                  const emoji =
                    category === "Medio ambiente"
                      ? "🌱"
                      : category === "Educación"
                        ? "📚"
                        : category === "Comunidad"
                          ? "🤝"
                          : category === "Salud"
                            ? "❤️"
                            : category === "Arte & cultura"
                              ? "🎨"
                              : "🏗️";
                  return (
                    <span
                      key={category}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/30 text-xs font-medium"
                    >
                      <span>{emoji}</span>
                      <span>{category}</span>
                      <span className="text-muted-foreground/60">({count})</span>
                    </span>
                  );
                });
              })()}
            </div>
          </div>

          {/* Districts */}
          <div className="p-5 border-b border-border/40">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Distritos recorridos
            </div>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const districtCounts: Record<string, number> = {};
                completedMissions.forEach((m) => {
                  districtCounts[m.district] = (districtCounts[m.district] || 0) + 1;
                });
                supportedProposals.forEach((p) => {
                  districtCounts[p.district] = (districtCounts[p.district] || 0) + 1;
                });
                ownProposals.forEach((p) => {
                  districtCounts[p.district] = (districtCounts[p.district] || 0) + 1;
                });
                const sorted = Object.entries(districtCounts).sort((a, b) => b[1] - a[1]) as [
                  string,
                  number,
                ][];
                if (sorted.length === 0) {
                  return <div className="text-sm text-muted-foreground">Aún sin participación</div>;
                }
                return sorted.slice(0, 4).map(([district, count]: [string, number]) => (
                  <span
                    key={district}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30 text-xs font-medium"
                  >
                    <MapPin className="h-3 w-3" />
                    <span>{district}</span>
                    <span className="text-muted-foreground/60">({count})</span>
                  </span>
                ));
              })()}
            </div>
          </div>

          {/* Supported Proposals */}
          <div className="p-5">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Coaliciones que apoyas
            </div>
            {supportedProposals.length > 0 ? (
              <div className="space-y-2">
                {supportedProposals.slice(0, 5).map((p) => {
                  const phase = getProposalPhase(p.status);
                  const phaseCopy = getProposalPhaseCopy(phase);
                  const phaseEmoji =
                    phase === "open"
                      ? "🌱"
                      : phase === "ready"
                        ? "✨"
                        : phase === "mobilizing"
                          ? "🚶"
                          : phase === "converted"
                            ? "🔄"
                            : phase === "completed"
                              ? "✅"
                              : "📄";
                  return (
                    <Link
                      key={p.id}
                      to="/app/propuesta/$proposalId"
                      params={{ proposalId: p.id }}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-violet-100 dark:border-violet-900/30 bg-violet-50/30 dark:bg-violet-950/10 hover:bg-violet-100/50 dark:hover:bg-violet-900/20 transition-colors group"
                    >
                      <span className="text-lg shrink-0">{phaseEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-foreground truncate group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                          {p.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-2.5 w-2.5" /> {p.district}
                          <span className="opacity-40">·</span>
                          <span className="text-violet-500 dark:text-violet-400">
                            {phaseCopy.shortLabel}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-700/30 font-semibold">
                        {phaseCopy.shortLabel}
                      </span>
                    </Link>
                  );
                })}
                {supportedIds.length > 5 && (
                  <p className="text-[10px] text-muted-foreground text-center pt-1">
                    +{supportedIds.length - 5} iniciativa{supportedIds.length - 5 !== 1 ? "s" : ""}{" "}
                    más
                  </p>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Aún sin apoyos</div>
            )}
          </div>

          {/* Own Proposals with Lifecycle */}
          <div className="p-5 border-t border-border/40">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Tus iniciativas
            </div>
            {ownProposals.length > 0 ? (
              <div className="space-y-2">
                {ownProposals.slice(0, 5).map((p) => {
                  const phase = getProposalPhase(p.status);
                  const phaseCopy = getProposalPhaseCopy(phase);
                  const anchorLabel = computeProposalAnchor(
                    p.status,
                    p.proposedDate,
                    p.createdAt,
                    p.convertedAt,
                    p.completedAt,
                    0,
                    getProposalThreshold(p.teamSize),
                  ).label;
                  return (
                    <Link
                      key={p.id}
                      to="/app/propuesta/$proposalId"
                      params={{ proposalId: p.id }}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-accent/20 bg-accent/5 hover:bg-accent/10 transition-colors group"
                    >
                      <span className="text-lg shrink-0">📋</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-foreground truncate group-hover:text-accent transition-colors">
                          {p.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-2.5 w-2.5" /> {p.district}
                          <span className="opacity-40">·</span>
                          <span>{phaseCopy.shortLabel}</span>
                          <span className="opacity-40">·</span>
                          <span className="text-accent font-medium">{anchorLabel}</span>
                        </div>
                        {phase === "ready" && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                            ✨ Lista para convertir en misión
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-semibold">
                        {phaseCopy.shortLabel}
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Aún no has creado propuestas</div>
            )}
          </div>
        </div>
      </section>

      {/* Main Grid: Journey Status & Badges */}
      <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
        {/* Left Side: Journey Stage Detail & History */}
        <div className="space-y-8">
          {/* Current Stage Card */}
          <section className="space-y-4">
            <h2 className="font-display font-black text-xl tracking-tight text-foreground flex items-center gap-2 pl-1">
              <Sparkles className="h-5 w-5 text-accent" /> Ruta actual
            </h2>
            <StageCard stage={currentStage} status="current" userXp={user.xp} />
          </section>

          {/* Civic History — narrative beats derived from actual participation */}
          <section className="space-y-4">
            <h2 className="font-display font-black text-xl tracking-tight text-foreground flex items-center gap-2 pl-1">
              <Clock className="h-5 w-5 text-sky-500" />{" "}
              {phaseToHeadline(journey.arc, journey.footprint)}
            </h2>
            <p className="text-sm text-muted-foreground pl-1">Tu bitácora de expediciones.</p>

            {journey.arc.beats.length > 0 ? (
              <div className="relative pl-6 border-l-2 border-dashed border-stone-300 dark:border-stone-850 ml-4 space-y-8">
                {journey.arc.beats
                  .sort((a, b) => {
                    const ta = new Date(a.timestamp).getTime();
                    const tb = new Date(b.timestamp).getTime();
                    return tb - ta;
                  })
                  .map((beat, i) => (
                    <motion.div
                      key={`${beat.sourceType}-${beat.sourceId}-${i}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative"
                    >
                      {/* Timeline Node Icon */}
                      <button
                        onClick={() => {
                          if (beat.sourceType === "mission" && beat.sourceId)
                            handleOpenMissionStory(beat.sourceId);
                        }}
                        className={`absolute -left-[35px] top-0.5 h-[18px] w-[18px] rounded-full border-4 border-card bg-sky-500 ring-2 ring-stone-250 dark:ring-stone-850 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform text-[9px]`}
                        title={
                          beat.sourceType === "mission"
                            ? "Ver Bitácora de la Misión"
                            : beat.sourceType === "proposal"
                              ? "Ir a la propuesta"
                              : ""
                        }
                      >
                        <span className="scale-[0.6]">{beat.emoji}</span>
                      </button>

                      {/* Card container */}
                      <div
                        onClick={() => {
                          if (beat.sourceType === "mission" && beat.sourceId)
                            handleOpenMissionStory(beat.sourceId);
                        }}
                        className={`rounded-3xl bg-card border border-border/80 p-5 flex gap-4 transition-all duration-300 relative group ${
                          beat.sourceType === "mission"
                            ? "hover:shadow-soft hover:border-accent/40 dark:hover:border-accent/30 cursor-pointer"
                            : ""
                        }`}
                        title={
                          beat.sourceType === "mission"
                            ? "Haz clic para abrir el archivo documental de esta misión"
                            : ""
                        }
                      >
                        <div
                          className={`h-14 w-14 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 grid place-items-center text-2xl shrink-0 border border-sky-200 dark:border-sky-800/30 group-hover:scale-105 transition-transform duration-300 shadow-sm`}
                        >
                          {beat.emoji}
                        </div>

                        <div className="flex-1 min-w-0 self-center">
                          <div className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {beat.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            {beatToNarrative(beat)}
                          </div>
                          <div className="text-[10px] text-muted-foreground/60 mt-2 font-medium">
                            {new Date(beat.timestamp).toLocaleDateString("es-PE", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
              </div>
            ) : (
              <div className="rounded-3xl bg-muted/30 border border-dashed border-border p-8 text-center">
                <div className="text-4xl mb-3">🗺️</div>
                <p className="text-sm text-muted-foreground font-medium">
                  Aún no has iniciado una ruta.
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Encuentra tu primera ruta en el mapa.
                </p>
                <Link
                  to="/app/mapa"
                  className="inline-flex items-center gap-2 mt-4 text-xs font-black uppercase tracking-wider text-primary hover:underline"
                >
                  Explorar misiones <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* Right Side: Identity, Badge Showcase & Footprint */}
        <div className="space-y-8">
          {/* Identity & Territorial Footprint */}
          <section className="rounded-3xl bg-card border border-border/80 p-6 shadow-sm relative overflow-hidden">
            <h2 className="font-display font-black text-lg text-foreground mb-1">
              Participación por región
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Tu huella en cada región.</p>

            <div className="grid grid-cols-3 gap-2">
              {REGIONS.map((id) => {
                const isActive = activeRegions.includes(id) || user.region === id;
                return (
                  <div
                    key={id}
                    className={`relative rounded-2xl ${regionGradient(id)} text-white p-3 text-center border overflow-hidden transition-all duration-300 ${
                      isActive
                        ? "shadow-sm border-transparent"
                        : "opacity-35 grayscale border-border"
                    }`}
                  >
                    <div className="text-2xl mb-1">{regionEmoji(id)}</div>
                    <div className="font-display font-bold text-xs">{regionLabel(id)}</div>
                    {user.region === id && (
                      <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-sun animate-ping" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-muted/50 border border-border/40 text-[11px] text-muted-foreground font-medium flex items-center gap-2">
              <Map className="h-3.5 w-3.5 text-primary/70" />
              <span>
                Has dejado huella en{" "}
                <strong className="text-foreground">{journey.footprint.regions.length}</strong> de
                las 3 regiones.
              </span>
            </div>
          </section>

          {/* Badges Preview Grid */}
          <section className="rounded-3xl bg-card border border-border/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-black text-lg text-foreground leading-none">
                  Insignias
                </h2>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1.5 block">
                  {userBadges.filter((b) => b.earned).length} desbloqueadas
                </span>
              </div>
              <button className="text-[10px] uppercase font-bold text-primary flex items-center gap-0.5 hover:underline">
                Ver más <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {/* Quick view of the top 3-4 badges */}
            <div className="grid grid-cols-2 gap-3">
              {userBadges.slice(0, 4).map((badge, idx) => (
                <BadgeCard key={badge.id} badge={badge} index={idx} showNarrative={false} />
              ))}
            </div>

            {userBadges.length === 0 && (
              <div className="text-center py-6 text-xs text-muted-foreground bg-muted/30 border border-dashed border-border rounded-2xl">
                Tu primera misión desbloqueará tus primeras insignias.
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Cinematic celebration layer modal */}
      <KusqaMomentsModal
        isOpen={momentOpen}
        onClose={() => setMomentOpen(false)}
        moment={activeMoment}
      />

      {/* Cinematic mission story overlay */}
      <MissionStoryModal
        isOpen={storyOpen}
        onClose={() => setStoryOpen(false)}
        missionId={selectedStoryId}
      />

      {/* District Edit Modal */}
      {districtEditOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-3xl border border-border/80 shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-xl">Actualizar tu distrito</h3>
              <button
                onClick={() => setDistrictEditOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              ¿Dónde te encuentras actualmente? Esto nos ayuda a mostrarte misiones cercanas.
            </p>

            <div className="relative" ref={autocompleteContainerRef}>
              <input
                type="text"
                value={districtInput}
                onChange={(e) => setDistrictInput(e.target.value)}
                placeholder="Ej: Barranco, Lima"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/50"
              />

              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto">
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setDistrictInput(s.description);
                        clearSuggestions();
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-secondary/60 border-b border-border/10 last:border-b-0 flex items-center gap-2 transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5 text-accent shrink-0" />
                      <span className="truncate">{s.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDistrictEditOpen(false)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-secondary transition-smooth"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveDistrict}
                disabled={isUpdatingDistrict || !districtInput.trim()}
                className="flex-1 rounded-xl bg-gradient-sunrise text-white px-4 py-2.5 text-sm font-semibold shadow-glow hover:scale-[1.02] transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingDistrict ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
