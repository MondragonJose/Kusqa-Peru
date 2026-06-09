/**
 * CivicFeed — Full civic notifications feed
 *
 * Header communicates territorial presence ("El territorio habla...").
 * Filter tabs use regional and civic language, not system categories.
 */

import { useState } from "react";
import { Check, Settings2, Radio, BellRing, Sparkles } from "lucide-react";
import { NotificationItem } from "./NotificationItem";
import type { CivicNotification, CivicNotificationType } from "../types";
import { NOTIFICATION_TYPE_LABELS } from "../types";

interface CivicFeedProps {
  notifications: CivicNotification[];
  userDistrict?: string;
  /**
   * Phase 4B.6: per-item mark-as-read. Called when the user clicks
   * a single row. Parent is responsible for firing the mutation and
   * reconciling the cache.
   */
  onMarkRead?: (notificationId: string) => void;
  /**
   * Phase 4B.6: bulk mark-all-read. Called when the user clicks the
   * "Marcar como leídas" button. Parent must persist via the
   * repository.
   */
  onMarkAllRead?: () => void;
}

type FilterTab = "todas" | CivicNotificationType;

const FILTER_TABS: Array<{ key: FilterTab; label: string }> = [
  { key: "todas", label: "Todo el latido" },
  { key: "presencia", label: "Presencia" },
  { key: "misión", label: "Misiones" },
  { key: "comunidad", label: "Comunidad" },
  { key: "cívica", label: "Exploradores" },
  { key: "insignia", label: "Insignias" },
];

export function CivicFeed({
  notifications: initialNotifications,
  userDistrict,
  onMarkRead,
  onMarkAllRead,
}: CivicFeedProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("todas");
  const [notifications, setNotifications] = useState<CivicNotification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    if (onMarkAllRead) {
      onMarkAllRead();
    } else {
      // Fallback: optimistic local-only update so the badge decrements.
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleMarkOne = (id: string) => {
    if (onMarkRead) {
      onMarkRead(id);
    } else {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }
  };

  const filtered =
    activeTab === "todas" ? notifications : notifications.filter((n) => n.type === activeTab);

  return (
    <div className="space-y-6">
      {/* Living header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-accent flex items-center gap-1.5 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Señales del Territorio
          </span>
          <h1 className="font-display font-black text-3xl md:text-4xl tracking-tight text-foreground">
            Latido Territorial
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent" />
                </span>
                {unreadCount} nuevas huellas
              </span>
            )}
            <span className="text-xs text-muted-foreground font-semibold">
              {userDistrict
                ? `El territorio habla: Hay movimiento activo en ${userDistrict}`
                : "Tu red comunitaria está respirando"}
            </span>
          </div>
        </div>

        <div className="flex gap-2 self-start sm:self-end">
          {unreadCount > 0 && (
            <button
              id="mark-all-read-btn"
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3.5 py-2.5 text-xs font-bold hover:bg-secondary transition-smooth cursor-pointer"
            >
              <Check className="h-4 w-4" /> Marcar como leídas
            </button>
          )}
          <button
            id="notification-settings-btn"
            disabled
            className="h-10 w-10 rounded-xl border border-border grid place-items-center hover:bg-secondary transition-smooth cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Ajustes de alertas (próximamente)"
          >
            <Settings2 className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Live activity indicator */}
      <div className="rounded-3xl bg-accent/5 border border-accent/15 p-5 flex items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-sunrise opacity-10 blur-2xl rounded-full pointer-events-none" />

        <div className="h-10 w-10 rounded-2xl bg-accent/10 grid place-items-center shrink-0">
          <Radio className="h-4 w-4 text-accent animate-breathe" />
        </div>
        <div>
          <div className="text-xs sm:text-sm font-black text-foreground">
            Canal de Presencia en Vivo
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium leading-relaxed">
            Señales en tiempo aproximado captadas por brigadas en tu región. Explora misiones
            cercanas para sumarte.
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 pt-1 no-scrollbar border-b border-border/40">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.key === "todas"
              ? 0
              : notifications.filter((n) => n.type === tab.key && !n.read).length;
          return (
            <button
              key={tab.key}
              id={`notif-filter-${tab.key}`}
              onClick={() => setActiveTab(tab.key)}
              className={`
                px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all duration-200 cursor-pointer flex items-center gap-1.5
                ${
                  activeTab === tab.key
                    ? "bg-foreground text-background border-foreground shadow-sm scale-102"
                    : "bg-surface border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`h-1.5 w-1.5 rounded-full ${activeTab === tab.key ? "bg-background" : "bg-accent"}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications list */}
      <div className="space-y-3">
        {filtered.map((n, i) => (
          <NotificationItem
            key={n.id}
            notification={n}
            index={i}
            onRead={onMarkRead ? handleMarkOne : undefined}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm rounded-3xl bg-secondary/20 border border-dashed border-border/60">
          <BellRing className="h-8 w-8 mx-auto mb-3 text-muted-foreground/45" />
          Tu territorio está tranquilo por ahora. Pronto habrá nuevas señales de actividad
          comunitaria.
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground/60 py-6 font-semibold select-none">
        El sendero está despejado · sigue caminando con paso firme 🚶‍♀️
      </div>
    </div>
  );
}
