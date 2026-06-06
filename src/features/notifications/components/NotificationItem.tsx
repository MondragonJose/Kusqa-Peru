/**
 * NotificationItem — Single civic notification
 *
 * Feels like a message from a neighbor, not a system alert.
 * Uses warm styling, borders, and responsive territorial chips.
 */

import { motion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import type { CivicNotification } from "../types";
import { NOTIFICATION_TYPE_GRADIENT } from "../types";

interface NotificationItemProps {
  notification: CivicNotification;
  index?: number;
}

export function NotificationItem({ notification: n, index = 0 }: NotificationItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
      className={`
        group rounded-2xl border p-4 flex gap-4 transition-all duration-355 cursor-pointer relative overflow-hidden
        ${
          !n.read
            ? "bg-card border-accent/20 shadow-soft hover:border-accent/40 hover:shadow-card"
            : "bg-card/50 border-border/40 hover:bg-card hover:border-stone-300 dark:hover:border-stone-700"
        }
      `}
    >
      {/* Light glow stripe for unread notifications */}
      {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-sunrise" />}

      {/* Icon Container with Warm Gradients */}
      <div
        className={`h-12 w-12 rounded-2xl ${NOTIFICATION_TYPE_GRADIENT[n.type]} text-white grid place-items-center text-xl shadow-soft shrink-0 transition-transform group-hover:scale-105 duration-300`}
      >
        <span className="select-none filter drop-shadow-sm">{n.emoji}</span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`font-bold text-sm ${n.read ? "text-foreground/80" : "text-foreground font-black"}`}
          >
            {n.title}
          </span>
          {!n.read && <span className="h-2 w-2 rounded-full bg-accent animate-pulse shrink-0" />}
        </div>

        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed font-medium">
          {n.body}
        </p>

        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="text-[10px] font-semibold text-muted-foreground/60 tracking-wider">
            {n.timestamp}
          </span>
          {n.district && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent/80">
              <MapPin className="h-3 w-3 text-accent" />
              {n.district}
            </span>
          )}
        </div>
      </div>

      {/* Action hint button */}
      <button className="opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300 rounded-xl px-3.5 py-2 text-[10px] font-black uppercase tracking-wider bg-foreground text-background hover:bg-accent hover:text-white flex items-center gap-1 self-center shrink-0 shadow-sm">
        Explorar <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
