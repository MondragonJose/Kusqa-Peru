/**
 * Onboarding minimal y elegante — 3 slides de bienvenida
 * Aparece primera vez después de login/signup
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Heart, BookOpen, ArrowRight } from "lucide-react";

const ONBOARDING_KEY = "kusqa_onboarding_completed";

const SLIDES = [
  {
    icon: MapPin,
    title: "Conecta con iniciativas juveniles",
    description: "Explora misiones en tu distrito y región. Forma parte de una red territorial en construcción.",
    gradient: "bg-gradient-sunrise",
  },
  {
    icon: Heart,
    title: "Participa y registra tu impacto",
    description: "Únete a misiones, completa objetivos y construye tu historial de participación.",
    gradient: "bg-gradient-sunrise",
  },
  {
    icon: BookOpen,
    title: "Tu recorrido territorial",
    description: "Tu perfil registra las misiones que completas. Tu participación deja huella en el mapa.",
    gradient: "bg-gradient-sunrise",
  },
];

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasCompleted = localStorage.getItem(ONBOARDING_KEY);
    if (!hasCompleted) {
      setIsVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setIsVisible(false);
    setTimeout(onComplete, 300);
  };

  if (!isVisible) return null;

  const currentSlide = SLIDES[currentIndex];
  const Icon = currentSlide.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md bg-card border border-border/60 rounded-3xl shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-sunrise grid place-items-center text-white font-bold text-sm">
              K
            </div>
            <span className="font-display font-bold text-sm">KUSQA</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Saltar
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 sm:p-6 text-center max-h-[60vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Icon */}
              <div className={`h-16 w-16 rounded-xl sm:h-20 sm:w-20 bg-gradient-sunrise grid place-items-center text-white text-4xl shadow-glow mx-auto`}>
                <Icon className="h-8 w-8 sm:h-10 sm:w-10" />
              </div>

              {/* Text */}
              <div className="space-y-2">
                <h2 className="font-display font-black text-lg sm:text-2xl tracking-tight text-foreground">
                  {currentSlide.title}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {currentSlide.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border/40">
          <div className="flex items-center justify-between gap-3">
            {/* Dots */}
            <div className="flex gap-1.5">
              {SLIDES.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    index === currentIndex ? "w-5 bg-foreground" : "w-1 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* Next button */}
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background text-xs font-semibold hover:bg-foreground/90 transition-colors"
            >
              {currentIndex === SLIDES.length - 1 ? "Comenzar" : "Siguiente"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
