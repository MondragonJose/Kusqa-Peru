import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { MapPin, Sparkles, ArrowRight, Users, TrendingUp, Heart, Compass, CompassIcon, RefreshCw } from "lucide-react";
import { REGION_META } from "@/data/kusqa";
import { useCurrentUser, useUserXpProgress } from "@/features/auth";
import { useProgression } from "@/features/progression";
import { CommunityPulse } from "@/features/community";
import { useMissions } from "@/hooks/useMissions";
import { useAllProposals } from "@/features/proposals";
import { Onboarding } from "@/components/Onboarding";
import type { Region, Mission, MissionCategory, MissionDifficulty } from "@/types";
import type { Proposal } from "@/services/proposalContract";
import { useQueryClient } from "@tanstack/react-query";
import { missionKeys } from "@/lib/queryKeys";
import { formatRelativeDate } from "@/utils/date";
import { getCategoryMetadata } from "@/constants/categoryMetadata";
import { CivicEntity, isMission, isProposal } from "@/types/entity";
import { proposalToEntity, missionToEntity } from "@/services/entityAdapter";

// Helper para renderizar metadata contextual simple en cards
function renderCategoryMetadata(category: MissionCategory) {
  const meta = getCategoryMetadata(category);
  // Para beta, mostrar solo el primer field relevante
  const field = meta.fields[0];
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80 font-medium">
      <span>{field.icon}</span>
      <span>{field.label}: {field.defaultValue}</span>
    </div>
  );
}

