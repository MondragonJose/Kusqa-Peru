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

export type DbCategory = "environment" | "infrastructure" | "community" | "education" | "health";

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

export const CATEGORY_LABEL: Record<DbCategory, MissionCategory> = {
  environment: "Medio ambiente",
  infrastructure: "Tecnología",
  community: "Comunidad",
  education: "Educación",
  health: "Salud",
};

export const CATEGORY_TO_DB: Record<MissionCategory, DbCategory> = {
  "Medio ambiente": "environment",
  Tecnología: "infrastructure",
  Comunidad: "community",
  Educación: "education",
  Salud: "health",
  "Arte & cultura": "community",
};

const DB_CATEGORY_EMOJI: Record<DbCategory, string> = {
  environment: "🌱",
  infrastructure: "🏗️",
  community: "🤝",
  education: "📚",
  health: "❤️",
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

export function categoryToDb(category: MissionCategory): DbCategory {
  return CATEGORY_TO_DB[category] ?? "community";
}

export function dbToCategory(db: DbCategory | string): MissionCategory {
  return CATEGORY_LABEL[db as DbCategory] ?? "Comunidad";
}

export function dbCategoryEmoji(db: DbCategory): string {
  return DB_CATEGORY_EMOJI[db] ?? "📌";
}
