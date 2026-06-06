/**
 * Ruta KUSQA — Definición completa del camino cívico
 *
 * Inspirada en el Qhapaq Ñan (Gran Camino Inca) y los tres grandes
 * paisajes del Perú: Costa, Sierra, Selva.
 *
 * No es un sistema de gamificación genérico.
 * Es una expedición cívica por el territorio peruano.
 */

import type { ProgressionStage } from "../types";

export const CIVIC_ROUTE: ProgressionStage[] = [
  {
    level: 1,
    name: "Caminante",
    terrain: "Orillas del Pacífico",
    region: "costa",
    icon: "🚶",
    narrative:
      "Pones el primer pie en la arena. La costa te recibe con brisa salina y el murmullo de comunidades que ya llevan años construyendo. Apenas comienzas a escuchar.",
    xpFrom: 0,
    xpTo: 500,
    gradientClass: "bg-gradient-coast",
    milestones: [
      {
        id: "first-mission",
        label: "Primera misión completada",
        xpRequired: 100,
        unlockLabel: "Acceso al mapa cívico",
      },
      { id: "first-district", label: "Explora tu primer distrito", xpRequired: 250 },
      { id: "join-team", label: "Únete a un equipo barrial", xpRequired: 400 },
    ],
    unlocks: ["Mapa cívico básico", "Perfil de caminante"],
  },
  {
    level: 2,
    name: "Vecino del litoral",
    terrain: "Barrios costeros",
    region: "costa",
    icon: "🏘️",
    narrative:
      "Ya conoces las calles. Los vecinos te saludan. Tu nombre empieza a circular en los parques, en las reuniones de cuadra, en los grupos del barrio. Eres parte del tejido.",
    xpFrom: 500,
    xpTo: 1500,
    gradientClass: "bg-gradient-terrain-costa",
    milestones: [
      { id: "five-missions", label: "5 misiones en tu zona", xpRequired: 700 },
      {
        id: "impact-50",
        label: "50 personas alcanzadas",
        xpRequired: 1000,
        unlockLabel: "Insignia: Vecino activo",
      },
      { id: "lead-once", label: "Lidera una actividad", xpRequired: 1300 },
    ],
    unlocks: ["Insignia Vecino Activo", "Estadísticas de impacto local"],
  },
  {
    level: 3,
    name: "Sembrador",
    terrain: "Valles interandinos",
    region: "sierra",
    icon: "🌱",
    narrative:
      "Subes hacia la sierra. El aire cambia, los colores se profundizan. Aquí la tierra es historia viva. Cada gesto que haces queda sembrado en el suelo de comunidades que llevan siglos resistiendo.",
    xpFrom: 1500,
    xpTo: 3500,
    gradientClass: "bg-gradient-andes",
    milestones: [
      { id: "three-regions", label: "Misiones en 3 distritos distintos", xpRequired: 2000 },
      {
        id: "env-mission",
        label: "Misión ambiental completada",
        xpRequired: 2500,
        unlockLabel: "Insignia: Guardián Verde",
      },
      { id: "mentor-first", label: "Mentorea a un nuevo caminante", xpRequired: 3000 },
    ],
    unlocks: ["Insignia Guardián Verde", "Filtro de misiones por región"],
  },
  {
    level: 4,
    name: "Guía del valle",
    terrain: "Corazón de los Andes",
    region: "sierra",
    icon: "⛰️",
    narrative:
      "Conoces el camino. Los nuevos caminantes te buscan. Eres el puente entre quienes recién llegan y quienes ya construyeron durante años. El valle te reconoce como parte de su historia.",
    xpFrom: 3500,
    xpTo: 6500,
    gradientClass: "bg-gradient-terrain-sierra",
    milestones: [
      {
        id: "lead-project",
        label: "Crea tu propio proyecto",
        xpRequired: 4000,
        unlockLabel: "Acceso a creación de misiones",
      },
      { id: "impact-300", label: "300 personas alcanzadas", xpRequired: 5000 },
      {
        id: "district-win",
        label: "Tu distrito gana un reto",
        xpRequired: 6000,
        unlockLabel: "Insignia: Constructor Comunitario",
      },
    ],
    unlocks: [
      "Creación de misiones propias",
      "Insignia Constructor Comunitario",
      "Panel de liderazgo",
    ],
  },
  {
    level: 5,
    name: "Explorador",
    terrain: "Entrada a la Amazonía",
    region: "selva",
    icon: "🧭",
    narrative:
      "Cruzas el umbral hacia la selva. La biodiversidad te rodea. Aquí las comunidades son más antiguas que el Estado. Explorar significa escuchar antes de hablar, aprender antes de actuar.",
    xpFrom: 6500,
    xpTo: 10500,
    gradientClass: "bg-gradient-jungle",
    milestones: [
      { id: "selva-mission", label: "Primera misión en la Amazonía", xpRequired: 7000 },
      {
        id: "multi-region",
        label: "Activo en Costa, Sierra y Selva",
        xpRequired: 8500,
        unlockLabel: "Insignia: Tejedor Social",
      },
      { id: "impact-1000", label: "1,000 personas alcanzadas", xpRequired: 10000 },
    ],
    unlocks: ["Insignia Tejedor Social", "Vista de impacto nacional"],
  },
  {
    level: 6,
    name: "Voz del río",
    terrain: "Cuencas amazónicas",
    region: "selva",
    icon: "🛶",
    narrative:
      "Navegas los ríos que conectan comunidades remotas. Tu nombre ya no es solo de un barrio. Eres un nodo en una red que atraviesa el país. La gente cita tus proyectos cuando habla del cambio.",
    xpFrom: 10500,
    xpTo: 16000,
    gradientClass: "bg-gradient-terrain-selva",
    milestones: [
      { id: "five-projects", label: "5 proyectos propios lanzados", xpRequired: 11500 },
      {
        id: "fifty-allies",
        label: "50 aliados en tu red",
        xpRequired: 13000,
        unlockLabel: "Insignia: Agente de Cambio",
      },
      { id: "impact-5000", label: "5,000 personas alcanzadas", xpRequired: 15000 },
    ],
    unlocks: ["Insignia Agente de Cambio", "Perfil público ampliado"],
  },
  {
    level: 7,
    name: "Líder KUSQA",
    terrain: "La cumbre · Legado nacional",
    region: "cumbre",
    icon: "🏔️",
    narrative:
      "Has caminado el Perú. Has sembrado en la costa, construido en la sierra, navegado la selva. Ya no eres solo un participante: eres parte de la memoria viva de un movimiento que transformó comunidades.",
    xpFrom: 16000,
    xpTo: 25000,
    gradientClass: "bg-gradient-cumbre",
    milestones: [
      { id: "national-impact", label: "Impacto verificado en 5 regiones", xpRequired: 18000 },
      {
        id: "mentor-ten",
        label: "Mentorea a 10 nuevos líderes",
        xpRequired: 21000,
        unlockLabel: "Insignia: Voz Barrial",
      },
      {
        id: "legacy-project",
        label: "Proyecto de legado comunitario",
        xpRequired: 24000,
        unlockLabel: "Insignia Legendaria: Kusqa Mayor",
      },
    ],
    unlocks: [
      "Insignia Voz Barrial",
      "Insignia Legendaria: Kusqa Mayor",
      "Perfil de Líder Nacional",
    ],
  },
];

/** Retorna el tramo correspondiente a un nivel dado */
export function getStageByLevel(level: number): ProgressionStage {
  return CIVIC_ROUTE.find((s) => s.level === level) ?? CIVIC_ROUTE[0];
}

/** Retorna el tramo correspondiente a un XP dado */
export function getStageByXp(xp: number): ProgressionStage {
  return (
    CIVIC_ROUTE.slice()
      .reverse()
      .find((s) => xp >= s.xpFrom) ?? CIVIC_ROUTE[0]
  );
}