// Helper para renderizar badge de entityType
function renderEntityTypeBadge(entity: CivicEntity) {
  if (isProposal(entity)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-[8px] font-bold text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30">
        <span>🏛️</span>
        <span>Propuesta</span>
      </span>
    );
  }
  return null;
}

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: missions = [] } = useMissions();
  const { data: proposals = [] } = useAllProposals(); // Sin filtro de status para incluir pending
  const currentUser = useCurrentUser();
  const { progressPct } = useUserXpProgress();
  const { currentStage, nextStage, xpToNextStage } = useProgression();
  const queryClient = useQueryClient();

  const handleRefreshMissions = () => {
    if (import.meta.env.DEV) {
      console.log("[KUSQA MISSION TRACE] Manual cache refresh triggered");
      queryClient.invalidateQueries({ queryKey: missionKeys.all });
    }
  };

  // Merge missions + proposals como CivicEntity unificado
  const allEntities = useMemo<CivicEntity[]>(() => {
    const missionEntities = missions.map(missionToEntity);
    const proposalEntities = proposals.flatMap((p) => {
      const entity = proposalToEntity(p);
      return entity ? [entity] : [];
    });
    const merged = [...missionEntities, ...proposalEntities];
    if (import.meta.env.DEV) {
      console.log("[KUSQA ENTITY TRACE] Dashboard merge:", missionEntities.length, "missions +", proposalEntities.length, "proposals =", merged.length, "total entities");
    }
    return merged;
  }, [missions, proposals]);

  // Balanced mission selection: prioritize territorial diversity, then internal diversity within regions
  const featured = (() => {
    if (import.meta.env.DEV) {
      console.log("[KUSQA MISSION TRACE] Dashboard: Total missions before featured selection:", allEntities.length);
    }

    if (allEntities.length === 0) return [];

    const byRegion: Record<string, CivicEntity[]> = {};
    allEntities.forEach(m => {
      if (!byRegion[m.region]) byRegion[m.region] = [];
      byRegion[m.region].push(m);
    });

    const regionCount = Object.keys(byRegion).length;

    // If missions are spread across multiple regions: take one from each, then fill
    if (regionCount >= 2) {
      const selected: CivicEntity[] = [];
      ["sierra", "costa", "selva"].forEach(region => {
        const pool = byRegion[region];
        if (pool && pool.length > 0) selected.push(pool[0]);
      });
      const remaining = allEntities.filter(m => !selected.includes(m));
      selected.push(...remaining.slice(0, 3 - selected.length));
      const final = selected.slice(0, 3);

      if (import.meta.env.DEV) {
        const hidden = allEntities.filter(m => !final.includes(m));
        console.log("[KUSQA ENTITY TRACE] Dashboard: Featured selection (multi-region):", final.length, "selected");
        console.log("[KUSQA ENTITY TRACE] Dashboard: Featured hidden:", hidden.length, "entities (slice limit 3)");
        hidden.forEach(m => {
          console.log("[KUSQA ENTITY TRACE] Hidden from featured:", {
            id: m.id,
            title: m.title,
            region: m.region,
            entityType: m.entityType,
            hiddenReason: "slice limit (max 3 featured)",
          });
        });
      }

      return final;
    }

    // If all missions are in one region: distribute by category/district for internal diversity
    const singleRegion = Object.keys(byRegion)[0] as Region;
    const pool = byRegion[singleRegion];

    if (pool.length <= 3) {
      if (import.meta.env.DEV) {
        console.log("[KUSQA MISSION TRACE] Dashboard: Featured selection (single region, <=3):", pool.length, "all selected");
      }
      return pool.slice(0, 3);
    }

    // Group by category to pick diverse missions
    const byCategory: Record<string, CivicEntity[]> = {};
    pool.forEach(m => {
      if (!byCategory[m.category]) byCategory[m.category] = [];
      byCategory[m.category].push(m);
    });

    const categories = Object.keys(byCategory);
    const selected: CivicEntity[] = [];

    // Take one from each category until we have 3
    for (const cat of categories) {
      if (selected.length >= 3) break;
      selected.push(byCategory[cat][0]);
    }

    // Fill remaining slots with any missions not yet selected
    const remaining = pool.filter(m => !selected.includes(m));
    selected.push(...remaining.slice(0, 3 - selected.length));

    const final = selected.slice(0, 3);

    if (import.meta.env.DEV) {
      const hidden = pool.filter(m => !final.includes(m));
      console.log("[KUSQA ENTITY TRACE] Dashboard: Featured selection (single region):", final.length, "selected");
      console.log("[KUSQA ENTITY TRACE] Dashboard: Featured hidden:", hidden.length, "entities (slice limit 3)");
      hidden.forEach(m => {
        console.log("[KUSQA ENTITY TRACE] Hidden from featured:", {
          id: m.id,
          title: m.title,
          region: m.region,
          category: m.category,
          entityType: m.entityType,
          hiddenReason: "slice limit (max 3 featured)",
        });
      });
    }

    return final;
  })();

  if (import.meta.env.DEV) {
    console.log("[KUSQA MISSION TRACE] Dashboard: Featured selection:", featured.length, "missions (hidden:", allEntities.length - featured.length, ")");
  }

  const userRegion = currentUser?.region as Region | undefined;
  const nearbyRaw = userRegion ? allEntities.filter((m) => m.region === userRegion) : allEntities.slice(0, 2);
  const nearby = nearbyRaw.length > 0 ? nearbyRaw : allEntities.slice(0, 2);

  if (import.meta.env.DEV) {
    console.log("[KUSQA ENTITY TRACE] Dashboard: Nearby selection (userRegion:", userRegion, "):", nearby.length, "entities (hidden:", allEntities.length - nearby.length, ")");
    const hiddenNearby = allEntities.filter(m => !nearby.includes(m));
    if (hiddenNearby.length > 0) {
      console.log("[KUSQA ENTITY TRACE] Dashboard: Nearby hidden entities:");
      hiddenNearby.forEach(m => {
        const reason = userRegion
          ? `region filter (entity.region=${m.region}, userRegion=${userRegion})`
          : "slice limit (max 2 nearby)";
        console.log("[KUSQA ENTITY TRACE] Hidden from nearby:", {
          id: m.id,
          title: m.title,
          region: m.region,
          entityType: m.entityType,
          hiddenReason: reason,
        });
      });
    }
  }

  // Adaptive feed: show more proposals when missions are scarce
  const feedItems = (() => {
    const missionCount = Math.min(allEntities.length, 3);
    const feed = allEntities.slice(0, missionCount);

    if (import.meta.env.DEV) {
      console.log("[KUSQA ENTITY TRACE] Dashboard: Feed selection:", feed.length, "entities (hidden:", allEntities.length - missionCount, ")");
      const hiddenFeed = allEntities.slice(missionCount);
      if (hiddenFeed.length > 0) {
        console.log("[KUSQA ENTITY TRACE] Dashboard: Feed hidden entities:");
        hiddenFeed.forEach(m => {
          console.log("[KUSQA ENTITY TRACE] Hidden from feed:", {
            id: m.id,
            title: m.title,
            region: m.region,
            entityType: m.entityType,
            hiddenReason: `slice limit (max ${missionCount} entities in feed)`,
          });
        });
      }
    }

    return feed;
  })();

  // Real stats derived from actual mission data
  const activeDistricts = new Set(allEntities.map((m) => m.district)).size;
  const totalParticipants = allEntities.reduce((acc, m) => acc + m.participants, 0);
  const totalHoursRaw = Math.round(totalParticipants * 3.5);
  const totalHoursLabel = totalHoursRaw >= 1000
    ? `${(totalHoursRaw / 1000).toFixed(1)}K`
    : `${totalHoursRaw}`;

  if (import.meta.env.DEV) {
    const visibleInDashboard = new Set([...featured, ...nearby, ...feedItems]).size;
    const visiblePercent = allEntities.length > 0 ? ((visibleInDashboard / allEntities.length) * 100).toFixed(1) : "0";
    const missionCount = allEntities.filter(e => e.entityType === "mission").length;
    const proposalCount = allEntities.filter(e => e.entityType === "proposal").length;
    console.log("[KUSQA ENTITY TRACE] Dashboard visibility summary:", visibleInDashboard, "unique entities visible of", allEntities.length, "total (" + visiblePercent + "% visible)");
    console.log("[KUSQA ENTITY TRACE] Entity breakdown:", missionCount, "missions +", proposalCount, "proposals");
  }

  // Territorial scrollable targets — always 3, derived from real missions
  const buildTerritory = (
    region: Region,
    id: string,
    name: string,
    fallbackQuote: string,
    fallbackCategory: string,
    emoji: string
  ) => {
    const pool = allEntities.filter(m => m.region === region);
    const counts: Record<string, number> = {};
    pool.forEach(m => { counts[m.category] = (counts[m.category] || 0) + 1; });
    const leadCategory = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || fallbackCategory;
    const preview = pool[0] ?? null;
    return { id, name, region, activeMissionsCount: pool.length, leadCategory, preview, imageEmoji: emoji, quote: fallbackQuote, link: "/app/mapa" };
  };

  const territories = [
    buildTerritory("sierra", "valle-sagrado", "Sierra & Andes",  "Sembrando agua y reforestando las cuencas de los abuelos.", "Medio ambiente", "🏔️"),
    buildTerritory("costa",  "barranco",      "Lima & Costa",    "Rescatando la memoria visual y comunitaria en el litoral.",  "Arte & cultura",  "🌊"),
    buildTerritory("selva",  "selva",         "Amazonía & Selva","Uniendo brigadas fluviales para limpiar nuestros ríos sagrados.", "Comunidad",  "🌿"),
  ];

  return (
    <>
      <Onboarding onComplete={() => {}} />
      {import.meta.env.DEV && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={handleRefreshMissions}
            className="flex items-center gap-2 px-3 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-500 text-xs font-bold hover:bg-yellow-500/30 transition-all"
          >
            <RefreshCw className="h-3 w-3" />
            Refrescar misiones
          </button>
        </div>
      )}
      <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto pb-24 lg:pb-16 relative">
        {/* Slight trail line for expedition feel */}
        <div className="absolute left-8 top-24 bottom-24 w-px bg-gradient-to-b from-transparent via-border/30 to-transparent hidden lg:block" />

      {/* Cinematic Hero Section — "Portal de Expedición" */}
      <section className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-stone-950 text-white p-6 sm:p-8 lg:p-12 shadow-2xl border border-white/10">
        {/* Animated Qhapaq Ñan Background Line Motifs */}
        <div className="absolute inset-0 bg-mesh opacity-15 pointer-events-none" />
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <motion.path
              d="M-100 120 Q 200 40 450 180 T 1100 80"
              fill="none"
              stroke="url(#hero-trail-gradient)"
              strokeWidth="2.5"
              strokeDasharray="6 12"
              animate={{ strokeDashoffset: [0, -40] }}
              transition={{ repeat: Infinity, ease: "linear", duration: 15 }}
            />
            <defs>
              <linearGradient id="hero-trail-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#C4962A" />
                <stop offset="50%" stopColor="#6B4F8E" />
                <stop offset="100%" stopColor="#2D7A4A" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Ambient Glow Particles */}
        <div className="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none animate-pulse-ring" />
        <div className="absolute right-10 bottom-0 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="relative grid lg:grid-cols-[1fr_360px] gap-8 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[10px] uppercase font-bold tracking-widest text-amber-300 border border-white/5">
              <Compass className="h-3 w-3 animate-spin-slow" /> Expedición Activa
            </span>
            <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.05]">
              Cada barrio guarda <br/>
              <span className="bg-clip-text text-transparent bg-gradient-sunrise">una historia de impacto.</span>
            </h1>
            <p className="text-sm sm:text-base text-stone-300 max-w-xl font-medium leading-relaxed">
              Explora misiones, conecta con jóvenes en todo el territorio y deja huellas reales en el Perú. Un camino de participación inspirado en el Qhapaq Ñan.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/app/mapa" className="inline-flex items-center gap-2 rounded-2xl bg-white text-stone-950 px-6 py-3.5 text-xs font-black shadow-glow hover:scale-[1.02] active:scale-95 transition-all">
                Explorar el territorio <MapPin className="h-4 w-4 text-accent" />
              </Link>
              <Link to="/app/crear" className="inline-flex items-center gap-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-6 py-3.5 text-xs font-bold hover:bg-white/20 active:scale-95 transition-all text-white">
                Comenzar mi expedición
              </Link>
            </div>
          </div>

          {/* Large Territorial Statistics */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
            {[
              { label: "distritos activos", value: activeDistricts > 0 ? String(activeDistricts) : "—", desc: "Red comunitaria", color: "text-amber-400" },
              { label: "expediciones", value: missions.length > 0 ? String(missions.length) : "—", desc: "Misiones en curso", color: "text-sky-400" },
              { label: "exploradores", value: totalParticipants > 0 ? totalParticipants.toLocaleString() : "—", desc: "En todo el Perú", color: "text-rose-400" },
              { label: "horas cívicas", value: totalHoursRaw > 0 ? totalHoursLabel : "—", desc: "Impacto colectivo", color: "text-emerald-400" },
            ].map((s, idx) => (
              <div key={idx} className="p-3 bg-stone-900/60 rounded-2xl border border-white/5 text-center">
                <div className={`font-display font-black text-2xl ${s.color}`}>{s.value}</div>
                <div className="text-[8px] uppercase tracking-wider font-extrabold text-stone-400 mt-1">{s.label}</div>
                <div className="text-[7px] text-stone-500 font-semibold mt-0.5 leading-none">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Territorios en Movimiento — Horizontally scrollable expedition cards */}
      <section className="space-y-4 relative">
        {/* activeMissionsCount is derived from real missions */}
        {/* Small connection dot */}
        <div className="absolute -left-4 top-8 w-2 h-2 rounded-full bg-accent/50 hidden lg:block" />
        <div className="flex items-end justify-between px-1">
          <div>
            <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight text-foreground flex items-center gap-2">
              <CompassIcon className="h-5 w-5 text-accent animate-pulse-ring" /> Territorios en Movimiento
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Explora las historias activas que están transformando cada región natural.</p>
          </div>
          <Link to="/app/mapa" className="text-xs uppercase tracking-wider text-primary font-bold hover:underline inline-flex items-center gap-1">
            Ver mapa completo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar snap-x snap-mandatory">
          {territories.map((t) => {
            const meta = REGION_META[t.region];
            return (
              <motion.div
                key={t.id}
                whileHover={{ y: -4 }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-[260px] sm:w-[280px] md:w-[320px] shrink-0 snap-start bg-card border border-border/80 rounded-3xl overflow-hidden hover:shadow-lift transition-all duration-300 flex flex-col justify-between relative"
              >
                {/* Subtle pulse for active territories */}
                {t.activeMissionsCount > 0 && (
                  <motion.div
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [1, 0.5, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
                {/* Visual Header */}
                <div className={`h-24 ${meta.gradient} text-white p-4 relative`}>
                  <div className="absolute inset-0 bg-mesh opacity-20" />
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-3xl filter drop-shadow-sm select-none">{t.imageEmoji}</span>
                    <span className="text-[8px] uppercase tracking-widest font-black bg-black/35 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 text-white">
                      {meta.name}
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h3 className="font-display font-bold text-sm tracking-tight leading-none truncate">
                      {t.name}
                    </h3>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  {t.preview ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xl shrink-0">{t.preview.emoji}</span>
                      <p className="text-xs text-foreground/80 font-semibold leading-snug line-clamp-2">{t.preview.title}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic leading-relaxed">"{t.quote}"</p>
                  )}
                  
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="font-semibold">Causa principal</span>
                      <span className="font-extrabold text-primary">{t.leadCategory}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-muted-foreground">
                        <span>Actividad territorial</span>
                        <span className={t.activeMissionsCount > 0 ? "text-emerald-500" : "text-muted-foreground/50"}>
                          {t.activeMissionsCount > 0 ? `${t.activeMissionsCount} misión${t.activeMissionsCount !== 1 ? "es" : ""}` : "Próximamente"}
                        </span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-sunrise"
                          initial={{ width: 0 }}
                          animate={{ width: t.activeMissionsCount > 0 ? `${Math.min(100, t.activeMissionsCount * 20)}%` : "3%" }}
                          transition={{ duration: 1, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="px-4 pb-4 pt-1">
                  <Link
                    to={t.link}
                    className="w-full inline-flex justify-center items-center py-2.5 rounded-xl bg-secondary hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors text-[10px] font-black uppercase tracking-wider text-foreground"
                  >
                    Ingresar al Territorio
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Featured Recommendations */}
      <section className="space-y-4 relative">
        {/* Small connection dot */}
        <div className="absolute -left-4 top-8 w-2 h-2 rounded-full bg-primary/50 hidden lg:block" />
        <div>
          <h2 className="font-display font-black text-xl sm:text-2xl tracking-tight text-foreground">Actividad en tu Territorio</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Expediciones locales y de alto impacto cívico.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          {featured.length === 0 ? (
            <div className="md:col-span-3 rounded-3xl border border-dashed border-border p-10 text-center">
              <div className="text-4xl mb-3">🌱</div>
              <p className="text-sm text-muted-foreground font-medium">El territorio está cobrando vida.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Sé el primero en crear una iniciativa en tu distrito.</p>
              <Link to="/app/mapa" className="inline-flex items-center gap-2 mt-4 text-xs font-black uppercase tracking-wider text-primary hover:underline">
                Explorar el mapa <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : featured.map((m, i) => {
            const meta = REGION_META[m.region as Region] || REGION_META.costa;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link
                  to="/app/mision/$missionId"
                  params={{ missionId: m.id }}
                  className="group block rounded-3xl bg-card border border-border/80 overflow-hidden hover:shadow-lift transition-all duration-300"
                >
                  <div className={`h-36 ${meta.gradient} relative grid place-items-center text-5xl`}>
                    <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
                    <span className="select-none filter drop-shadow-sm">{m.emoji}</span>
                    <span className="absolute top-3 left-3 text-[8px] uppercase tracking-widest font-extrabold text-white bg-black/35 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
                      {meta.name}
                    </span>
                    <span className="absolute top-3 right-3 text-xs font-black text-white bg-black/45 backdrop-blur px-2.5 py-1 rounded-full border border-white/10">
                      +{m.xp} XP
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground font-semibold">
                        <MapPin className="h-3.5 w-3.5 text-primary/75" /> {m.district}
                      </div>
                      {renderEntityTypeBadge(m)}
                    </div>
                    <div className="font-display font-bold text-base mt-2 group-hover:text-primary transition-colors line-clamp-1">
                      {m.title}
                    </div>
                    {renderCategoryMetadata(m.category)}
                    <div className="mt-4 flex items-center justify-between text-xs border-t border-border/40 pt-3">
                      <span className="text-muted-foreground/90 font-medium inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-emerald-500" /> {m.participants} participantes
                      </span>
                      <span className="font-bold text-primary">{m.spotsLeft} cupos libres</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Two columns: progress + community pulse */}
      <section className="grid lg:grid-cols-3 gap-6 relative">
        {/* Small connection dot */}
        <div className="absolute -left-4 top-8 w-2 h-2 rounded-full bg-emerald-500/50 hidden lg:block" />
        {/* Progression Mini-Widget */}
        <div className="lg:col-span-2 rounded-3xl border border-border/80 bg-card p-6 shadow-sm overflow-hidden relative flex flex-col justify-between">
          <div className="absolute -right-12 -bottom-12 w-36 h-36 rounded-full bg-purple-500/5 blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mi Expedición KUSQA</span>
                <h3 className="font-display font-black text-2xl text-foreground mt-1.5 leading-none">
                  {currentStage.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-2">
                  Próxima parada: <strong className="text-foreground">{nextStage ? nextStage.name : "Cima cívica"}</strong>
                </p>
              </div>
              <div className="h-14 w-14 rounded-2xl bg-gradient-andes grid place-items-center text-3xl shadow-glow border border-white/10 shrink-0">
                ⛰️
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex justify-between text-xs font-semibold text-muted-foreground mb-2">
                <span>{currentUser?.xp?.toLocaleString() || "0"} XP</span>
                <span>{nextStage ? `${nextStage.xpFrom.toLocaleString()} XP` : "Máximo"}</span>
              </div>
              <div className="h-3 rounded-full bg-secondary overflow-hidden p-[1px] border border-border/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-sunrise rounded-full relative"
                >
                  <div className="absolute inset-0 shimmer" />
                </motion.div>
              </div>
              {nextStage && (
                <div className="mt-3 text-xs text-muted-foreground/80 font-medium">
                  Te faltan <span className="font-bold text-foreground">{(xpToNextStage).toLocaleString()} XP</span> para subir de tramo.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border/40 pt-4">
            {[
              { l: "Impacto", v: currentUser?.peopleImpacted ? `${currentUser.peopleImpacted}+` : "0", i: "❤️", textCol: "text-rose-500" },
              { l: "Territorios", v: activeDistricts > 0 ? `${activeDistricts} distrito${activeDistricts !== 1 ? "s" : ""}` : "—", i: "📍", textCol: "text-sky-500" },
              { l: "Expediciones", v: missions.length > 0 ? String(missions.length) : "—", i: "�", textCol: "text-purple-500" },
            ].map((s) => (
              <div key={s.l} className="rounded-xl bg-secondary/50 border border-border/20 p-2.5 text-center">
                <div className="text-base">{s.i}</div>
                <div className="font-display font-bold text-sm mt-1 text-foreground">{s.v}</div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Community Pulse Widget */}
        <div className="lg:col-span-1 bg-card rounded-3xl overflow-hidden shadow-sm">
          <CommunityPulse limit={2} showDetails={false} missions={allEntities} />
        </div>
      </section>

      {/* Activity Feed and Near Map */}
      <section className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Civic Activity Feed — derived from real missions */}
        <div className="lg:col-span-2 space-y-3 lg:space-y-4">
          <h2 className="font-display font-black text-lg lg:text-xl tracking-tight text-foreground flex items-center gap-2 pl-1">
            <Sparkles className="h-5 w-5 text-accent animate-pulse" /> Actividad en el Territorio
          </h2>
          <div className="rounded-3xl border border-border/80 bg-card overflow-hidden divide-y divide-border/60 shadow-sm">
            {feedItems.length > 0 ? (
              feedItems.map((item) => {
                const isMissionEntity = isMission(item);
                const isProposalEntity = isProposal(item);
                return (
                <div key={item.id} className="flex items-start gap-3 lg:gap-4 p-3 lg:p-4 hover:bg-secondary/30 transition-colors">
                  <div className="h-10 lg:h-11 w-10 lg:w-11 rounded-2xl bg-secondary grid place-items-center text-lg lg:text-xl shrink-0 border border-border/30">
                    {item.emoji || "🗺️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs lg:text-sm text-foreground flex flex-wrap items-center gap-1">
                      <span className="font-bold text-foreground/90 truncate">{item.title}</span>
                      {isProposalEntity && (
                        <span className="text-[7px] lg:text-[8px] font-bold px-1 lg:px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30 tracking-wide uppercase whitespace-nowrap">
                          Propuesta
                        </span>
                      )}
                      {isMissionEntity && (
                        <span className="text-[7px] lg:text-[8px] font-bold px-1 lg:px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 tracking-wide uppercase whitespace-nowrap">
                          Misión
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] lg:text-[10px] text-muted-foreground/80 mt-1 lg:mt-0.5 font-medium flex flex-wrap items-center gap-1">
                      <MapPin className="h-2.5 lg:h-3 w-2.5 lg:w-3 opacity-60" /> <span className="truncate">{item.district}</span>
                      <span className="opacity-45">•</span>
                      <span className="truncate">{formatRelativeDate(item.date)}</span>
                      {isMissionEntity && <><span className="opacity-45">•</span>
                      <Users className="h-2.5 lg:h-3 w-2.5 lg:w-3 opacity-60" /> <span className="truncate">{item.participants} activos</span></>}
                      {isProposalEntity && <><span className="opacity-45">•</span>
                      <span className="text-violet-600 dark:text-violet-400 truncate">Nueva</span></>}
                    </div>
                  </div>
                  <TrendingUp className="hidden sm:block h-3.5 lg:h-4 w-3.5 lg:w-4 text-muted-foreground/60 flex-shrink-0" />
                </div>
                );
              })
            ) : (
              <div className="p-8 text-center">
                <div className="text-3xl mb-3">🌱</div>
                <p className="text-sm text-muted-foreground font-medium">El territorio está cobrando vida.</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Explora el mapa para descubrir iniciativas activas.</p>
              </div>
            )}
          </div>
        </div>

        {/* Nearby Mini Slider */}
        <div className="lg:col-span-1 space-y-3 lg:space-y-4">
          <h2 className="font-display font-black text-lg lg:text-xl tracking-tight text-foreground flex items-center gap-2 pl-1">
            <Heart className="h-5 w-5 text-rose-500 animate-pulse" /> Cerca de ti
          </h2>
          <div className="space-y-2 lg:space-y-3">
            {nearby.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-4 lg:p-6 text-center">
                <div className="text-xl lg:text-2xl mb-2">🗺️</div>
                <p className="text-xs lg:text-sm text-muted-foreground font-medium">Explora el mapa para descubrir misiones en otros distritos.</p>
                <Link to="/app/mapa" className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-accent hover:underline">
                  Ver mapa <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ) : nearby.slice(0, 2).map((m) => (
              <Link
                key={m.id}
                to="/app/mision/$missionId"
                params={{ missionId: m.id }}
                className="block rounded-3xl bg-card border border-border/80 p-4 lg:p-5 hover:shadow-sm hover:border-border transition-all duration-300 group"
              >
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="h-10 lg:h-12 w-10 lg:w-12 rounded-2xl bg-gradient-coast grid place-items-center text-xl lg:text-2xl shrink-0 border border-white/5">
                    {m.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs lg:text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {m.title}
                    </div>
                    <div className="text-[10px] lg:text-xs text-stone-500 font-semibold mt-0.5 flex items-center gap-1 flex-wrap">
                      <span>{m.distanceKm} km</span>
                      <span className="opacity-45">•</span>
                      <span>{formatRelativeDate(m.date)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 lg:mt-3.5 flex items-center justify-between text-xs border-t border-border/40 pt-2 lg:pt-3 gap-2">
                  <span className="font-bold text-accent truncate">+{m.xp} XP</span>
                  <span className="text-muted-foreground/80 font-medium text-right truncate">{m.spotsLeft} cupos</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
    </>
  );
}
