/**
 * Biblioteca de insignias cívicas de KUSQA
 *
 * Cada insignia es un artefacto de identidad con:
 * - Historia (narrative)
 * - Rareza
 * - Territorio
 * - Categoría cívica
 *
 * No son trofeos. Son marcas del camino recorrido.
 */

import type { CivicBadge } from "../types";

export const CIVIC_BADGES: CivicBadge[] = [
  // ─── FUNDACIONALES ─────────────────────────────────────────────
  {
    id: "primer-paso",
    name: "Primer Paso",
    emoji: "🌅",
    rarity: "común",
    category: "fundacional",
    region: "nacional",
    narrative: "Todo camino tiene un primer paso. El tuyo ya está marcado.",
    unlockCondition: "Completa tu primera misión",
    earned: false,
  },
  {
    id: "raiz",
    name: "Con Raíces",
    emoji: "🌿",
    rarity: "común",
    category: "fundacional",
    region: "nacional",
    narrative: "Conociste tu distrito. Ahora es parte de ti, y tú eres parte de él.",
    unlockCondition: "Completa 3 misiones en tu distrito",
    earned: false,
  },

  // ─── TERRITORIAL ───────────────────────────────────────────────
  {
    id: "explorador-andino",
    name: "Explorador Andino",
    emoji: "⛰️",
    rarity: "raro",
    category: "territorial",
    region: "sierra",
    narrative: "Subiste la pendiente sin pedir permiso. La sierra te reconoció como suya.",
    unlockCondition: "Completa 3 misiones en la región Sierra",
    earned: false,
  },
  {
    id: "hijo-del-pacifico",
    name: "Hijo del Pacífico",
    emoji: "🌊",
    rarity: "raro",
    category: "territorial",
    region: "costa",
    narrative: "La costa te formó. Sus calles son tuyas. Sus comunidades te conocen.",
    unlockCondition: "Completa 5 misiones en la región Costa",
    earned: false,
  },
  {
    id: "navegante",
    name: "Navegante del Itaya",
    emoji: "🛶",
    rarity: "épico",
    category: "territorial",
    region: "selva",
    narrative: "Llegaste donde pocos llegan. La Amazonía te abrió sus ríos.",
    unlockCondition: "Completa una misión en la región Selva",
    earned: false,
  },
  {
    id: "tejedor",
    name: "Tejedor Social",
    emoji: "🕸️",
    rarity: "épico",
    category: "territorial",
    region: "nacional",
    narrative: "Costa, Sierra, Selva. Has caminado el Perú de punta a punta. Tu red es el país.",
    unlockCondition: "Misiones activas en Costa, Sierra y Selva",
    earned: false,
  },

  // ─── SOCIAL ────────────────────────────────────────────────────
  {
    id: "vecino-activo",
    name: "Vecino Activo",
    emoji: "🏘️",
    rarity: "común",
    category: "social",
    region: "costa",
    narrative: "Tu cuadra ya sabe quién eres. No como figura, sino como presencia real.",
    unlockCondition: "5 misiones en tu distrito",
    earned: false,
  },
  {
    id: "voz-barrial",
    name: "Voz Barrial",
    emoji: "📣",
    rarity: "raro",
    category: "social",
    region: "nacional",
    narrative: "Cuando hablas, la cuadra escucha. No por volumen, sino por historia.",
    unlockCondition: "Lidera un proyecto comunitario propio",
    earned: false,
  },
  {
    id: "puente",
    name: "Puente",
    emoji: "🤝",
    rarity: "épico",
    category: "social",
    region: "nacional",
    narrative: "Conectaste comunidades que no se conocían. Ese hilo ya no se rompe.",
    unlockCondition: "Colabora con 10 personas de distritos diferentes",
    earned: false,
  },

  // ─── LIDERAZGO ─────────────────────────────────────────────────
  {
    id: "mentor",
    name: "Mentor",
    emoji: "🎓",
    rarity: "raro",
    category: "liderazgo",
    region: "nacional",
    narrative: "Enseñaste lo que aprendiste. Y así el ciclo continúa.",
    unlockCondition: "Mentorea a 10 personas en una misión",
    earned: false,
  },
  {
    id: "constructor",
    name: "Constructor Comunitario",
    emoji: "🏗️",
    rarity: "épico",
    category: "liderazgo",
    region: "nacional",
    narrative: "Lo que construiste con tus manos seguirá en pie cuando te vayas. Eso es legado.",
    unlockCondition: "Crea y completa 3 proyectos propios",
    earned: false,
  },
  {
    id: "agente",
    name: "Agente de Cambio",
    emoji: "⚡",
    rarity: "épico",
    category: "liderazgo",
    region: "nacional",
    narrative: "No esperas el cambio. Eres el catalizador. Las cosas se mueven cuando apareces.",
    unlockCondition: "50 aliados en tu red cívica",
    earned: false,
  },
  {
    id: "lider-kusqa",
    name: "Líder KUSQA",
    emoji: "🏔️",
    rarity: "legendario",
    category: "liderazgo",
    region: "nacional",
    narrative:
      "Caminaste el Perú. Sembraste en la costa, construiste en la sierra, navegaste la selva. Eres parte de la memoria viva de un movimiento.",
    unlockCondition: "Alcanza el nivel máximo de la Ruta KUSQA",
    earned: false,
  },

  // ─── AMBIENTAL ─────────────────────────────────────────────────
  {
    id: "guardian-verde",
    name: "Guardián Verde",
    emoji: "🌱",
    rarity: "raro",
    category: "ambiental",
    region: "sierra",
    narrative:
      "Plantaste vida donde había tierra seca. El árbol no sabe tu nombre, pero existe porque tú estuviste.",
    unlockCondition: "Completa una misión ambiental en la Sierra",
    earned: false,
  },
  {
    id: "marea-limpia",
    name: "Marea Limpia",
    emoji: "🌊",
    rarity: "raro",
    category: "ambiental",
    region: "costa",
    narrative: "El mar que limpiaste no olvidaría, si pudiera recordar.",
    unlockCondition: "Participa en una limpieza de playa o río costero",
    earned: false,
  },
  {
    id: "amazonas",
    name: "Custodio del Amazonas",
    emoji: "🐍",
    rarity: "épico",
    category: "ambiental",
    region: "selva",
    narrative: "Protegiste lo que no tiene precio. La selva guarda tu nombre entre sus raíces.",
    unlockCondition: "3 misiones ambientales en la Amazonía",
    earned: false,
  },

  // ─── CULTURAL ──────────────────────────────────────────────────
  {
    id: "memoria-viva",
    name: "Memoria Viva",
    emoji: "🎭",
    rarity: "raro",
    category: "cultural",
    region: "nacional",
    narrative:
      "Guardaste una historia antes de que se perdiera. Eso es cultura: acto de resistencia.",
    unlockCondition: "Participa en una misión cultural o artística",
    earned: false,
  },
  {
    id: "kusqa-mayor",
    name: "Kusqa Mayor",
    emoji: "🌟",
    rarity: "legendario",
    category: "cultural",
    region: "nacional",
    narrative: "KUSQA significa 'conectar'. Tú eres esa conexión hecha persona. El Perú te conoce.",
    unlockCondition: "Alcanza la cima de la Ruta KUSQA y completa un proyecto de legado",
    earned: false,
  },
];

/** Agrupa insignias por categoría */
export function getBadgesByCategory(badges: CivicBadge[]): Record<string, CivicBadge[]> {
  return badges.reduce(
    (acc, badge) => {
      if (!acc[badge.category]) acc[badge.category] = [];
      acc[badge.category].push(badge);
      return acc;
    },
    {} as Record<string, CivicBadge[]>,
  );
}

/** Filtra insignias ganadas */
export function getEarnedBadges(badges: CivicBadge[]): CivicBadge[] {
  return badges.filter((b) => b.earned);
}

/** Filtra insignias por rareza */
export function getBadgesByRarity(
  badges: CivicBadge[],
  rarity: CivicBadge["rarity"],
): CivicBadge[] {
  return badges.filter((b) => b.rarity === rarity);
}
