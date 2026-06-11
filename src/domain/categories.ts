export type MissionCategory =
  | "Medio ambiente"
  | "Educación"
  | "Arte & cultura"
  | "Comunidad"
  | "Salud"
  | "Tecnología";

export const CATEGORIES = [
  "Medio ambiente",
  "Educación",
  "Arte & cultura",
  "Comunidad",
  "Salud",
  "Tecnología",
] as const;

export interface CategoryMeta {
  label: string;
  emoji: string;
  color: string;
  gradient: string;
  icon: string;
}

export const CATEGORY_META: Record<MissionCategory, CategoryMeta> = {
  "Medio ambiente": {
    label: "Medio ambiente",
    emoji: "🌱",
    color: "text-emerald-500",
    gradient: "from-emerald-400 to-green-500",
    icon: "🌱",
  },
  Educación: {
    label: "Educación",
    emoji: "📚",
    color: "text-blue-500",
    gradient: "from-blue-400 to-indigo-500",
    icon: "📚",
  },
  "Arte & cultura": {
    label: "Arte & cultura",
    emoji: "🎨",
    color: "text-purple-500",
    gradient: "from-purple-400 to-pink-500",
    icon: "🎨",
  },
  Comunidad: {
    label: "Comunidad",
    emoji: "🤝",
    color: "text-orange-500",
    gradient: "from-orange-400 to-amber-500",
    icon: "🤝",
  },
  Salud: {
    label: "Salud",
    emoji: "❤️",
    color: "text-rose-500",
    gradient: "from-rose-400 to-red-500",
    icon: "❤️",
  },
  Tecnología: {
    label: "Tecnología",
    emoji: "💻",
    color: "text-cyan-500",
    gradient: "from-cyan-400 to-blue-500",
    icon: "🏗️",
  },
};

export function categoryEmoji(category: MissionCategory): string {
  return CATEGORY_META[category]?.emoji ?? "📌";
}

export function categoryLabel(category: MissionCategory): string {
  return CATEGORY_META[category]?.label ?? category;
}

export function categoryColor(category: MissionCategory): string {
  return CATEGORY_META[category]?.color ?? "text-foreground";
}

export function categoryGradient(category: MissionCategory): string {
  return CATEGORY_META[category]?.gradient ?? "";
}
