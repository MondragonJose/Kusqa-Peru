import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { NOTIFICATIONS } from "@/data/kusqa";
import { Check, Settings2 } from "lucide-react";

export const Route = createFileRoute("/app/notificaciones")({
  component: Notifications,
});

const TYPE_COLORS: Record<string, string> = {
  badge: "bg-gradient-sunrise",
  mission: "bg-gradient-coast",
  level: "bg-gradient-andes",
  community: "bg-gradient-jungle",
  social: "bg-accent",
};

function Notifications() {
  const unread = NOTIFICATIONS.filter((n) => !n.read).length;
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display font-bold text-3xl">Notificaciones</h1>
          <p className="text-sm text-muted-foreground">{unread} nuevas · Tu comunidad está activa.</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary transition-smooth">
            <Check className="h-4 w-4" /> Marcar leídas
          </button>
          <button className="h-9 w-9 rounded-xl border border-border grid place-items-center hover:bg-secondary transition-smooth">
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {["Todas", "Misiones", "Insignias", "Comunidad", "Social"].map((t, i) => (
          <button
            key={t}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-smooth ${
              i === 0 ? "bg-foreground text-background border-foreground" : "bg-surface border-border hover:bg-secondary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {NOTIFICATIONS.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`group rounded-2xl border p-4 flex gap-4 transition-smooth hover:shadow-card cursor-pointer ${
              !n.read
                ? "bg-card border-accent/30 shadow-soft"
                : "bg-card/60 border-border/60"
            }`}
          >
            <div className={`h-12 w-12 rounded-2xl ${TYPE_COLORS[n.type]} grid place-items-center text-xl shadow-soft shrink-0`}>
              {n.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-semibold">{n.title}</div>
                {!n.read && <span className="h-2 w-2 rounded-full bg-accent" />}
              </div>
              <div className="text-sm text-muted-foreground">{n.body}</div>
              <div className="text-xs text-muted-foreground mt-1">{n.timestamp}</div>
            </div>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg px-3 py-1.5 text-xs font-semibold bg-secondary hover:bg-foreground hover:text-background self-center">
              Ver
            </button>
          </motion.div>
        ))}
      </div>

      <div className="text-center text-xs text-muted-foreground py-4">
        Eso es todo por ahora · sigue caminando 🚶‍♀️
      </div>
    </div>
  );
}
