import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  Calendar,
  Users,
  ArrowLeft,
  ArrowRight,
  Heart,
  Compass,
  Sparkles,
  ShieldCheck,
  Upload,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { CrossingOverlay } from "@/components/CrossingOverlay";
import { REGION_META } from "@/constants/gamification";
import { MissionStoryModal } from "@/features/missions";
import { getDifficultyMeta } from "@/domain/difficulty";
import { useCurrentUser, useCurrentUserId } from "@/features/auth";
import { useJoinInitiativeAction } from "@/features/actions/useJoinInitiativeAction";
import { useProfileMissionTimeline } from "@/features/auth/hooks/useUserMissions";
import { useMission, useMissions } from "@/hooks/useMissions";
import { useProposal } from "@/features/proposals";
import { useProposalOriginByMissionId } from "@/features/districts/hooks";
import { getProposalPhase, getProposalPhaseCopy } from "@/domain/proposalLifecycle";
import { betaEvents } from "@/lib/telemetry/betaLogger";
import {
  useMissionEvidence,
  useSubmitEvidence,
  useUploadMissionEvidence,
} from "@/hooks/useUploadMissionEvidence";
import type { Mission, Region, Evidence } from "@/types";
import { EVIDENCE_TYPE_LABELS, EVIDENCE_STATUS_STYLES } from "@/types/evidence";
import { formatRelativeDate } from "@/utils/date";
import { deriveLifecycleFromMission, computeMissionAnchor } from "@/domain/missionLifecycle";
import type {
  Initiative,
  InitiativeLifecycle,
  InitiativeLocation,
  TemporalAnchor,
} from "@/domain/initiative";
import type { InitiativeAction } from "@/domain/initiativeActions";
import { deriveRelationship } from "@/domain/initiativeActions";
import { ReportModal } from "@/features/moderation/components/ReportModal";
import { InitiativeActionBar } from "@/features/actions/components/InitiativeActionBar";
import { shareInitiative } from "@/features/actions/shareInitiative";
import { useDistricts, useSpatialContext } from "@/features/districts/hooks";
import { deriveCivicTrace } from "@/domain/civicTrace";
import type { CivicTrace, CivicTraceInput } from "@/domain/civicTrace";
import { traceToNarrative } from "@/domain/civicTraceNarrative";
import type { CivicTraceNarrativeCtx } from "@/domain/civicTraceNarrative";
import { InitiativeWall } from "@/features/initiativeWall";
import { CivicAfterglow } from "@/features/initiative/components/CivicAfterglow";
import { ContinueAffordance } from "@/features/initiative/components/ContinueAffordance";
import { isLivingTerritoryEnabled } from "@/lib/operationalFeature";

export const Route = createFileRoute("/app/mision/$missionId")({
  component: MissionDetail,
});

const REGION_THEMES: Record<Region, { bgLight: string; border: string }> = {
  costa: {
    bgLight: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800/40",
  },
  sierra: {
    bgLight: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-200 dark:border-orange-800/40",
  },
  selva: {
    bgLight: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800/40",
  },
};

const STRENGTH_META: Record<
  CivicTrace["strength"],
  { label: string; emoji: string; color: string }
> = {
  faint: {
    label: "Tenue",
    emoji: "🌱",
    color:
      "text-stone-500 bg-stone-100 dark:bg-stone-900/30 border-stone-200 dark:border-stone-800/30",
  },
  settled: {
    label: "Visible",
    emoji: "🌿",
    color:
      "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40",
  },
  landmark: {
    label: "Hito",
    emoji: "🌳",
    color:
      "text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40",
  },
};

const VITALITY_META: Record<
  CivicTrace["vitality"],
  { label: string; emoji: string; color: string }
> = {
  fresh: {
    label: "Reciente",
    emoji: "✨",
    color:
      "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40",
  },
  settling: {
    label: "Asentándose",
    emoji: "⏳",
    color:
      "text-amber-600 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40",
  },
  dormant: {
    label: "Dormida",
    emoji: "💤",
    color:
      "text-slate-500 bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/30",
  },
};

