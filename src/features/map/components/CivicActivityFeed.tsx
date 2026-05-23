import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Users, Award, ShieldAlert } from "lucide-react";

type ActivityEvent = {
  id: string;
  user: string;
  avatar: string;
  type: "join" | "evidence" | "badge" | "level";
  action: string;
  time: string;
  xp: number;
  district: string;
};

const INITIAL_EVENTS: ActivityEvent[] = [
  {
    id: "e1",
    user: "Sayri Quispe",
    avatar: "🏔️",
    type: "join",
    action: "se unió a Reforestación en Chinchero",
    time: "Hace 1 min",
    xp: 150,
    district: "Chinchero, Cusco",
  },
  {
    id: "e2",
    user: "Mateo Silva",
    avatar: "🌊",
    type: "evidence",
    action: "subió evidencia de limpieza de playa",
    time: "Hace 4 min",
    xp: 350,
    district: "Huanchaco, Trujillo",
  },
  {
    id: "e3",
    user: "Sofía Huamán",
    avatar: "🌿",
    type: "badge",
    action: "desbloqueó la insignia 'Sembrador'",
    time: "Hace 7 min",
    xp: 200,
    district: "Cusco",
  },
  {
    id: "e4",
    user: "Carlos Rivas",
    avatar: "💻",
    type: "level",
    action: "subió a Nivel 5: Explorador de Selva",
    time: "Hace 12 min",
    xp: 500,
    district: "Iquitos, Loreto",
  },
];

const NAMES = ["Sayri", "Mateo", "Sofía", "Carlos", "Renzo", "Luciana", "Yamilé", "Killa", "Thiago", "Andrea", "Diego", "Jimena"];
const AVATARS = ["🦊", "🦦", "🦉", "🦙", "🎨", "🌿", "🌊", "🛶", "💻", "⛰️", "🍲"];
const DISTRICTS = [
  { name: "Barranco, Lima", region: "costa" },
  { name: "Miraflores, Lima", region: "costa" },
  { name: "Chinchero, Cusco", region: "sierra" },
  { name: "Alto Trujillo, Trujillo", region: "costa" },
  { name: "Iquitos, Loreto", region: "selva" },
  { name: "Puno Centro, Puno", region: "sierra" },
  { name: "Yanahuara, Arequipa", region: "sierra" },
];
const ACTIONS = [
  { text: "se unió a la misión Mural Colectivo", xp: 120, type: "join" },
  { text: "subió fotos de impacto comunitario", xp: 300, type: "evidence" },
  { text: "completó el reto de reforestación", xp: 450, type: "join" },
  { text: "desbloqueó la insignia 'Primer Paso'", xp: 100, type: "badge" },
  { text: "subió a Nivel 3: Vecino Activo", xp: 400, type: "level" },
  { text: "reportó una nueva idea para su barrio", xp: 150, type: "join" },
  { text: "retiró 15kg de basura del río", xp: 350, type: "evidence" },
];

export function CivicActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>(INITIAL_EVENTS);
  const [activeUsers, setActiveUsers] = useState(48);

  useEffect(() => {
    // Simula variación en usuarios activos
    const userInterval = setInterval(() => {
      setActiveUsers((prev) => {
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        return Math.max(30, Math.min(85, prev + change));
      });
    }, 6000);

    // Simula la llegada de eventos en tiempo real
    const eventInterval = setInterval(() => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
      const districtObj = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
      const actionObj = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];

      const newEvent: ActivityEvent = {
        id: `event-${Date.now()}`,
        user: name,
        avatar,
        type: actionObj.type as any,
        action: actionObj.text,
        time: "Hace unos instantes",
        xp: actionObj.xp,
        district: districtObj.name,
      };

      setEvents((prev) => [newEvent, ...prev.slice(0, 5)]);
    }, 12000);

    return () => {
      clearInterval(userInterval);
      clearInterval(eventInterval);
    };
  }, []);

  return (
    <div className="glass-strong rounded-3xl p-5 border border-border/40 shadow-soft h-full flex flex-col justify-between">
      <div>
        {/* Title / Active counter */}
        <div className="flex items-center justify-between border-b border-border/20 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="font-display font-bold text-sm text-foreground">Actividad en Vivo</h3>
          </div>
          <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-full flex items-center gap-1">
            <Users className="h-3 w-3" />
            {activeUsers} activos
          </span>
        </div>

        {/* Dynamic Activity List */}
        <div className="space-y-3.5 max-h-[400px] overflow-hidden pr-1">
          <AnimatePresence initial={false}>
            {events.map((e) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -10, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 10, height: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
                className="flex items-start gap-3 text-xs border-b border-border/10 pb-2.5 last:border-b-0"
              >
                <div className="text-xl h-8 w-8 rounded-full bg-secondary flex items-center justify-center shrink-0 shadow-sm select-none">
                  {e.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-1 leading-snug">
                    <span className="font-bold text-foreground hover:underline cursor-pointer">{e.user}</span>
                    <span className="text-muted-foreground">{e.action}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span className="font-semibold text-accent/80">{e.district}</span>
                    <span>·</span>
                    <span>{e.time}</span>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded shadow-sm shrink-0">
                  +{e.xp} XP
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border/10 flex items-center gap-2.5 text-[11px] text-muted-foreground">
        <Award className="h-4 w-4 text-accent shrink-0" />
        <span>Los líderes Kusqa de tu zona están sumando impacto real hoy.</span>
      </div>
    </div>
  );
}
