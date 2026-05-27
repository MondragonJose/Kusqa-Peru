/**
 * KUSQA Design System - Lightweight
 * 
 * Tokens simples y convenciones claras para consistencia visual.
 * NO es un sistema enterprise complejo, solo decisiones visuales coherentes.
 */

// ============================================
// SPACING TOKENS
// ============================================
export const spacing = {
  xs: "0.5rem",  // 8px
  sm: "0.75rem", // 12px
  md: "1rem",    // 16px
  lg: "1.5rem",  // 24px
  xl: "2rem",    // 32px
  "2xl": "3rem", // 48px
  "3xl": "4rem", // 64px
} as const;

// Gap tokens (para flex/grid)
export const gap = {
  xs: "gap-2",   // 8px
  sm: "gap-3",   // 12px
  md: "gap-4",   // 16px
  lg: "gap-6",   // 24px
  xl: "gap-8",   // 32px
  "2xl": "gap-12", // 48px
} as const;

// Padding tokens
export const padding = {
  xs: "p-2",   // 8px
  sm: "p-3",   // 12px
  md: "p-4",   // 16px
  lg: "p-5",   // 20px
  xl: "p-6",   // 24px
  "2xl": "p-8", // 32px
} as const;

// ============================================
// RADIUS TOKENS
// ============================================
export const radius = {
  sm: "rounded-lg",    // 8px
  md: "rounded-xl",    // 12px
  lg: "rounded-2xl",   // 16px
  xl: "rounded-3xl",   // 24px
  full: "rounded-full", // 9999px
} as const;

// ============================================
// ICON SIZE TOKENS
// ============================================
export const iconSize = {
  xs: "h-3 w-3",     // 12px
  sm: "h-3.5 w-3.5", // 14px
  md: "h-4 w-4",     // 16px
  lg: "h-5 w-5",     // 20px
  xl: "h-6 w-6",     // 24px
} as const;

// ============================================
// SHADOW TOKENS
// ============================================
// Ya definidos en styles.css como CSS variables
export const shadow = {
  soft: "shadow-soft",
  card: "shadow-card",
  glow: "shadow-glow",
} as const;

// ============================================
// HOVER STATE TOKENS
// ============================================
export const hover = {
  // Botones principales
  primary: "hover:scale-[1.02] hover:shadow-lg active:scale-95 transition-all duration-200",
  // Botones secundarios
  secondary: "hover:bg-white/20 hover:shadow-md active:scale-95 transition-all duration-200",
  // Links
  link: "hover:text-foreground transition-colors",
  // Cards
  card: "hover:shadow-lift transition-smooth",
} as const;

// ============================================
// TYPOGRAPHY HIERARCHY
// ============================================
export const typography = {
  // Display fonts (ya definidos en styles.css)
  display: "font-display",
  
  // Weights
  weight: {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
    black: "font-black",
  } as const,
  
  // Sizes
  size: {
    xs: "text-xs",      // 12px
    sm: "text-sm",      // 14px
    base: "text-base",  // 16px
    lg: "text-lg",      // 18px
    xl: "text-xl",      // 20px
    "2xl": "text-2xl",  // 24px
    "3xl": "text-3xl",  // 30px
    "4xl": "text-4xl",  // 36px
    "5xl": "text-5xl",  // 48px
  } as const,
  
  // Tracking
  tracking: {
    tight: "tracking-tight",
    normal: "tracking-normal",
    wide: "tracking-wide",
  } as const,
} as const;

// ============================================
// LOADING STATE TOKENS
// ============================================
export const loading = {
  // Skeleton base
  skeleton: "animate-pulse bg-muted/50",
  // Skeleton con border
  skeletonBordered: "animate-pulse bg-muted/30 border border-border/20",
  // Spinner
  spinner: "animate-spin rounded-full border-b-2 border-primary",
} as const;

// ============================================
// CARD VARIANT TOKENS
// ============================================
export const card = {
  // Card base
  base: "bg-card border border-border/80 shadow-sm",
  // Card glass
  glass: "glass border border-border/40 shadow-soft",
  // Card strong
  strong: "glass-strong border border-border/60 shadow-card",
  // Card interactive
  interactive: "bg-card border border-border/80 shadow-sm hover:shadow-lift transition-smooth cursor-pointer",
} as const;

// ============================================
// CONVENCIONES CLARAS
// ============================================
export const conventions = {
  // Botones
  button: {
    primary: "rounded-xl bg-gradient-sunrise text-white px-6 py-3 text-xs font-black shadow-glow hover:scale-[1.02] hover:shadow-lg active:scale-95 transition-all duration-200",
    secondary: "rounded-xl bg-white/10 backdrop-blur-md border border-white/15 px-6 py-3 text-xs font-bold hover:bg-white/20 hover:shadow-md active:scale-95 transition-all duration-200 text-white",
  },
  
  // Inputs
  input: "bg-secondary/40 border border-border/30 rounded-2xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all",
  
  // Section headers
  sectionHeader: "space-y-3 sm:space-y-4",
  sectionTitle: "font-display font-black text-lg sm:text-2xl tracking-tight text-foreground",
  sectionSubtitle: "text-xs sm:text-sm text-muted-foreground mt-1",
  
  // Cards
  card: "rounded-3xl bg-card border border-border/80 shadow-sm",
  cardInteractive: "rounded-3xl bg-card border border-border/80 shadow-sm hover:shadow-lift transition-smooth cursor-pointer",
  
  // Badges
  badge: "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold",
  
  // Links
  link: "text-primary hover:underline transition-colors",
} as const;

// ============================================
// UTILIDADES REUTILIZABLES
// ============================================
export const utils = {
  // Combinar clases de forma segura
  cn: (...classes: (string | undefined | null | false)[]) => {
    return classes.filter(Boolean).join(" ");
  },
  
  // Crear variante de componente
  variant: (base: string, variants: Record<string, string>) => {
    return (variant: string = "default") => {
      return utils.cn(base, variants[variant] || variants.default);
    };
  },
} as const;