function MissionDetail() {
  const { missionId } = useParams({ from: "/app/mision/$missionId" });
  const navigate = useNavigate();
  const { data: mission, isLoading: missionLoading, isError: missionError } = useMission(missionId);
  const {
    data: proposal,
    isLoading: proposalLoading,
    isError: proposalError,
  } = useProposal(missionId);
  const { data: allMissions = [] } = useMissions();

  const initiative: Initiative | null = useMemo(() => {
    if (mission) {
      const location: InitiativeLocation = {
        district: mission.district,
        districtId: mission.districtId ?? null,
        region: mission.region,
        coords: mission.coords,
        locationLabel: null,
      };
      return {
        id: `mission_${mission.id}`,
        sourceType: "mission",
        sourceId: mission.id,
        title: mission.title,
        summary: mission.description,
        category: mission.category,
        region: mission.region,
        lifecycle: deriveLifecycleFromMission(mission.lifecycleInfo.lifecycle),
        participantsCount: mission.participants,
        temporalAnchor: computeMissionAnchor(
          mission.lifecycleInfo,
          mission.startDate,
          mission.endDate,
        ),
        emoji: mission.emoji,
        location,
      };
    }
    return null;
  }, [mission]);
  const isMissionEntity = mission != null;
  const isProposalEntity = proposal != null && mission == null;
  const isLoading = missionLoading || proposalLoading;
  const isError = missionError && proposalError;
  const error = missionError || proposalError;

  // Phase 9E: check if a real mission was born from a proposal
  const { data: originProposalId } = useProposalOriginByMissionId(isMissionEntity ? missionId : "");

  // Phase 1.5: redirect active proposals to their dedicated detail route.
  // This route is mission-only. If the id resolves to a proposal that is still
  // open / mobilizing, send the user to /app/propuesta/$proposalId where the
  // correct lifecycle-aware CTA lives. We never attempt to join a mission
  // with a proposal id.
  useEffect(() => {
    if (isMissionEntity || !isProposalEntity || !proposal) return;
    const phase = getProposalPhase(proposal.status);
    if (phase === "open" || phase === "mobilizing") {
      navigate({
        to: "/app/propuesta/$proposalId",
        params: { proposalId: proposal.id },
        replace: true,
      });
    }
  }, [isMissionEntity, isProposalEntity, proposal, navigate]);

  const currentUser = useCurrentUser();
  const currentUserId = useCurrentUserId();
  const { handleJoin, joinMutation, resetJoining } = useJoinInitiativeAction();
  const joinBetaLogged = useRef(false);

  const { data: timeline } = useProfileMissionTimeline();
  const alreadyJoined = timeline?.missions?.some((um) => um.id === missionId) ?? false;
  const userMission = timeline?.userMissions?.find((um) => um.missionId === missionId);
  const relationship = initiative
    ? deriveRelationship({
        currentUserId: currentUserId ?? undefined,
        isParticipant: alreadyJoined,
      })
    : "visitor";

  const { data: evidenceList = [] } = useMissionEvidence(missionId);
  const submitEvidenceMutation = useSubmitEvidence();
  const uploadEvidenceMutation = useUploadMissionEvidence();
  const [evidenceType, setEvidenceType] = useState<"text" | "photo">("text");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidencePhoto, setEvidencePhoto] = useState<File | null>(null);
  const isEvidencePending = submitEvidenceMutation.isPending || uploadEvidenceMutation.isPending;

  const handleSubmitEvidence = () => {
    if (evidenceType === "text") {
      betaEvents.evidenceSubmit(missionId, "text");
      submitEvidenceMutation.mutate(
        { missionId, type: "text", description: evidenceDescription || undefined },
        {
          onSuccess: () => {
            betaEvents.evidenceSubmitSuccess(missionId);
            toast.success("Evidencia enviada", {
              description: "Tu participación será verificada.",
            });
            setEvidenceDescription("");
          },
          onError: (err) => {
            betaEvents.evidenceSubmitError(
              missionId,
              err instanceof Error ? err.message : "unknown",
            );
            toast.error("Error", {
              description: err instanceof Error ? err.message : "No se pudo enviar la evidencia",
            });
          },
        },
      );
    } else {
      if (!evidencePhoto) {
        toast.error("Selecciona una foto");
        return;
      }
      betaEvents.evidenceSubmit(missionId, "photo");
      uploadEvidenceMutation.mutate(
        { missionId, file: evidencePhoto, description: evidenceDescription || undefined },
        {
          onSuccess: () => {
            betaEvents.evidenceSubmitSuccess(missionId);
            toast.success("Evidencia enviada", {
              description: "Tu participación será verificada.",
            });
            setEvidenceDescription("");
            setEvidencePhoto(null);
          },
          onError: (err) => {
            betaEvents.evidenceSubmitError(
              missionId,
              err instanceof Error ? err.message : "unknown",
            );
            toast.error("Error", {
              description: err instanceof Error ? err.message : "No se pudo enviar la evidencia",
            });
          },
        },
      );
    }
  };

  // Huella: district lookup for slug + narrative
  const { data: districts = [] } = useDistricts();
  const districtData = useMemo(() => {
    if (!mission) return null;
    return (
      districts.find((d) => d.id === mission.districtId) ??
      districts.find((d) => d.displayName === mission.district) ??
      null
    );
  }, [mission, districts]);

  // Huella: derive trace from mission + verified evidence
  const huellaTrace = useMemo(() => {
    if (!mission || mission.status !== "completed") return null;
    const verified = evidenceList.filter((e) => e.verificationStatus === "verified").length;
    if (verified < 1) return null;
    const input: CivicTraceInput = {
      initiativeId: mission.id,
      title: mission.title,
      districtSlug: districtData?.slug ?? mission.district.toLowerCase().replace(/\s+/g, "-"),
      district: mission.district,
      region: mission.region,
      category: mission.category,
      coords: mission.coords ?? null,
      boundary: null,
      completedAt: mission.endDate ?? null,
      verifiedCount: verified,
    };
    return deriveCivicTrace(input);
  }, [mission, evidenceList, districtData]);

  // Huella: spatial context for territorial narrative
  const { spatialContext } = useSpatialContext(districtData?.slug ?? "");
  const huellaNarrativeCtx = useMemo<CivicTraceNarrativeCtx | null>(() => {
    if (!huellaTrace || !spatialContext) return null;
    return {
      activeSlugs: spatialContext.activeSlugs,
      adjacency: spatialContext.adjacencyMap,
      districtNarrative: districtData?.narrative ?? null,
    };
  }, [huellaTrace, spatialContext, districtData]);

  const [bookmarked, setBookmarked] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("kusqa_bookmarked_missions");
    if (!stored) return false;
    try {
      const ids: string[] = JSON.parse(stored);
      return ids.includes(missionId);
    } catch {
      return false;
    }
  });

  const toggleBookmark = () => {
    const stored = localStorage.getItem("kusqa_bookmarked_missions");
    let ids: string[] = [];
    try {
      ids = stored ? JSON.parse(stored) : [];
    } catch {
      ids = [];
    }
    const wasBookmarked = bookmarked;
    if (wasBookmarked) {
      ids = ids.filter((id) => id !== missionId);
      toast.info("Eliminado de tu bitácora.");
    } else {
      ids.push(missionId);
      toast.success("Guardado en tu bitácora.", {
        description: "Esta misión está en tu expedición.",
      });
    }
    localStorage.setItem("kusqa_bookmarked_missions", JSON.stringify(ids));
    setBookmarked(!wasBookmarked);
  };

  const [storyOpen, setStoryOpen] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [crossingOpen, setCrossingOpen] = useState(false);
  const [heroInView, setHeroInView] = useState(true);
  const heroRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  ).current;

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setHeroInView(entry.isIntersecting), {
      threshold: 0.3,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if ((joinMutation.isSuccess || joinMutation.isError) && !joinBetaLogged.current) {
      joinBetaLogged.current = true;
      if (joinMutation.isSuccess) betaEvents.missionJoinSuccess(missionId);
      if (joinMutation.isError) {
        const msg = joinMutation.error instanceof Error ? joinMutation.error.message : "";
        betaEvents.missionJoinError(missionId, msg || "unknown");
      }
    }
    if (!joinMutation.isSuccess && !joinMutation.isError) joinBetaLogged.current = false;
  }, [joinMutation.isSuccess, joinMutation.isError, joinMutation.error, missionId]);

  const similarMissions = useMemo(() => {
    if (!initiative) return [];
    return allMissions
      .filter(
        (x) =>
          x.id !== initiative.sourceId &&
          (x.region === initiative.region || x.category === initiative.category),
      )
      .slice(0, 2);
  }, [initiative, allMissions]);

  const handleOpenMissionStory = (id: string) => {
    setSelectedStoryId(id);
    setStoryOpen(true);
  };

  const handleActionBar = (action: InitiativeAction) => {
    switch (action) {
      case "join": {
        betaEvents.missionJoinStart(missionId);
        setCrossingOpen(true);
        const fired = handleJoin(missionId, { alreadyJoined, lifecycle: initiative?.lifecycle });
        if (!fired) setCrossingOpen(false);
        break;
      }
      case "share":
        shareInitiative(initiative?.title ?? "", window.location.href);
        break;
      case "report":
        if (currentUserId) setReportOpen(true);
        break;
      case "comment":
        // Scroll to comments section
        document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });
        break;
    }
  };

  const handleCrossingComplete = () => {
    resetJoining();
    setCrossingOpen(false);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-muted/50 rounded-lg" />
          <div className="h-64 bg-muted/30 rounded-3xl border border-border/20" />
          <div className="h-32 bg-muted/30 rounded-3xl border border-border/20" />
        </div>
      </div>
    );
  }

  // While the redirect effect runs, render a quiet loading state to avoid
  // flashing the mission hero with a fake "Unirme" CTA for a proposal.
  if (isProposalEntity && !isMissionEntity) {
    const phase = getProposalPhase(proposal!.status);
    if (phase === "open" || phase === "mobilizing") {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Redirigiendo…</span>
        </div>
      );
    }
    // Converted / dismissed proposals: render a quiet terminal view, no CTA.
    const copy = getProposalPhaseCopy(phase);
    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12 px-4 sm:px-6">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>
        <section className="rounded-3xl bg-card border border-border/80 p-6 sm:p-8 space-y-4">
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">
            {copy.label}
          </div>
          <h1 className="font-display font-black text-2xl sm:text-3xl leading-tight">
            {proposal!.title}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{copy.blurb}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              to="/app/propuesta/$proposalId"
              params={{ proposalId: proposal!.id }}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-sunrise text-white px-4 py-2.5 font-semibold text-sm shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Ver ficha de la propuesta <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/app/mapa"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 font-semibold text-sm hover:bg-secondary transition-colors"
            >
              <Compass className="h-4 w-4" /> Explorar mapa
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (isError || !initiative) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <Link
          to="/app"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-semibold"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>
        <p className="text-sm text-destructive font-medium">
          {error && typeof error === "object" && "message" in error
            ? (error as Error).message
            : "No se pudo cargar la misión."}
        </p>
      </div>
    );
  }

  const meta = REGION_META[initiative.region];
  const theme = REGION_THEMES[initiative.region] || REGION_THEMES.sierra;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-[calc(7rem+env(safe-area-inset-bottom,0px))] lg:pb-12">
      <Link
        to="/app/mapa"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-semibold"
      >
        <ArrowLeft className="h-4 w-4" /> Volver al mapa de exploración
      </Link>

      {/* Mobile sticky CTA — delegates to InitiativeActionBar */}
      {initiative && (
        <div className="lg:hidden fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-30">
          <InitiativeActionBar
            variant="compact"
            initiative={initiative}
            relationship={relationship}
            onAction={handleActionBar}
          />
        </div>
      )}

      {/* Hero */}
      <motion.div
        ref={heroRef}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-3xl ${meta.gradient} text-white p-4 sm:p-6 lg:p-12 shadow-glow`}
      >
        <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
        {/* Pre-click breathing — the territory feels alive when in view */}
        {heroInView && !prefersReducedMotion && (
          <motion.div
            className={`absolute inset-0 ${meta.gradient} pointer-events-none`}
            animate={{ opacity: [0, 0.03, 0] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <div className="absolute -right-20 -top-20 h-48 sm:h-72 w-48 sm:w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-4 sm:gap-6 items-end">
          <div>
            <div className="text-7xl select-none filter drop-shadow-sm">{initiative.emoji}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-black bg-black/35 backdrop-blur px-3.5 py-1 rounded-md border border-white/15">
                {meta.name} · {initiative.category}
              </div>
              <div
                className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black px-3.5 py-1 rounded-md border ${
                  mission!.status === "active"
                    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-100"
                    : mission!.status === "completed"
                      ? "bg-blue-500/20 border-blue-400/30 text-blue-100"
                      : "bg-amber-500/20 border-amber-400/30 text-amber-100"
                }`}
              >
                {mission!.status === "active"
                  ? "Activa"
                  : mission!.status === "completed"
                    ? "Completada"
                    : "Propuesta"}
              </div>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-6xl mt-2 sm:mt-3 leading-[1.05] tracking-tight">
              {initiative.title}
            </h1>
            <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-0.5 text-xs sm:text-xs opacity-90 font-medium">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {initiative.location?.district}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> {initiative.temporalAnchor.label}
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {initiative.participantsCount} participantes
              </span>
            </div>
            <div className="mt-4 sm:mt-6 flex items-center gap-2">
              {initiative && (
                <InitiativeActionBar
                  initiative={initiative}
                  relationship={relationship}
                  variant="row"
                  onAction={handleActionBar}
                />
              )}
            </div>
          </div>
          <div className="hidden sm:flex gap-2 items-start">
            <button
              onClick={toggleBookmark}
              className={`h-10 w-10 rounded-lg backdrop-blur border grid place-items-center hover:bg-white/25 active:scale-95 transition-all cursor-pointer ${
                bookmarked
                  ? "bg-accent/40 border-accent/30 text-accent"
                  : "bg-white/15 border-white/10 text-white"
              }`}
              title={bookmarked ? "Quitar de bitácora" : "Guardar en bitácora"}
            >
              <Heart className={`h-4 w-4 ${bookmarked ? "fill-current" : ""}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {originProposalId && (
        <div className="mb-4 rounded-xl border border-violet-200 dark:border-violet-900/30 bg-violet-50/60 dark:bg-violet-950/20 p-3 sm:p-4">
          <Link
            to="/app/propuesta/$proposalId"
            params={{ proposalId: originProposalId }}
            className="flex items-center gap-2 text-xs text-violet-700 dark:text-violet-300 hover:underline font-medium"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>Esta misión nació de una propuesta ciudadana</span>
            <ArrowRight className="h-3 w-3 ml-auto shrink-0" />
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Main Column */}
        <div className="space-y-6">
          <section className="rounded-3xl bg-card border border-border/80 p-5 sm:p-6 space-y-3">
            <h2 className="font-display font-black text-xl text-foreground">
              {isMissionEntity ? "La Misión Territorial" : "Sobre esta propuesta"}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
              {initiative.summary}
            </p>
          </section>

          {/* Why this matters — always visible so the page never feels hollow.
              Proposals have their own "Por qué" in the proposal detail view. */}
          {isMissionEntity && (
            <section className={`rounded-3xl ${theme.bgLight} border ${theme.border} p-6`}>
              <h2 className="font-display font-black text-xl mb-3 text-foreground flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" /> Por qué esta misión importa
              </h2>
              {mission?.impact ? (
                <p className="text-sm sm:text-base text-foreground/90 leading-relaxed font-medium">
                  {mission.impact}
                </p>
              ) : (
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium italic">
                  El impacto de esta misión se definirá con quienes participen. Cada acción
                  territorial deja una huella imborrable.
                </p>
              )}
            </section>
          )}

          {/* Evidence feed — contributions from participants */}
          {evidenceList.length > 0 && (
            <section className="rounded-3xl bg-card border border-border/80 p-5 sm:p-6">
              <h2 className="font-display font-black text-xl mb-4 text-foreground flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-accent" /> Contribuciones
              </h2>
              <div className="space-y-3">
                {evidenceList.slice(0, 5).map((ev: Evidence) => (
                  <div
                    key={ev.id}
                    className="flex gap-3 p-3 rounded-2xl bg-secondary/30 border border-border/40"
                  >
                    <div className="h-10 w-10 rounded-xl bg-secondary grid place-items-center text-base shrink-0">
                      {ev.type === "photo" || ev.type === "mixed"
                        ? "📷"
                        : ev.type === "checkpoint"
                          ? "📍"
                          : "📝"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">
                          {EVIDENCE_TYPE_LABELS[ev.type]}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${EVIDENCE_STATUS_STYLES[ev.verificationStatus]}`}
                        >
                          {ev.verificationStatus === "verified"
                            ? "Verificada"
                            : ev.verificationStatus === "pending"
                              ? "Pendiente"
                              : ev.verificationStatus === "rejected"
                                ? "Rechazada"
                                : "Marcada"}
                        </span>
                      </div>
                      {ev.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {ev.description}
                        </p>
                      )}
                      <div className="text-[9px] text-muted-foreground/60 mt-1 font-medium">
                        {formatRelativeDate(ev.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Participants group — honest count display, no fake avatars */}
          <section className="rounded-3xl bg-card border border-border/80 p-6">
            <h2 className="font-display font-black text-xl mb-4 text-foreground">
              Participantes ({initiative.participantsCount})
            </h2>
            {initiative.participantsCount && initiative.participantsCount > 0 ? (
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">
                  {initiative.participantsCount} persona
                  {initiative.participantsCount !== 1 ? "s" : ""} en esta misión
                </span>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground font-medium bg-secondary/30 rounded-2xl p-4 text-center">
                Sé el primero en unirte a esta misión.
              </div>
            )}
          </section>

          {/* Connected Misiones Similares / Otras rutas cercanas */}
          <section className="space-y-4">
            <h2 className="font-display font-black text-xl text-foreground flex items-center gap-2 pl-1">
              <Sparkles className="h-5 w-5 text-accent" /> Otras misiones cercanas en {meta.name}
            </h2>

            {similarMissions.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {similarMissions.map((sim) => (
                  <div
                    key={sim.id}
                    className="rounded-3xl bg-card border border-border/80 p-5 flex flex-col justify-between hover:shadow-soft hover:border-stone-300 dark:hover:border-stone-700 transition-all duration-300 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-3xl p-2 bg-secondary rounded-xl leading-none select-none">
                        {sim.emoji}
                      </span>
                      <span className="text-[8px] uppercase tracking-widest font-black bg-secondary px-2 py-0.5 rounded border border-border/20 text-muted-foreground">
                        Ruta
                      </span>
                    </div>

                    <div className="mt-3">
                      <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                        {sim.title}
                      </h4>
                      <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1 font-semibold">
                        <MapPin className="h-3 w-3 text-accent" /> {sim.district}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenMissionStory(sim.id)}
                        className="text-[10px] font-black uppercase tracking-wider text-accent hover:underline cursor-pointer"
                      >
                        Ver narrativa
                      </button>

                      <Link
                        to="/app/mision/$missionId"
                        params={{ missionId: sim.id }}
                        className="text-[10px] font-black uppercase tracking-wider text-stone-500 hover:text-foreground"
                      >
                        Explorar misión →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className={`rounded-3xl ${theme.bgLight} border ${theme.border} p-6 text-center`}
              >
                <p className="text-sm text-muted-foreground font-medium">
                  Sé el pionero de esta misión en {meta.name}. El territorio se activa con quienes se
                  suman.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-3xl bg-card border border-border/80 p-6 shadow-soft sticky top-24 space-y-5">
            {/* P0 FIX: Eliminada sección de XP - sistema de gamificación eliminado */}

            {/* Temporal block — lifecycle-aware anchor */}
            {isMissionEntity && (
              <div className={`rounded-2xl p-4 border ${theme.bgLight} ${theme.border}`}>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Tiempo de la misión
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {initiative.temporalAnchor.label}
                </div>
              </div>
            )}

            {/* Evidence status for joined users */}
            {userMission && (
              <div
                className={`rounded-2xl p-4 border ${
                  userMission.completionState === "completed"
                    ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40"
                    : userMission.completionState === "awaiting_verification"
                      ? "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/40"
                      : theme.bgLight + " " + theme.border
                }`}
              >
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  Tu participación
                </div>

                {userMission.completionState === "completed" ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-4 w-4" /> Completada
                  </div>
                ) : userMission.completionState === "awaiting_verification" ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400">
                    <Clock className="h-4 w-4" /> Evidencia enviada
                    <span className="text-[10px] text-muted-foreground font-normal">
                      — Pendiente de verificación
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                      <Upload className="h-4 w-4 text-accent" /> En misión
                    </div>

                    {/* Evidence submission form — replaces legacy prompt() */}
                    <div className="space-y-2">
                      {/* Type toggle */}
                      <div className="flex gap-1 rounded-lg bg-secondary/40 p-0.5 border border-border/30">
                        <button
                          onClick={() => setEvidenceType("text")}
                          className={`flex-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                            evidenceType === "text"
                              ? "bg-foreground text-background shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Relato
                        </button>
                        <button
                          onClick={() => setEvidenceType("photo")}
                          className={`flex-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
                            evidenceType === "photo"
                              ? "bg-foreground text-background shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Foto
                        </button>
                      </div>

                      {/* Textarea for description */}
                      <textarea
                        value={evidenceDescription}
                        onChange={(e) => setEvidenceDescription(e.target.value)}
                        placeholder={
                          evidenceType === "photo"
                            ? "Describe lo que muestra la foto (opcional)"
                            : "Describe tu acción en esta misión"
                        }
                        rows={2}
                        className="w-full rounded-xl border border-border/40 bg-surface px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-accent/40 resize-none"
                      />

                      {/* File input for photo evidence */}
                      {evidenceType === "photo" && (
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/heic"
                            onChange={(e) => setEvidencePhoto(e.target.files?.[0] ?? null)}
                            className="flex-1 text-[10px] text-muted-foreground file:mr-2 file:rounded-lg file:border file:border-border/40 file:bg-secondary file:px-2 file:py-1 file:text-[10px] file:font-bold file:text-foreground hover:file:bg-secondary/80"
                          />
                          {evidencePhoto && (
                            <span className="text-[9px] text-emerald-600 font-medium shrink-0 truncate max-w-[80px]">
                              {(evidencePhoto.size / 1024).toFixed(0)} KB
                            </span>
                          )}
                        </div>
                      )}

                      {/* Submit button */}
                      <button
                        onClick={handleSubmitEvidence}
                        disabled={isEvidencePending}
                        className={`w-full rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                          isEvidencePending
                            ? "bg-muted text-muted-foreground cursor-wait"
                            : "bg-accent/10 text-accent hover:bg-accent/20 border border-accent/30"
                        }`}
                      >
                        {isEvidencePending ? "Enviando..." : "Enviar evidencia"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Huella — civic trace for completed missions */}
            {huellaTrace && (
              <div className="rounded-2xl p-4 border border-amber-200/40 dark:border-amber-800/30 bg-amber-50/40 dark:bg-amber-950/10">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="text-xs">👣</span> Huella territorial
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed mb-3 font-medium">
                  {huellaNarrativeCtx
                    ? traceToNarrative(huellaTrace, huellaNarrativeCtx)
                    : huellaTrace.narrative}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${STRENGTH_META[huellaTrace.strength].color}`}
                  >
                    {STRENGTH_META[huellaTrace.strength].emoji}{" "}
                    {STRENGTH_META[huellaTrace.strength].label}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${VITALITY_META[huellaTrace.vitality].color}`}
                  >
                    {VITALITY_META[huellaTrace.vitality].emoji}{" "}
                    {VITALITY_META[huellaTrace.vitality].label}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground font-medium">
                  {huellaTrace.verifiedCount} evidencia
                  {huellaTrace.verifiedCount !== 1 ? "s" : ""} verificada
                  {huellaTrace.verifiedCount !== 1 ? "s" : ""}
                  {huellaTrace.completedAt && <> · {formatRelativeDate(huellaTrace.completedAt)}</>}
                </div>
              </div>
            )}

            <CivicAfterglow
              initiative={initiative}
              districtName={initiative.location?.district}
              evidenceCount={
                initiative.lifecycle === "completed" && huellaTrace
                  ? huellaTrace.verifiedCount
                  : undefined
              }
            />

            <ContinueAffordance initiative={initiative} kind="mission" />

            <div className="h-px bg-border/60" />

            <div className="space-y-3 text-xs">
              {/* Date range */}
              {mission!.startDate && (
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Fecha</span>
                  <span className="font-bold text-foreground text-right">
                    {formatRelativeDate(mission!.startDate)}
                    {mission!.endDate && <> – {formatRelativeDate(mission!.endDate)}</>}
                  </span>
                </div>
              )}
              {/* Difficulty */}
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Dificultad</span>
                <span className="font-bold flex items-center gap-1">
                  {(() => {
                    const dm = getDifficultyMeta(mission!.difficulty);
                    const DiffIcon = dm?.icon ?? ShieldCheck;
                    return <DiffIcon className={`h-4 w-4 ${dm?.color ?? "text-foreground"}`} />;
                  })()}
                  <span className="text-foreground">{mission!.difficulty || "Por definir"}</span>
                </span>
              </div>
              {/* Spots */}
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Cupos</span>
                <span className="font-bold text-accent">
                  {mission!.spotsLeft != null
                    ? `${mission!.spotsLeft} libre${mission!.spotsLeft !== 1 ? "s" : ""}`
                    : "Sin límite"}
                </span>
              </div>
              {/* Distance */}
              {mission!.distanceKm != null && (
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Distancia</span>
                  <span className="font-bold text-foreground">
                    {mission!.distanceKm} km
                    {mission!.distanceKm > 0
                      ? mission!.distanceKm >= 10
                        ? " · Travesía"
                        : " · Local"
                      : ""}
                  </span>
                </div>
              )}
              {/* Organizer — only when available */}
              {mission!.organizer?.name && (
                <div className="flex justify-between font-medium pt-3 border-t border-border/40">
                  <span className="text-muted-foreground">Organizador</span>
                  <span className="font-bold text-foreground text-right">
                    {mission!.organizer.name}
                  </span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Initiative Wall — civic conversation */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-8" id="comments">
        <InitiativeWall initiativeId={missionId} initiativeType="mission" />
      </div>

      {/* Cinematic story overlay */}
      <MissionStoryModal
        isOpen={storyOpen}
        onClose={() => setStoryOpen(false)}
        missionId={selectedStoryId}
      />

      {/* Report modal */}
      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="mission"
        targetId={missionId}
        reporterId={currentUserId ?? ""}
      />

      {/* Crossing ritual overlay — stays open until mutation resolves */}
      <CrossingOverlay
        open={crossingOpen}
        gradient={meta.gradient}
        emoji={initiative.emoji}
        avatar={currentUser?.avatar ?? ""}
        hold={joinMutation.isPending}
        onComplete={handleCrossingComplete}
      />
    </div>
  );
}
