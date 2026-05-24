/**
 * Datos de actividad y energía cívica por distrito en el Perú
 * Representa la vida comunitaria y el movimiento colectivo de KUSQA
 */

import type { CommunityPulseData, DistrictActivity } from "../types";

export const DISTRICT_ACTIVITIES: DistrictActivity[] = [
  {
    id: "barranco",
    name: "Barranco",
    province: "Lima",
    region: "costa",
    activeCount: 28,
    energyScore: 88,
    missionCount: 4,
    totalHours: 1240,
    recentAction: {
      actorName: "Mateo S.",
      actionText: "se unió a 'Mural Colectivo'",
      timestamp: "hace 5 min",
    },
  },
  {
    id: "cusco-valle",
    name: "Urubamba (Valle Sagrado)",
    province: "Cusco",
    region: "sierra",
    activeCount: 34,
    energyScore: 94,
    missionCount: 5,
    totalHours: 1850,
    recentAction: {
      actorName: "Yari Q.",
      actionText: "desbloqueó insignia 'Sembrador'",
      timestamp: "hace 12 min",
    },
  },
  {
    id: "iquitos",
    name: "Iquitos",
    province: "Loreto",
    region: "selva",
    activeCount: 19,
    energyScore: 76,
    missionCount: 3,
    totalHours: 890,
    recentAction: {
      actorName: "Luz M.",
      actionText: "completó misión 'Limpieza de Río'",
      timestamp: "hace 24 min",
    },
  },
  {
    id: "trujillo",
    name: "Trujillo",
    province: "La Libertad",
    region: "costa",
    activeCount: 22,
    energyScore: 68,
    missionCount: 3,
    totalHours: 980,
    recentAction: {
      actorName: "Carlos D.",
      actionText: "creó proyecto 'Código para Escolares'",
      timestamp: "hace 45 min",
    },
  },
  {
    id: "puno",
    name: "Puno",
    province: "Puno",
    region: "sierra",
    activeCount: 15,
    energyScore: 52,
    missionCount: 2,
    totalHours: 420,
    recentAction: {
      actorName: "Sayri T.",
      actionText: "completó 'Cultura Tradicional'",
      timestamp: "hace 1h",
    },
  },
  {
    id: "sjl",
    name: "San Juan de Lurigancho",
    province: "Lima",
    region: "costa",
    activeCount: 45,
    energyScore: 92,
    missionCount: 6,
    totalHours: 2110,
    recentAction: {
      actorName: "Daniela R.",
      actionText: "organizó charla 'Salud Mental'",
      timestamp: "hace 15 min",
    },
  },
];

export const MOCK_COMMUNITY_PULSE: CommunityPulseData = {
  totalActiveToday: 163,
  activeDistrictsCount: 12,
  recentImpactDescription: "5,490 horas de acción colectiva este mes en todo el Perú",
  districts: DISTRICT_ACTIVITIES,
};
