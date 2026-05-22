// KUSQA mock data — shared across pages
export type Region = "costa" | "sierra" | "selva";

export type Mission = {
  id: string;
  title: string;
  description: string;
  district: string;
  region: Region;
  category: string;
  xp: number;
  participants: number;
  spotsLeft: number;
  date: string;
  distanceKm: number;
  impact: string;
  difficulty: "Suave" | "Andina" | "Cumbre";
  organizer: { name: string; avatar: string };
  coords: { x: number; y: number }; // for visual map (0-100)
  emoji: string;
};

export const MISSIONS: Mission[] = [
  {
    id: "barranco-mural",
    title: "Mural colectivo en Barranco",
    description:
      "Pintaremos un mural de 24 metros sobre identidad joven peruana junto con artistas locales. Trae ropa que puedas manchar y muchas ganas de crear.",
    district: "Barranco, Lima",
    region: "costa",
    category: "Arte & cultura",
    xp: 320,
    participants: 28,
    spotsLeft: 12,
    date: "Sáb 14 jun · 9:00",
    distanceKm: 2.1,
    impact: "24m² de mural · 6 cuadras renovadas",
    difficulty: "Suave",
    organizer: { name: "Colectivo Pez Azul", avatar: "🎨" },
    coords: { x: 18, y: 62 },
    emoji: "🎨",
  },
  {
    id: "cusco-reforesta",
    title: "Reforestación en el valle sagrado",
    description:
      "Sembraremos 500 queuñas nativas en las laderas de Chinchero, restaurando un corredor ecológico ancestral.",
    district: "Chinchero, Cusco",
    region: "sierra",
    category: "Medio ambiente",
    xp: 540,
    participants: 64,
    spotsLeft: 4,
    date: "Dom 22 jun · 6:30",
    distanceKm: 0,
    impact: "500 árboles · 1.2 ha restauradas",
    difficulty: "Andina",
    organizer: { name: "Raíces del Ande", avatar: "🌱" },
    coords: { x: 52, y: 48 },
    emoji: "🌱",
  },
  {
    id: "iquitos-rio",
    title: "Limpieza del río Itaya",
    description:
      "Jornada en kayak por el río Itaya retirando plásticos junto a la comunidad shipiba. Incluye taller de biodiversidad amazónica.",
    district: "Iquitos, Loreto",
    region: "selva",
    category: "Medio ambiente",
    xp: 680,
    participants: 22,
    spotsLeft: 8,
    date: "Sáb 5 jul · 7:00",
    distanceKm: 0,
    impact: "800kg de plástico retirado",
    difficulty: "Cumbre",
    organizer: { name: "Amazonía Viva", avatar: "🛶" },
    coords: { x: 78, y: 32 },
    emoji: "🛶",
  },
  {
    id: "trujillo-codigo",
    title: "Clases de código para escolares",
    description:
      "Enseña los fundamentos de programación a chicos de secundaria en Alto Trujillo. Buscamos mentores con cualquier nivel técnico.",
    district: "Trujillo, La Libertad",
    region: "costa",
    category: "Educación",
    xp: 380,
    participants: 41,
    spotsLeft: 19,
    date: "Mié 18 jun · 16:00",
    distanceKm: 0,
    impact: "60 escolares formados",
    difficulty: "Suave",
    organizer: { name: "CodeNorte", avatar: "💻" },
    coords: { x: 22, y: 32 },
    emoji: "💻",
  },
  {
    id: "puno-ollas",
    title: "Ollas comunes en El Alto",
    description:
      "Apoya la preparación de 300 desayunos calientes para familias en zonas alto andinas durante la temporada de friaje.",
    district: "Puno, Puno",
    region: "sierra",
    category: "Comunidad",
    xp: 290,
    participants: 18,
    spotsLeft: 6,
    date: "Vie 13 jun · 5:30",
    distanceKm: 0,
    impact: "300 desayunos · 70 familias",
    difficulty: "Andina",
    organizer: { name: "Manos Wayra", avatar: "🍲" },
    coords: { x: 58, y: 78 },
    emoji: "🍲",
  },
  {
    id: "miraflores-mayores",
    title: "Tardes con nuestros mayores",
    description:
      "Acompaña a adultos mayores en un encuentro intergeneracional con música, juegos y memoria viva del barrio.",
    district: "Miraflores, Lima",
    region: "costa",
    category: "Comunidad",
    xp: 220,
    participants: 14,
    spotsLeft: 10,
    date: "Dom 15 jun · 15:00",
    distanceKm: 1.4,
    impact: "30 personas mayores acompañadas",
    difficulty: "Suave",
    organizer: { name: "Casa Abuelo", avatar: "🌼" },
    coords: { x: 19, y: 58 },
    emoji: "🌼",
  },
];

