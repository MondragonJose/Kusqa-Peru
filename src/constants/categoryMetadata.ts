/**
 * Metadata ligera por categoría para render condicional en cards/details
 * Diseñado para beta: simple, extensible, sin overengineering
 */

import type { MissionCategory } from "@/types";

export interface CategoryMetadata {
  icon: string;
  color: string;
  gradient: string;
  fields: CategoryField[];
  impactLabel: string;
  unit: string;
}

export interface CategoryField {
  key: string;
  label: string;
  icon: string;
  defaultValue: string;
}

export const CATEGORY_METADATA: Record<MissionCategory, CategoryMetadata> = {
  "Medio ambiente": {
    icon: "🌱",
    color: "text-emerald-500",
    gradient: "from-emerald-400 to-green-500",
    fields: [
      { key: "trees", label: "Árboles", icon: "🌳", defaultValue: "0" },
      { key: "area", label: "Área", icon: "📏", defaultValue: "0 m²" },
    ],
    impactLabel: "Impacto ambiental",
    unit: "árboles",
  },
  "Educación": {
    icon: "📚",
    color: "text-blue-500",
    gradient: "from-blue-400 to-indigo-500",
    fields: [
      { key: "level", label: "Nivel", icon: "🎓", defaultValue: "Básico" },
      { key: "duration", label: "Duración", icon: "⏱️", defaultValue: "1 hora" },
      { key: "modality", label: "Modalidad", icon: "📍", defaultValue: "Presencial" },
    ],
    impactLabel: "Horas de aprendizaje",
    unit: "horas",
  },
  "Arte & cultura": {
    icon: "🎨",
    color: "text-purple-500",
    gradient: "from-purple-400 to-pink-500",
    fields: [
      { key: "participants", label: "Participantes", icon: "👥", defaultValue: "10" },
      { key: "materials", label: "Materiales", icon: "🎭", defaultValue: "Básicos" },
    ],
    impactLabel: "Obras creadas",
    unit: "obras",
  },
  "Comunidad": {
    icon: "🤝",
    color: "text-orange-500",
    gradient: "from-orange-400 to-amber-500",
    fields: [
      { key: "families", label: "Familias", icon: "🏠", defaultValue: "5" },
      { key: "meetingPoint", label: "Punto de encuentro", icon: "📍", defaultValue: "Plaza central" },
    ],
    impactLabel: "Familias impactadas",
    unit: "familias",
  },
  "Salud": {
    icon: "❤️",
    color: "text-rose-500",
    gradient: "from-rose-400 to-red-500",
    fields: [
      { key: "checkups", label: "Chequeos", icon: "🩺", defaultValue: "0" },
      { key: "vaccines", label: "Vacunas", icon: "💉", defaultValue: "0" },
    ],
    impactLabel: "Atenciones brindadas",
    unit: "atenciones",
  },
  "Tecnología": {
    icon: "💻",
    color: "text-cyan-500",
    gradient: "from-cyan-400 to-blue-500",
    fields: [
      { key: "participants", label: "Participantes", icon: "👥", defaultValue: "10" },
      { key: "hours", label: "Horas", icon: "⏱️", defaultValue: "2" },
    ],
    impactLabel: "Personas capacitadas",
    unit: "personas",
  },
};

export function getCategoryMetadata(category: MissionCategory): CategoryMetadata {
  return CATEGORY_METADATA[category] || CATEGORY_METADATA["Comunidad"];
}
