import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { useCurrentUser } from "@/features/auth";
import { useProgression, StageCard, KusqaMomentsModal, type KusqaMomentData } from "@/features/progression";
import { BadgeCard, CIVIC_BADGES } from "@/features/badges";
import { CivicTrustBadge, deriveCivicTrust } from "@/features/community";
import { MissionStoryModal } from "@/features/missions";
import { MapPin, Sparkles, Pencil, Heart, Users, Map, Clock, ArrowRight, Award, Calendar, ShieldCheck, X } from "lucide-react";
import { formatRelativeDate } from "@/utils/date";
import type { Region, Mission } from "@/types";
import { getPlaceSuggestions, type PlaceSuggestion } from "@/services/googleMaps";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { userRepository } from "@/services/userRepository";
import { useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/lib/queryKeys";
import { REGION_THEMES, REGION_BADGES, REGION_NODE_GRADIENTS } from "@/constants/gamification";

export const Route = createFileRoute("/app/perfil")({
  component: Profile,
});

export function Profile() {
  const user = useCurrentUser();
  const { currentStage } = useProgression();
  const queryClient = useQueryClient();

  // Fetch user's real missions from mission_participants
  const [completedMissions, setCompletedMissions] = useState<Mission[]>([]);
  const [momentOpen, setMomentOpen] = useState(false);
  const [activeMoment, setActiveMoment] = useState<KusqaMomentData | null>(null);
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

  useEffect(() => {
    const fetchUserMissions = async () => {
      try {
        const userId = await userRepository.getAuthenticatedUserId();
        if (!userId) return;

        const { getUserMissions } = await import("@/services/missions");
        const missions = await getUserMissions(userId);
        setCompletedMissions(missions);
      } catch (e) {
        console.warn("[KUSQA] Could not fetch user missions:", e);
      }
    };

    fetchUserMissions();
  }, []);

  // Get active badges for the user (derived after hooks)
  const userBadges = CIVIC_BADGES.filter((b) => b.earned);
  const activeRegions = Array.from(new Set(completedMissions.map((m) => m.region)));

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // Derive civic trust status
  const trustStatus = deriveCivicTrust({
    missionsDone: user.missionsDone || 0,
    distinctDistricts: activeRegions.length,
    hasLedProject: true,
    streak: 8,
  });

  const handleOpenDistrictEdit = () => {
    setDistrictInput(user.district);
    setDistrictEditOpen(true);
  };

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

      if (import.meta.env.DEV) console.log("[KUSQA LOCATION TRACE] Saving district:", districtInput);
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

  const handleTriggerCelebration = () => {
    // Dynamically build a premium milestone celebration
    setActiveMoment({
      type: "level",
      title: currentStage.name,
      subtitle: `¡Hito Alcanzado: Nivel ${currentStage.level}!`,
      icon: currentStage.icon,
      message: `Tu expedición a través de la ${currentStage.terrain} ha dejado una huella imborrable. Sigues tejiendo comunidad en todo el Perú.`,
      gradientClass: currentStage.gradientClass,
      regionLabel: currentStage.terrain,
      detailLabel: `Ruta KUSQA`,
    });
    setMomentOpen(true);
  };

  const handleOpenMissionStory = (id: string) => {
    setSelectedStoryId(id);
    setStoryOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24 lg:pb-12">
      {/* Cover / Profile Card */}
      <section className="relative rounded-3xl overflow-hidden shadow-sm bg-card border border-border">
        {/* Banner with user region's gradient */}
        <div className={`h-40 sm:h-48 lg:h-64 bg-gradient-${user.region} relative`}>
          <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,oklch(1_0_0/0.25),transparent)]" />
          <button
            disabled
            className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-xl glass-strong px-3.5 py-2 text-xs font-bold text-white/50 border border-white/10 shadow-sm cursor-not-allowed"
            title="[KUSQA DEAD UI TRACE] Funcionalidad de personalización de portada pendiente"
          >
            <Pencil className="h-3.5 w-3.5" /> Personalizar Portada
          </button>
        </div>

        {/* User Info Section */}
        <div className="px-5 sm:px-6 lg:px-10 pb-6 pt-0 relative">
          <div className="flex flex-wrap gap-4 sm:gap-5 items-end -mt-12 sm:-mt-14 lg:-mt-16 mb-6">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-gradient-sunrise grid place-items-center text-4xl sm:text-5xl shadow-glow border-4 border-card z-10">
              {user.avatar}
            </div>
            
            <div className="flex-1 min-w-[240px] pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display font-black text-3xl text-foreground tracking-tight">
                  {user.name}
                </h1>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${REGION_BADGES[user.region]}`}>
                  Expedición {user.region}
                </span>
                
                {/* Civic Trust Reputation Badge */}
                <CivicTrustBadge 
                  profile={{
                    status: trustStatus,
                    district: user.district,
                    verifiedCount: user.missionsDone,
                    validatedBy: "Verificado por red KUSQA"
                  }} 
                />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1.5 font-medium">
                <span>{user.handle}</span>
                <span className="text-border/80">•</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-primary/70" /> {user.district}
                  <button
                    onClick={handleOpenDistrictEdit}
                    className="text-xs text-primary hover:underline ml-1 px-2 py-1 rounded hover:bg-primary/10 transition-colors min-h-[32px]"
                  >
                    Editar
                  </button>
                </span>
              </div>

              {/* Bio / Interests */}
              <div className="mt-3 text-sm text-muted-foreground/80 leading-relaxed max-w-2xl">
                Explorador cívico comprometido con transformar la participación invisible en impacto visible. Me interesa fortalecer el tejido comunitario a través de acciones territoriales concretas.
              </div>
            </div>

            <div className="flex gap-2 pb-1 z-10 w-full sm:w-auto">
              <button 
                onClick={handleTriggerCelebration}
                className="flex-1 sm:flex-initial rounded-xl bg-gradient-sunrise text-white border border-transparent px-4 py-2.5 text-xs font-black shadow-glow hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Award className="h-4 w-4" /> Celebrar Hito
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 border-t border-border/60 pt-6">
            {[
              { l: "XP", v: user.xp.toLocaleString(), i: "✨", color: "text-amber-500" },
              { l: "Misiones", v: completedMissions.length, i: "🗺️", color: "text-sky-500" },
              { l: "Regiones", v: activeRegions.length, i: "�", color: "text-accent" },
              { l: "Nivel", v: currentStage.name, i: "⭐", color: "text-amber-500" },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-secondary/55 p-3 sm:p-4 border border-border/20 flex items-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl filter drop-shadow-sm">{s.i}</span>
                <div>
                  <div className="font-display font-black text-lg sm:text-xl text-foreground leading-none">{s.v}</div>
                  <div className="text-[9px] sm:text-[10px] text-muted-foreground font-semibold mt-1 uppercase tracking-wider">{s.l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Impact Section */}
      <section className="space-y-4">
        <h2 className="font-display font-black text-xl tracking-tight text-foreground flex items-center gap-2 pl-1">
          <Heart className="h-5 w-5 text-rose-500" /> Tu Impacto Comunitario
        </h2>
        <div className="rounded-3xl border border-border/80 bg-card overflow-hidden shadow-sm">
          {/* Categories */}
          <div className="p-5 border-b border-border/40">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Categorías de participación</div>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const categoryCounts: Record<string, number> = {};
                completedMissions.forEach(m => {
                  categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
                });
                const sorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]) as [string, number][];
                if (sorted.length === 0) {
                  return <div className="text-sm text-muted-foreground">Sin participaciones registradas</div>;
                }
                return sorted.slice(0, 4).map(([category, count]: [string, number]) => {
                  const emoji = category === "Medio ambiente" ? "🌱" :
                               category === "Educación" ? "📚" :
                               category === "Comunidad" ? "🤝" :
                               category === "Salud" ? "❤️" :
                               category === "Arte & cultura" ? "🎨" : "🏗️";
                  return (
                    <span key={category} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-border/30 text-xs font-medium">
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
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Distritos de participación</div>
            <div className="flex flex-wrap gap-2">
              {(() => {
                const districtCounts: Record<string, number> = {};
                completedMissions.forEach(m => {
                  districtCounts[m.district] = (districtCounts[m.district] || 0) + 1;
                });
                const sorted = Object.entries(districtCounts).sort((a, b) => b[1] - a[1]) as [string, number][];
                if (sorted.length === 0) {
                  return <div className="text-sm text-muted-foreground">Sin participaciones registradas</div>;
                }
                return sorted.slice(0, 4).map(([district, count]: [string, number]) => (
                  <span key={district} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400 border border-sky-100 dark:border-sky-900/30 text-xs font-medium">
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
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Iniciativas apoyadas</div>
            {(() => {
              try {
                const stored = localStorage.getItem("kusqa_proposal_supports");
                const supported = stored ? new Set(JSON.parse(stored)) : new Set();
                if (supported.size === 0) {
                  return <div className="text-sm text-muted-foreground">Sin apoyos registrados</div>;
                }
                return (
                  <div className="text-sm font-medium text-violet-600 dark:text-violet-400">
                    {supported.size} iniciativa{supported.size !== 1 ? "s" : ""} apoyada{supported.size !== 1 ? "s" : ""}
                  </div>
                );
              } catch {
                return <div className="text-sm text-muted-foreground">Sin apoyos registrados</div>;
              }
            })()}
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
              <Sparkles className="h-5 w-5 text-accent" /> Estado actual
            </h2>
            <StageCard stage={currentStage} status="current" userXp={user.xp} />
          </section>

          {/* Civic History - Timeline entries are clickable to show documentary narrative modal */}
          <section className="space-y-4">
            <h2 className="font-display font-black text-xl tracking-tight text-foreground flex items-center gap-2 pl-1">
              <Clock className="h-5 w-5 text-sky-500" /> Historial
            </h2>
            <p className="text-sm text-muted-foreground pl-1">Registro de misiones completadas.</p>

            {completedMissions.length > 0 ? (
              <div className="relative pl-6 border-l-2 border-dashed border-stone-300 dark:border-stone-850 ml-4 space-y-8">
                {completedMissions.map((m, i) => {
                  const nodeColor = REGION_NODE_GRADIENTS[m.region as Region] || "bg-stone-500";
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative"
                    >
                      {/* Timeline Node Icon */}
                      <button
                        onClick={() => handleOpenMissionStory(m.id)}
                        className={`absolute -left-[35px] top-0.5 h-[18px] w-[18px] rounded-full border-4 border-card ${nodeColor} ring-2 ring-stone-250 dark:ring-stone-850 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform`}
                        title="Ver Bitácora de la Misión"
                      />

                      {/* Card container */}
                      <div
                        onClick={() => handleOpenMissionStory(m.id)}
                        className="rounded-3xl bg-card border border-border/80 p-5 flex gap-4 hover:shadow-soft hover:border-accent/40 dark:hover:border-accent/30 transition-all duration-300 relative group cursor-pointer"
                        title="Haz clic para abrir el archivo documental de esta misión"
                      >
                        <div className={`h-14 w-14 rounded-2xl ${nodeColor} text-white grid place-items-center text-2xl shrink-0 border border-white/10 group-hover:scale-105 transition-transform duration-300 shadow-sm`}>
                          {m.emoji}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {m.title}
                            </span>

                            {/* Verified Status Tag */}
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 shrink-0">
                              <ShieldCheck className="h-2.5 w-2.5" /> Verificado
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground mt-1 truncate font-medium flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 opacity-60" />
                            <span>{m.district}</span>
                            <span className="opacity-40">•</span>
                            <Calendar className="h-3.5 w-3.5 opacity-60" />
                            <span>{formatRelativeDate(m.date)}</span>
                          </div>

                          <div className="mt-3 text-xs text-muted-foreground/80 font-medium leading-relaxed">
                            Contribuiste a {m.impact.toLowerCase()} en {m.district}, fortaleciendo el tejido comunitario.
                          </div>

                          <div className="mt-3 flex gap-4 text-xs text-muted-foreground/80 font-semibold">
                            <span className="inline-flex items-center gap-1 text-sky-500/90">
                              <Users className="h-3 w-3" /> {m.participants} exploradores
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 self-center">
                          <div className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">Fecha</div>
                          <div className="font-display font-black text-accent text-lg">{formatRelativeDate(m.date)}</div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl bg-muted/30 border border-dashed border-border p-8 text-center">
                <div className="text-4xl mb-3">🗺️</div>
                <p className="text-sm text-muted-foreground font-medium">Tu recorrido territorial puede comenzar aquí</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Explora misiones cercanas y participa.</p>
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
            <h2 className="font-display font-black text-lg text-foreground mb-1">Participación por región</h2>
            <p className="text-xs text-muted-foreground mb-4">Regiones donde has participado.</p>
            
            <div className="grid grid-cols-3 gap-2">
              {REGION_THEMES.map((t) => {
                const isActive = activeRegions.includes(t.id) || user.region === t.id;
                return (
                  <div
                    key={t.id}
                    className={`relative rounded-2xl ${t.gradient} text-white p-3 text-center border overflow-hidden transition-all duration-300 ${
                      isActive 
                        ? "shadow-sm border-transparent" 
                        : "opacity-35 grayscale border-border"
                    }`}
                  >
                    <div className="text-2xl mb-1">{t.emoji}</div>
                    <div className="font-display font-bold text-xs">{t.label}</div>
                    {user.region === t.id && (
                      <div className="absolute top-1 right-1 h-2 w-2 rounded-full bg-sun animate-ping" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-muted/50 border border-border/40 text-[11px] text-muted-foreground font-medium flex items-center gap-2">
              <Map className="h-3.5 w-3.5 text-primary/70" />
              <span>
                Camino activo en <strong className="text-foreground">{activeRegions.length}</strong> de las 3 grandes regiones naturales.
              </span>
            </div>
          </section>

          {/* Badges Preview Grid */}
          <section className="rounded-3xl bg-card border border-border/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display font-black text-lg text-foreground leading-none">Insignias Destacadas</h2>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-1.5 block">
                  {userBadges.length} desbloqueadas
                </span>
              </div>
              <button className="text-[10px] uppercase font-bold text-primary flex items-center gap-0.5 hover:underline">
                Ver todas <ArrowRight className="h-3 w-3" />
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
                Completa tu primera misión para desbloquear insignias.
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
