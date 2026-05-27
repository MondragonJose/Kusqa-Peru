/**
 * MissionStoryModal — Cinematic Civic Story Overlay
 *
 * Transforms missions from generic task lists into living documentary archives.
 * Renders a vertical civic journey timeline, community voices, impact dashboards,
 * and future-ready image containers.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, MapPin, Sparkles, Users, Award, ShieldCheck, MessageSquare, ChevronDown, ChevronUp, Image as ImageIcon } from "lucide-react";
import { REGION_META } from "@/constants/gamification";
import { useMission } from "@/hooks/useMissions";
import type { Region } from "@/types";

interface MissionStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  missionId: string | null;
}

interface StoryTimelineNode {
  title: string;
  date: string;
  description: string;
  participants: string[];
  lessonsLearned: string;
  emotionalNote: string;
}

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
    bgLight: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-800/40"
  },
  selva: {
    gradient: "bg-gradient-jungle",
    text: "text-emerald-700 dark:text-emerald-400",
    bgLight: "bg-emerald-50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800/40"
  }
};

export function MissionStoryModal({ isOpen, onClose, missionId }: MissionStoryModalProps) {
  const [expandedNodeIndex, setExpandedNodeIndex] = useState<number | null>(null);
  const { data: mission, isLoading, isError, error } = useMission(missionId ?? "", {
    enabled: isOpen && !!missionId,
  });

  if (!isOpen || !missionId) return null;

  if (isLoading) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-md"
          />
          <p className="relative z-50 text-sm text-white font-medium">Cargando bitácora…</p>
        </div>
      </AnimatePresence>
    );
  }

  if (isError || !mission) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-md"
          />
          <p className="relative z-50 text-sm text-rose-200 font-medium max-w-sm text-center">
            {error instanceof Error ? error.message : "No se pudo cargar la bitácora."}
          </p>
        </div>
      </AnimatePresence>
    );
  }

  const meta = REGION_META[mission.region];
  const theme = REGION_THEMES[mission.region] || REGION_THEMES.sierra;

  // Static timeline milestones (narratives for completed / active missions)
  const timelineMilestones: StoryTimelineNode[] = [
    {
      title: "Convocatoria y Planificación Territorial",
      date: "Día 1 de la Expedición",
      description: "12 jóvenes y vecinos se reunieron en la plaza para trazar el mapa de necesidades locales, logrando consenso sobre el diseño final.",
      participants: ["Sayri Ccama", "Lucía Herrera", "Andrés Vega"],
      lessonsLearned: "Escuchar a los vecinos mayores antes de plantar nos enseñó cuáles especies resisten mejor las heladas locales.",
      emotionalNote: "Había mucha desconfianza al inicio, pero compartir pan y chicha de jora rompió el hielo."
    },
    {
      title: "Remoción de Desechos e Incisión Cívica",
      date: "Día 7 de la Expedición",
      description: "Se retiraron 40 sacos de desmontes y plásticos acumulados. Se niveló el terreno para preparar la siembra colectiva.",
      participants: ["Joaquín Ríos", "Camila Díaz", "Sayri Ccama"],
      lessonsLearned: "Nivelar sin herramientas pesadas toma el triple de tiempo, pero fortalece la resistencia física del equipo.",
      emotionalNote: "Dos niños del barrio trajeron sus palas de juguete para unirse a la nivelación. Nos llenó de esperanza."
    },
    {
      title: "Siembra y Reforestación Verde",
      date: "Día 15 de la Expedición",
      description: "Plantación exitosa de 80 plantones nativos (queñuales y molles), implementando un sistema de riego vecinal autogestionado.",
      participants: ["Sayri Ccama", "Andrés Vega", "Lucía Herrera"],
      lessonsLearned: "El suelo andino requiere abono profundo de compost local para soportar las raíces jóvenes.",
      emotionalNote: "Ver el primer queñual firme en la tierra limpia fue un momento de silencio y conexión profunda."
    },
    {
      title: "Inauguración y Registro de Huella",
      date: "Día 20 de la Expedición",
      description: "Se culminó el mural cívico que narra la expedición. Se firmó el pacto de cuidado y mantenimiento entre la comunidad y las brigadas.",
      participants: ["Sayri Ccama", "Lucía Herrera", "Joaquín Ríos", "Camila Díaz"],
      lessonsLearned: "El impacto no termina al plantar; la gobernanza barrial es la clave para la longevidad del proyecto.",
      emotionalNote: "Los vecinos lloraron al ver el mural. Sintieron que por fin el barrio cobraba vida."
    }
  ];

  const testimonials = [
    {
      quote: "Sentí que por primera vez mi barrio nos escuchaba. KUSQA nos unió para demostrar que la juventud puede sanar la tierra.",
      author: "Sayri Ccama",
      role: "Guardián de Cusco"
    },
    {
      quote: "No fue una tarde de voluntariado tradicional. Fue una convivencia que dejó una huella física y social en nuestra comunidad.",
      author: "Lucía Herrera",
      role: "Tejedora de Barranco"
    }
  ];

  const toggleExpandNode = (index: number) => {
    setExpandedNodeIndex(expandedNodeIndex === index ? null : index);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-40"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="relative w-full max-w-4xl bg-card border border-border/80 rounded-[2rem] overflow-hidden shadow-2xl z-50 my-8 flex flex-col focus:outline-none"
          >
            {/* Header Close button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 h-10 w-10 rounded-full bg-black/45 hover:bg-black/60 transition-colors flex items-center justify-center border border-white/10 text-white cursor-pointer z-20"
              aria-label="Cerrar historia"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Atmosphere Banner */}
            <div className={`h-56 sm:h-72 ${theme.gradient} relative text-white p-6 sm:p-10 flex flex-col justify-end overflow-hidden`}>
              <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent pointer-events-none" />
              
              <div className="relative z-10 space-y-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/15 text-[9px] uppercase font-black tracking-widest text-amber-200 border border-white/10">
                  {meta.name} · Bitácora Histórica
                </span>
                
                <h1 className="font-display font-black text-2xl sm:text-4xl tracking-tight leading-tight">
                  {mission.title}
                </h1>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-200/90 font-medium">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {mission.district}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {mission.date}</span>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="p-6 sm:p-10 grid lg:grid-cols-[1fr_320px] gap-8 max-h-[60vh] overflow-y-auto">
              
              {/* Left Column: Timeline & Testimonies */}
              <div className="space-y-8">
                
                {/* Lo que cambió después de esta misión (Reflection) */}
                <section className="space-y-3">
                  <h3 className="font-display font-black text-base text-foreground flex items-center gap-2">
                    <Sparkles className="h-4.5 w-4.5 text-accent" /> El Legado Territorial
                  </h3>
                  <div className="p-5 rounded-2xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/15 text-xs sm:text-sm leading-relaxed text-muted-foreground">
                    <strong className="text-foreground">Impacto duradero en {mission.district}:</strong> Las áreas verdes recuperadas han disminuido el desecho de basuras en un 60%, logrando que la plaza sea un punto de encuentro seguro para la niñez local. La comunidad conformó un comité de riego permanente de 6 familias voluntarias.
                  </div>
                </section>

                {/* Vertical Expedition Timeline */}
                <section className="space-y-4">
                  <h3 className="font-display font-black text-base text-foreground flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-primary" /> Hitos de la Expedición (Bitácora)
                  </h3>
                  
                  <div className="relative pl-6 border-l border-stone-300 dark:border-stone-850 ml-3 space-y-5">
                    {timelineMilestones.map((node, idx) => {
                      const isExpanded = expandedNodeIndex === idx;
                      return (
                        <div key={idx} className="relative">
                          {/* Timeline Dot */}
                          <div className={`absolute -left-[30px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-card ${theme.gradient} ring-4 ring-stone-100 dark:ring-stone-900`} />
                          
                          <div className="bg-secondary/35 border border-border/20 rounded-2xl p-4 transition-all">
                            <button
                              onClick={() => toggleExpandNode(idx)}
                              className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
                            >
                              <div>
                                <span className="text-[9px] uppercase font-black text-accent">{node.date}</span>
                                <h4 className="font-bold text-sm text-foreground leading-tight mt-0.5">{node.title}</h4>
                              </div>
                              {isExpanded ? <ChevronUp className="h-4 w-4 text-stone-500" /> : <ChevronDown className="h-4 w-4 text-stone-500" />}
                            </button>
                            
                            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                              {node.description}
                            </p>

                            {/* Expandable historical depth */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden mt-3 pt-3 border-t border-border/30 space-y-2.5 text-[11px] text-muted-foreground"
                                >
                                  <div>
                                    <span className="font-black text-foreground">Participaron:</span>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {node.participants.map((p) => (
                                        <span key={p} className="px-2 py-0.5 rounded-full bg-secondary text-foreground font-semibold">
                                          {p}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="font-black text-foreground">Lección Aprendida:</span>
                                    <p className="mt-0.5 leading-relaxed italic">"{node.lessonsLearned}"</p>
                                  </div>
                                  <div className="p-2 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 rounded-lg">
                                    <span className="font-black text-accent uppercase tracking-wider text-[8px]">Nota Emocional:</span>
                                    <p className="mt-0.5 leading-relaxed text-foreground/90 font-medium">"{node.emotionalNote}"</p>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Community Voices */}
                <section className="space-y-4">
                  <h3 className="font-display font-black text-base text-foreground flex items-center gap-2">
                    <MessageSquare className="h-4.5 w-4.5 text-rose-500" /> Voces del Territorio
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {testimonials.map((t, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-card border border-border/80 text-xs italic leading-relaxed text-muted-foreground space-y-2">
                        <p>"{t.quote}"</p>
                        <div className="text-[10px] not-italic font-black text-foreground flex justify-between">
                          <span>{t.author}</span>
                          <span className="text-accent">{t.role}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

              </div>

              {/* Right Column: Impact Stats & Future Images placeholders */}
              <div className="space-y-6">
                
                {/* Impact Summary Dashboard */}
                <div className="p-5 rounded-3xl bg-secondary/55 border border-border/20 space-y-4">
                  <h3 className="text-xs uppercase font-black text-stone-400 tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> Rendimiento Verificado
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 bg-card rounded-2xl border border-border/10">
                      <div className="font-display font-black text-xl text-foreground">120 h</div>
                      <div className="text-[7px] uppercase tracking-wider text-muted-foreground mt-0.5 font-bold">horas cívicas</div>
                    </div>
                    <div className="p-3 bg-card rounded-2xl border border-border/10">
                      <div className="font-display font-black text-xl text-foreground">500+</div>
                      <div className="text-[7px] uppercase tracking-wider text-muted-foreground mt-0.5 font-bold">alcanzados</div>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-border/40 text-xs">
                    <div className="flex justify-between font-medium">
                      <span className="text-muted-foreground">Insignia otorgada</span>
                      <span className="font-bold text-accent inline-flex items-center gap-1">
                        <Award className="h-3.5 w-3.5" /> Guardián Verde
                      </span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-muted-foreground">Energía Cívica</span>
                      <span className="font-bold text-foreground">+{mission.xp} XP</span>
                    </div>
                  </div>
                </div>

                {/* Future Image Support Preparation */}
                <div className="p-5 rounded-3xl bg-card border border-border/80 space-y-3">
                  <h3 className="text-xs uppercase font-black text-stone-400 tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-sky-500" /> Galería de la Bitácora
                  </h3>
                  
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    Evidencias visuales de la siembra cívica. Listo para integración futura con Supabase Storage.
                  </p>

                  {/* Photos Grid Placeholders */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {[
                      { l: "Siembra inicial", em: "🌱" },
                      { l: "Nivelando suelo", em: "⛏️" },
                      { l: "Mural vecinal", em: "🎨" },
                      { l: "Cierre grupal", em: "🤝" }
                    ].map((img, idx) => (
                      <div key={idx} className="h-20 bg-secondary/80 hover:bg-secondary border border-border/20 rounded-xl flex flex-col items-center justify-center text-center p-1.5 transition-colors group cursor-not-allowed">
                        <span className="text-xl group-hover:scale-110 transition-transform duration-200 select-none">{img.em}</span>
                        <span className="text-[7px] font-black uppercase text-stone-400 mt-1 truncate max-w-full leading-none">{img.l}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
