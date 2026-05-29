import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useCallback, useState } from "react";

interface CrossingOverlayProps {
  open: boolean;
  gradient: string;
  emoji: string;
  avatar: string;
  onComplete: () => void;
  /** When true, prevents auto-dismiss — used while mutation is in flight */
  hold?: boolean;
}

export function CrossingOverlay({ open, gradient, emoji, avatar, onComplete, hold = false }: CrossingOverlayProps) {
  const prefersReducedMotion = useReducedMotion();
  const [canDismiss, setCanDismiss] = useState(false);
  const completedRef = useRef(false);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const complete = useCallback(() => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [onComplete]);

  useEffect(() => {
    if (open) {
      completedRef.current = false;
      setCanDismiss(false);
      const dismissTimer = setTimeout(() => setCanDismiss(true), 900);
      // Only start the 2500ms auto-dismiss if not held
      if (!hold) {
        autoTimerRef.current = setTimeout(complete, 2500);
      }
      return () => {
        clearTimeout(dismissTimer);
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
      };
    } else {
      setCanDismiss(false);
    }
  }, [open, complete, hold]);

  // When hold is released (mutation resolved), start the auto-dismiss timer
  useEffect(() => {
    if (open && !hold && !completedRef.current) {
      autoTimerRef.current = setTimeout(complete, 1200);
    }
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, [open, hold, complete]);

  const handleDismiss = () => {
    if (canDismiss) complete();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && canDismiss) complete();
  };

  if (prefersReducedMotion) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            key="crossing-reduced"
            role="dialog"
            aria-modal="true"
            aria-label="Tu ruta comienza aquí."
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 overflow-hidden"
            onClick={handleDismiss}
            onKeyDown={handleKeyDown}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-black/30" />
              <div className={`absolute inset-0 ${gradient}`}>
                <div className="absolute inset-0 bg-mesh opacity-30" />
              </div>
              <div className="relative flex flex-col items-center justify-start h-full pt-[18%] sm:pt-[20%] landscape:pt-[8%] px-8">
                <span aria-hidden="true" className="text-5xl sm:text-7xl filter drop-shadow-lg mb-8">{emoji}</span>
                <div aria-hidden="true" className="h-20 sm:h-16 w-px bg-gradient-to-b from-white/40 to-white/5 mb-8" />
                <div aria-hidden="true" className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur border border-white/20 grid place-items-center text-3xl shadow-lg mb-6">
                  {avatar}
                </div>
                <p className="text-white/90 text-lg font-display font-bold tracking-tight text-center">
                  Tu ruta comienza aquí.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="crossing"
          role="dialog"
          aria-modal="true"
          aria-label="Tu ruta comienza aquí."
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 overflow-hidden"
          onClick={handleDismiss}
          onKeyDown={handleKeyDown}
        >
          <div className="absolute inset-0">
            {/* Backdrop — lighter so previous screen stays visible beneath */}
            <motion.div
              className="absolute inset-0 bg-black/30"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            />

            {/* Spatial depth gradient — darker at top, transparent at bottom */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            />

            {/* Gradient rising from bottom — terrain establishes place first */}
            <motion.div
              className={`absolute inset-0 ${gradient}`}
              initial={{ clipPath: "inset(100% 0 0 0)" }}
              animate={{ clipPath: "inset(0% 0 0 0)" }}
              transition={{ duration: 0.8, ease: [0.35, 0.05, 0.25, 1] }}
            >
              <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
            </motion.div>
          </div>

          {/* HAPTIC ANCHOR: safest lifecycle moment is when the terrain gradient has
              completed its rise (0.8s) AND the mutation has resolved successfully.
              At ~0.7-0.9s after open, the user has seen the backdrop, the terrain is
              nearly fully established, and the avatar is about to appear.
              One short grounded pulse. NOT on click, NOT on mutation start.
              Constraint: max 1 pulse, never on error, respect system haptic setting. */}

          {/* Content — shifted down to feel spatial, not centered dialog */}
          <div className="relative flex flex-col items-center justify-start h-full pt-[18%] sm:pt-[20%] landscape:pt-[8%] px-8">
            {/* Emoji — elevated, the calling */}
            <motion.span
              aria-hidden="true"
              className="text-5xl sm:text-7xl filter drop-shadow-lg mb-8"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 1.3, ease: "easeOut" }}
            >
              {emoji}
            </motion.span>

            {/* Trail line — draws from bottom to top, after avatar is grounded */}
            <motion.div
              aria-hidden="true"
              className="h-20 sm:h-16 w-px bg-gradient-to-b from-white/40 to-white/5 mb-8"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, delay: 1.05, ease: "easeOut" }}
              style={{ transformOrigin: "bottom" }}
            />

            {/* Avatar — grounded, appears after terrain is established */}
            <motion.div
              aria-hidden="true"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.7, ease: "easeOut" }}
              className="mb-6"
            >
              <div className="h-14 w-14 rounded-2xl bg-white/15 backdrop-blur border border-white/20 grid place-items-center text-3xl shadow-lg">
                {avatar}
              </div>
            </motion.div>

            {/* Text — arrives only after the entire spatial composition is clear */}
            <motion.p
              className="text-white/90 text-lg sm:text-xl font-display font-bold tracking-tight text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 1.6, ease: "easeOut" }}
            >
              Tu ruta comienza aquí.
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
