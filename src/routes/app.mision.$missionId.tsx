import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Calendar, Users, Trophy, ArrowLeft, ArrowRight, Share2, Heart, ShieldCheck, Compass, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { REGION_META } from "@/constants/gamification";
import { MissionStoryModal } from "@/features/missions";
import { useCurrentUser, useJoinUserMission } from "@/features/auth";
import { useProfileMissionTimeline } from "@/features/auth/hooks/useUserMissions";
import { useMission, useMissions } from "@/hooks/useMissions";
import { useProposal } from "@/features/proposals";
import { CivicEntity, isMission, isProposal } from "@/types/entity";
import type { Region } from "@/types";
import { formatRelativeDate } from "@/utils/date";

export const Route = createFileRoute("/app/mision/$missionId")({
  component: MissionDetail,
});

const REGION_THEMES: Record<Region, { gradient: string; text: string; bgLight: string; border: string }> = {
  costa: {
    gradient: "bg-gradient-coast",
    text: "text-amber-700 dark:text-amber-400",
    bgLight: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-800/40"
  },
  sierra: {
    gradient: "bg-gradient-andes",
    text: "text-orange-800 dark:text-orange-400",
    bgLight: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-200 dark:border-orange-800/40"
  },
  selva: {
    gradient: "bg-gradient-jungle",
    text: "text-emerald-700 dark:text-emerald-400",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800/40"
  }
};

