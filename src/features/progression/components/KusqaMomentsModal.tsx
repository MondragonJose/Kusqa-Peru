/**
 * KusqaMomentsModal — KUSQA Moments Cinematic Layer
 *
 * Spotify Wrapped-style milestone celebrations.
 * Used when a user levels up, completes a landmark mission,
 * or unlocks a rare civic badge.
 *
 * Implements a premium, warm overlay with mesh gradients,
 * high-contrast Peruvian regional typography, and emotional hooks.
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, Share2, Sparkles, Trophy, Download } from "lucide-react";
import { useEffect } from "react";

export type KusqaMomentType = "level" | "badge" | "mission" | "trust";

export interface KusqaMomentData {
  type: KusqaMomentType;
  title: string;
  subtitle: string;
  icon: string | React.ReactNode;
  message: string;
  gradientClass: string; // e.g., "bg-gradient-andes" or "bg-gradient-cumbre"
  regionLabel?: string;  // e.g., "Sierra", "Costa", "Selva"
  detailLabel?: string;  // e.g., "+350 XP", "Guardián del Valle"
}

interface KusqaMomentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  moment: KusqaMomentData | null;
}

export function KusqaMomentsModal({ isOpen, onClose, moment }: KusqaMomentsModalProps) {
  // Prevent body scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!moment) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          {/* Backdrop blurring the background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/85 backdrop-blur-md"
          />

          {/* Cinematic Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className={`
              relative w-full max-w-lg md:max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10
              ${moment.gradientClass} text-white flex flex-col items-center justify-between
              min-h-[480px] md:min-h-[560px] p-8 md:p-12
            `}
          >
            {/* Mesh pattern overlay */}
            <div className="absolute inset-0 bg-mesh opacity-30 mix-blend-overlay pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />

            {/* Top Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center border border-white/5 cursor-pointer z-10"
              aria-label="Cerrar celebración"
            >
              <X className="h-5 w-5 text-white" />
            </button>

            {/* Header / Subtitle */}
            <div className="text-center z-10 mt-4">
              <motion.span
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[10px] uppercase font-bold tracking-widest text-amber-100"
              >
                <Sparkles className="h-3 w-3 animate-spin-slow" /> Hito del territorio
              </motion.span>
              <motion.h3
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display font-black text-2xl md:text-3xl tracking-tight mt-3 text-stone-100"
              >
                {moment.subtitle}
              </motion.h3>
            </div>

            {/* Main Interactive Center Graphic */}
            <div className="relative my-8 flex flex-col items-center justify-center z-10">
              {/* Spinning/pulsing aura rings */}
              <div className="absolute h-40 w-40 rounded-full border-2 border-dashed border-white/10 animate-spin-slow scale-110" />
              <div className="absolute h-40 w-40 rounded-full border border-white/20 animate-pulse-ring" />

              <motion.div
                initial={{ scale: 0.7, rotate: -15, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 15, delay: 0.25 }}
                className="h-28 w-28 md:h-32 md:w-32 rounded-[2rem] bg-white/95 text-stone-900 shadow-lift flex items-center justify-center text-5xl md:text-6xl border-4 border-white/20"
              >
                {typeof moment.icon === "string" ? (
                  <span className="select-none filter drop-shadow-sm">{moment.icon}</span>
                ) : (
                  moment.icon
                )}
              </motion.div>

              {/* Dynamic tag overlaying bottom edge of icon */}
              {moment.detailLabel && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="absolute -bottom-2 bg-amber-400 text-stone-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md border-2 border-white"
                >
                  {moment.detailLabel}
                </motion.div>
              )}
            </div>

            {/* Title & Message */}
            <div className="text-center max-w-xs md:max-w-sm z-10 mb-6">
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="font-display font-black text-3xl md:text-4xl tracking-tight text-white mb-2 leading-none"
              >
                {moment.title}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-sm text-stone-100/90 leading-relaxed font-medium"
              >
                {moment.message}
              </motion.p>
            </div>

            {/* Bottom Actions */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex gap-3 w-full max-w-xs sm:max-w-sm justify-center z-10"
            >
              <button
                onClick={() => {
                  alert("Guardado en tu dispositivo cívico 📱");
                }}
                className="flex-1 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 transition-all text-xs font-bold py-3.5 flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
              >
                <Download className="h-4 w-4" /> Guardar
              </button>
              <button
                onClick={() => {
                  alert("Copiado al portapapeles. ¡Comparte tu camino cívico!");
                }}
                className="flex-1 rounded-2xl bg-white text-stone-950 hover:bg-stone-100 active:scale-95 transition-all text-xs font-black py-3.5 flex items-center justify-center gap-2 shadow-soft cursor-pointer"
              >
                <Share2 className="h-4 w-4 text-stone-950" /> Compartir
              </button>
            </motion.div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
