import type { InitiativeLifecycle } from "./initiative";

/**
 * Visual semantics for each InitiativeLifecycle state.
 * Pure mapping — no side effects, no React, no Leaflet.
 * Applied as an additive layer on top of existing mission/proposal marker styling.
 */
export interface LifecyclePresentation {
  /**
   * CSS classes for the marker container (border, ring, opacity, filter).
   * Added on top of existing base shape (rounded-full for missions, rounded-xl for proposals).
   */
  containerClass: string;
  /** CSS opacity (0–1). Applied to the marker wrapper. */
  opacity: number;
  /**
   * CSS animation class or null.
   * Examples: "animate-pulse", "animate-float-slow", null.
   */
  animationClass: string | null;
  /**
   * Emoji badge overlay shown instead of the entity emoji.
   * null means use the entity's own emoji.
   */
  badge: string | null;
  /** Primary CTA button text in the popup. */
  ctaLabel: string;
  /** Secondary tone text shown below the title in the popup. */
  tooltipTone: string;
  /** If true, the marker should not be rendered at all. */
  isHidden: boolean;
}

export function getLifecyclePresentation(lifecycle: InitiativeLifecycle): LifecyclePresentation {
  switch (lifecycle) {
    case "forming":
      return {
        containerClass: "ring-2 ring-violet-400/40 border-dashed",
        opacity: 0.85,
        animationClass: "animate-float-slow",
        badge: "🌱",
        ctaLabel: "Apoyar",
        tooltipTone: "En sus primeros pasos",
        isHidden: false,
      };
    case "active":
      return {
        containerClass: "ring-2 ring-accent/30 shadow-glow",
        opacity: 1,
        animationClass: null,
        badge: null,
        ctaLabel: "Unirme",
        tooltipTone: "Ocurriendo ahora",
        isHidden: false,
      };
    case "gathering":
      return {
        containerClass: "ring-1 ring-amber-400/40",
        opacity: 0.9,
        animationClass: "animate-pulse",
        badge: "⏳",
        ctaLabel: "Participar",
        tooltipTone: "Reuniendo equipo",
        isHidden: false,
      };
    case "completed":
      return {
        containerClass: "opacity-60 grayscale-[30%]",
        opacity: 0.6,
        animationClass: null,
        badge: "✅",
        ctaLabel: "Ver resultados",
        tooltipTone: "Ruta completada",
        isHidden: false,
      };
    case "archived":
      return {
        containerClass: "opacity-60 grayscale-[30%]",
        opacity: 0.6,
        animationClass: null,
        badge: "🗄️",
        ctaLabel: "Ver",
        tooltipTone: "Archivada",
        isHidden: false,
      };
    case "dormant":
      return {
        containerClass: "hidden",
        opacity: 0,
        animationClass: null,
        badge: null,
        ctaLabel: "",
        tooltipTone: "",
        isHidden: true,
      };
  }
}