function MissionDetail() {
  const { missionId } = useParams({ from: "/app/mision/$missionId" });
  const { data: mission, isLoading: missionLoading, isError: missionError } = useMission(missionId);
  const { data: proposal, isLoading: proposalLoading, isError: proposalError } = useProposal(missionId);
  const { data: allMissions = [] } = useMissions();

  // Determine if entity is mission or proposal
  const isMissionEntity = !missionError && mission;
  const isProposalEntity = !proposalError && proposal;
  const isLoading = missionLoading || proposalLoading;
  const isError = missionError && proposalError;
  const error = missionError || proposalError;
  const entity = isMissionEntity ? mission : proposal;

  const currentUser = useCurrentUser();
  const joinMutation = useJoinUserMission();
  const didFireSuccess = useRef(false);
  const didFireError = useRef(false);

  useEffect(() => {
    if (joinMutation.isSuccess && !didFireSuccess.current) {
      didFireSuccess.current = true;
      toast.success("¡Te has unido a la misión!", {
        description: "Tu expedición cívica ha comenzado. Revisa tu bitácora de impacto.",
      });
    }
  }, [joinMutation.isSuccess]);

  useEffect(() => {
    if (joinMutation.isError && !didFireError.current) {
      didFireError.current = true;
      const msg = joinMutation.error instanceof Error ? joinMutation.error.message : "";
      if (msg.includes("duplicate") || msg.includes("already")) {
        toast.info("Ya formas parte de esta misión.");
      } else {
        toast.error("No se pudo unir a la misión. Intenta de nuevo.");
      }
    }
    if (!joinMutation.isError) didFireError.current = false;
  }, [joinMutation.isError, joinMutation.error]);

  const { data: timeline } = useProfileMissionTimeline();
  const alreadyJoined = timeline?.missions?.some((um) => um.id === missionId) ?? false;

  const [storyOpen, setStoryOpen] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

  const similarMissions = useMemo(() => {
    if (!entity) return [];
    return allMissions
      .filter((x) => x.id !== entity.id && (x.region === entity.region || x.category === entity.category))
      .slice(0, 2);
  }, [entity, allMissions]);

  const handleOpenMissionStory = (id: string) => {
    setSelectedStoryId(id);
    setStoryOpen(true);
  };

  const handleJoinMission = () => {
    if (!currentUser) {
      toast.error("Debes iniciar sesión para unirte a una misión.");
      return;
    }
    if (alreadyJoined || joinMutation.isSuccess) return;
    joinMutation.mutate({ missionId });
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

  if (isError || !entity) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <Link to="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-semibold">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>
        <p className="text-sm text-destructive font-medium">
          {error && typeof error === 'object' && 'message' in error ? (error as Error).message : "No se pudo cargar la misión."}
        </p>
      </div>
    );
  }

  const meta = REGION_META[entity.region];
  const theme = REGION_THEMES[entity.region] || REGION_THEMES.sierra;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 lg:pb-12">
      <Link to="/app/mapa" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-semibold">
        <ArrowLeft className="h-4 w-4" /> Volver al mapa de exploración
      </Link>

      {/* Mobile sticky CTA - only visible on small screens */}
      <div className="lg:hidden fixed bottom-20 left-4 right-4 z-30">
        <motion.button
          onClick={handleJoinMission}
          disabled={alreadyJoined || joinMutation.isPending || joinMutation.isSuccess}
          className={`w-full inline-flex justify-center items-center rounded-2xl ${meta.gradient} text-white py-3.5 font-black text-xs shadow-glow transition-all cursor-pointer ${
            alreadyJoined || joinMutation.isSuccess ? "opacity-90 cursor-default" : ""
          } ${joinMutation.isPending ? "opacity-70 cursor-wait" : ""}`}
          whileHover={!alreadyJoined && !joinMutation.isPending ? { scale: 1.01 } : {}}
          whileTap={!alreadyJoined && !joinMutation.isPending ? { scale: 0.98 } : {}}
        >
          {joinMutation.isPending ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              Uniéndote...
            </span>
          ) : alreadyJoined || joinMutation.isSuccess ? (
            <span className="flex items-center gap-2">
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.5 }}>✨</motion.span>
              ¡Ya eres parte!
            </span>
          ) : (
            "Unirme a la misión"
          )}
        </motion.button>
      </div>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-3xl ${meta.gradient} text-white p-4 sm:p-6 lg:p-12 shadow-glow`}
      >
        <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
        <div className="absolute -right-20 -top-20 h-48 sm:h-72 w-48 sm:w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="relative grid lg:grid-cols-[1fr_auto] gap-4 sm:gap-6 items-end">
          <div>
            <div className="text-7xl select-none filter drop-shadow-sm">{entity.emoji}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-widest font-black bg-black/35 backdrop-blur px-3.5 py-1 rounded-md border border-white/15">
                {meta.name} · {entity.category}
              </div>
              <div className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black px-3.5 py-1 rounded-md border ${
                entity.status === 'active' 
                  ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-100' 
                  : entity.status === 'completed'
                  ? 'bg-blue-500/20 border-blue-400/30 text-blue-100'
                  : 'bg-amber-500/20 border-amber-400/30 text-amber-100'
              }`}>
                {entity.status === 'active' ? 'Activa' : entity.status === 'completed' ? 'Completada' : 'Propuesta'}
              </div>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-6xl mt-2 sm:mt-3 leading-[1.05] tracking-tight">
              {entity.title}
            </h1>
            <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-0.5 text-xs sm:text-xs opacity-90 font-medium">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {entity.district}</span>
              <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> {formatRelativeDate(entity.date)}</span>
              <span className="hidden sm:inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {entity.participants} participantes</span>
            </div>
            {/* P0 FIX: CTA dominante en hero - acción principal visible inmediatamente */}
            <div className="mt-4 sm:mt-6">
              <motion.button
                onClick={handleJoinMission}
                disabled={alreadyJoined || joinMutation.isPending || joinMutation.isSuccess}
                className={`inline-flex items-center gap-2 rounded-2xl bg-gradient-sunrise text-white px-6 py-3 font-black text-xs shadow-glow hover:scale-[1.02] transition-all cursor-pointer ${
                  alreadyJoined || joinMutation.isSuccess ? "opacity-90 cursor-default" : ""
                } ${joinMutation.isPending ? "opacity-70 cursor-wait" : ""}`}
                whileHover={!alreadyJoined && !joinMutation.isPending ? { scale: 1.02 } : {}}
                whileTap={!alreadyJoined && !joinMutation.isPending ? { scale: 0.98 } : {}}
              >
                {joinMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-foreground/40 border-t-foreground animate-spin" />
                    Uniéndote...
                  </span>
                ) : alreadyJoined || joinMutation.isSuccess ? (
                  <span className="flex items-center gap-2">
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.5 }}>✨</motion.span>
                    ¡Ya eres parte!
                  </span>
                ) : (
                  <>
                    Unirme a la misión <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => toast("Guardado en tu bitácora.", { description: "Esta misión está en tu expedición." })}
              className="h-10 w-10 rounded-lg bg-white/15 backdrop-blur border border-white/10 grid place-items-center hover:bg-white/25 active:scale-95 transition-all text-white cursor-pointer"
              title="Guardar misión"
            >
              <Heart className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (navigator.clipboard && window.location.href) {
                  navigator.clipboard.writeText(window.location.href).then(() => {
                    toast.success("Enlace copiado.", { description: "Comparte esta misión con tu red cívica." });
                  }).catch(() => toast("Comparte esta URL con tu red cívica."));
                } else {
                  toast("Comparte esta URL con tu red cívica.");
                }
              }}
              className="h-10 w-10 rounded-lg bg-white/15 backdrop-blur border border-white/10 grid place-items-center hover:bg-white/25 active:scale-95 transition-all text-white cursor-pointer"
              title="Compartir misión"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Main Column */}
        <div className="space-y-6">
          <section className="rounded-3xl bg-card border border-border/80 p-5 sm:p-6 space-y-3">
            <h2 className="font-display font-black text-xl text-foreground">La Misión Territorial</h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">{entity.description}</p>
          </section>

          {/* Why this matters */}
          <section className={`rounded-3xl ${theme.bgLight} border ${theme.border} p-6`}>
            <h2 className="font-display font-black text-xl mb-3 text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" /> Por qué esta misión importa
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed font-medium">
              Esta acción fortalece el tejido comunitario en {entity.district}, generando impacto visible en {entity.impact || 'el entorno local'}. Al participar, contribuyes a construir una ciudad más participativa y consciente.
            </p>
          </section>

          {/* Expedition timeline stages */}
          <section className="rounded-3xl bg-card border border-border/80 p-6">
            <h2 className="font-display font-black text-xl mb-5 text-foreground flex items-center gap-2">
              <Compass className="h-5 w-5 text-accent" /> Itinerario sugerido
            </h2>
            <div className="space-y-4">
              {[
                { t: "7:00 · Punto de encuentro y desayuno", b: "Reunión comunitaria en la plaza para dialogar con vecinos y coordinar tareas." },
                { t: "8:00 · Taller y saberes ancestrales", b: "Conversamos con artesanos y mayores locales para entender el patrimonio histórico." },
                { t: "9:00 · Siembra cívica y acción", b: "Manos a la obra. Reforestación o pintado colectivo de murales en equipos." },
                { t: "14:00 · Reflexión y entrega de XP", b: "Compartimos almuerzo andino, cerramos la bitácora y se acreditan los XP territoriales." },
              ].map((s, i) => (
                <div key={i} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`h-8 w-8 rounded-xl ${meta.gradient} text-white grid place-items-center text-xs font-black shrink-0 border border-white/10`}>
                      {i + 1}
                    </div>
                    {i < 3 && <div className="w-px flex-1 bg-border mt-1" />}
                  </div>
                  <div className="pb-4">
                    <div className="font-bold text-sm text-foreground">{s.t}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 font-medium leading-relaxed">{s.b}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Participants group */}
          <section className="rounded-3xl bg-card border border-border/80 p-6">
            <h2 className="font-display font-black text-xl mb-4 text-foreground">Participantes ({entity.participants})</h2>
            <div className="flex flex-wrap gap-2">
              {["🦙", "🌵", "🦅", "🐟", "🌺", "🌽", "☕", "🪕", "🌞", "⚽"].map((e, i) => (
                <div key={i} className="h-11 w-11 rounded-xl bg-secondary/80 hover:bg-secondary grid place-items-center text-lg hover:scale-110 transition-all select-none border border-border/10 cursor-default">
                  {e}
                </div>
              ))}
              <div className="h-11 px-4 rounded-xl bg-secondary/80 grid place-items-center text-xs font-black text-muted-foreground border border-border/10">
                +{Math.max(0, entity.participants - 10)} más
              </div>
            </div>
          </section>

          {/* Connected Misiones Similares / Otras rutas cercanas */}
          <section className="space-y-4">
            <h2 className="font-display font-black text-xl text-foreground flex items-center gap-2 pl-1">
              <Sparkles className="h-5 w-5 text-accent" /> Otras rutas cercanas en {meta.name}
            </h2>

            {similarMissions.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {similarMissions.map((sim) => (
                  <div
                    key={sim.id}
                    className="rounded-3xl bg-card border border-border/80 p-5 flex flex-col justify-between hover:shadow-soft hover:border-stone-300 dark:hover:border-stone-700 transition-all duration-300 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-3xl p-2 bg-secondary rounded-xl leading-none select-none">{sim.emoji}</span>
                      <span className="text-[8px] uppercase tracking-widest font-black bg-secondary px-2 py-0.5 rounded border border-border/20 text-muted-foreground">
                        Actividad
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
              <div className={`rounded-3xl ${theme.bgLight} border ${theme.border} p-6 text-center`}>
                <p className="text-sm text-muted-foreground font-medium">
                  Eres el primero en explorar esta zona de {meta.name}. Pronto habrá más acciones comunitarias aquí.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="rounded-3xl bg-card border border-border/80 p-6 shadow-soft sticky top-24 space-y-5">
            {/* P0 FIX: Eliminada sección de XP - sistema de gamificación eliminado */}

            <div className="h-px bg-border/60" />

            <div className="space-y-3 text-xs">
              <div className="flex justify-between font-medium"><span className="text-muted-foreground">Dificultad</span><span className="font-bold text-foreground">{entity?.difficulty || 'N/A'}</span></div>
              <div className="flex justify-between font-medium"><span className="text-muted-foreground">Cupos libres</span><span className="font-bold text-accent">{entity?.spotsLeft || 0}</span></div>
              <div className="flex justify-between font-medium"><span className="text-muted-foreground">Organizador</span><span className="font-bold text-foreground">{entity?.organizer?.name || 'N/A'}</span></div>
              <div className="flex justify-between font-medium"><span className="text-muted-foreground">Impacto</span><span className="font-bold text-stone-700 dark:text-stone-300 text-right">{entity?.impact || 'N/A'}</span></div>
            </div>

            <div className="space-y-2 pt-2">
              <motion.button
                onClick={handleJoinMission}
                disabled={alreadyJoined || joinMutation.isPending || joinMutation.isSuccess}
                className={`w-full inline-flex justify-center items-center rounded-2xl ${meta.gradient} text-white py-3.5 font-black text-xs shadow-glow hover:scale-[1.02] transition-all cursor-pointer ${
                  alreadyJoined || joinMutation.isSuccess ? "opacity-90 cursor-default" : ""
                } ${joinMutation.isPending ? "opacity-70 cursor-wait" : ""}`}
                whileHover={!alreadyJoined && !joinMutation.isPending ? { scale: 1.02 } : {}}
                whileTap={!alreadyJoined && !joinMutation.isPending ? { scale: 0.98 } : {}}
              >
                {joinMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Uniéndote...
                  </span>
                ) : alreadyJoined || joinMutation.isSuccess ? (
                  <span className="flex items-center gap-2">
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.5 }}>✨</motion.span>
                    ¡Ya eres parte de esta misión!
                  </span>
                ) : (
                  "Unirme a la misión"
                )}
              </motion.button>
              <button className="w-full rounded-2xl border border-border px-4 py-3 text-xs font-black uppercase tracking-wider hover:bg-secondary/40 transition-colors cursor-pointer">
                Invitar amigos
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Cinematic story overlay */}
      <MissionStoryModal
        isOpen={storyOpen}
        onClose={() => setStoryOpen(false)}
        missionId={selectedStoryId}
      />
    </div>
  );
}