export const REGION_META: Record<Region, { name: string; gradient: string; color: string; chipBg: string }> = {
  costa: {
    name: "Costa",
    gradient: "bg-gradient-coast",
    color: "text-coast",
    chipBg: "bg-coast/10 text-coast",
  },
  sierra: {
    name: "Sierra",
    gradient: "bg-gradient-andes",
    color: "text-sierra",
    chipBg: "bg-sierra/10 text-sierra",
  },
  selva: {
    name: "Selva",
    gradient: "bg-gradient-jungle",
    color: "text-jungle",
    chipBg: "bg-jungle/10 text-jungle",
  },
};

export type Badge = {
  id: string;
  name: string;
  emoji: string;
  region: Region | "todas";
  earned: boolean;
  description: string;
};

export const BADGES: Badge[] = [
  { id: "1", name: "Primer paso", emoji: "🌅", region: "todas", earned: true, description: "Tu primera misión completada" },
  { id: "2", name: "Vecino activo", emoji: "🏘️", region: "costa", earned: true, description: "5 misiones en tu distrito" },
  { id: "3", name: "Sembrador", emoji: "🌱", region: "sierra", earned: true, description: "Plantaste tu primer árbol" },
  { id: "4", name: "Pez del Itaya", emoji: "🐟", region: "selva", earned: false, description: "Misión en la Amazonía" },
  { id: "5", name: "Mentor", emoji: "🎓", region: "todas", earned: true, description: "Enseñaste a 10 personas" },
  { id: "6", name: "Cumbre andina", emoji: "🏔️", region: "sierra", earned: false, description: "Llega a +4000 msnm" },
  { id: "7", name: "Marea limpia", emoji: "🌊", region: "costa", earned: false, description: "Limpieza de playa" },
  { id: "8", name: "Voz del barrio", emoji: "📣", region: "todas", earned: false, description: "Lidera un proyecto propio" },
];

export const LEVELS = [
  { level: 1, name: "Caminante", from: 0, to: 500, region: "costa" as Region },
  { level: 2, name: "Vecino", name2: "del litoral", from: 500, to: 1500, region: "costa" as Region },
  { level: 3, name: "Sembrador", from: 1500, to: 3500, region: "sierra" as Region },
  { level: 4, name: "Guía del valle", from: 3500, to: 6500, region: "sierra" as Region },
  { level: 5, name: "Explorador", from: 6500, to: 10500, region: "selva" as Region },
  { level: 6, name: "Voz del río", from: 10500, to: 16000, region: "selva" as Region },
  { level: 7, name: "Líder Kusqa", from: 16000, to: 25000, region: "sierra" as Region },
];

export const CURRENT_USER = {
  name: "Camila Quispe",
  handle: "@camiq",
  district: "Barranco, Lima",
  region: "costa" as Region,
  avatar: "🦙",
  xp: 4280,
  level: 4,
  rank: 127,
  streak: 12,
  hours: 84,
  missionsDone: 17,
  peopleImpacted: 612,
};

export const NOTIFICATIONS = [
  { id: "1", type: "badge", title: "Nueva insignia desbloqueada", body: "Mentor — enseñaste a 10 personas", time: "hace 2h", emoji: "🎓", unread: true },
  { id: "2", type: "mission", title: "Tu misión empieza mañana", body: "Mural colectivo en Barranco · 9:00", time: "hace 5h", emoji: "🎨", unread: true },
  { id: "3", type: "social", title: "Andrés se unió a tu proyecto", body: "Clases de código para escolares", time: "hace 1d", emoji: "👋", unread: true },
  { id: "4", type: "level", title: "¡Subiste a nivel 4!", body: "Ahora eres Guía del valle", time: "hace 2d", emoji: "⛰️", unread: false },
  { id: "5", type: "community", title: "Tu distrito ganó el reto semanal", body: "Barranco lidera con 1,240 horas", time: "hace 3d", emoji: "🏆", unread: false },
  { id: "6", type: "mission", title: "Cupos casi llenos", body: "Reforestación en el valle sagrado — quedan 4", time: "hace 4d", emoji: "🌱", unread: false },
];
