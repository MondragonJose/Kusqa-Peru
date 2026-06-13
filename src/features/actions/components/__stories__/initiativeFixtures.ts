import type { Initiative, InitiativeLifecycle } from "@/domain/initiative";
import type { Region } from "@/domain/regions";

export function makeInitiative(overrides?: Partial<Initiative>): Initiative {
  return {
    id: "story_1",
    sourceType: "mission",
    sourceId: "mission-1",
    title: "Limpieza del Río Chillón",
    summary: "Jornada comunitaria para limpiar las riberas del río y concientizar sobre el cuidado del agua.",
    category: "Medio ambiente",
    region: "costa" as Region,
    lifecycle: "active",
    temporalAnchor: { label: "En curso", kind: "active", referenceDate: null },
    emoji: "🌊",
    location: {
      district: "Carabayllo",
      districtId: "dist-1",
      region: "costa" as Region,
      coords: { lat: -11.85, lng: -77.05 },
      locationLabel: "Carabayllo, Lima",
    },
    participantsCount: 12,
    supportersCount: 45,
    vitalityScore: 78,
    ownerId: "user-1",
    ...overrides,
  };
}

export const LIFECYCLE_META: Record<InitiativeLifecycle, {
  label: string;
  overrides: Partial<Initiative>;
}> = {
  forming: {
    label: "Forming — idea phase",
    overrides: {
      lifecycle: "forming",
      sourceType: "proposal",
      sourceId: "proposal-1",
      emoji: "🌱",
      temporalAnchor: { label: "Buscando personas para empezar", kind: "indefinite", referenceDate: null },
      supportersCount: 3,
      participantsCount: undefined,
    },
  },
  gathering: {
    label: "Gathering — recruiting",
    overrides: {
      lifecycle: "gathering",
      emoji: "📢",
      temporalAnchor: { label: "Reuniendo equipo", kind: "active", referenceDate: null },
      participantsCount: 5,
    },
  },
  active: {
    label: "Active — in progress",
    overrides: {
      lifecycle: "active",
      emoji: "🌊",
      temporalAnchor: { label: "Termina en 12 días", kind: "ending", referenceDate: "2026-06-22T00:00:00Z" },
    },
  },
  completed: {
    label: "Completed — done",
    overrides: {
      lifecycle: "completed",
      emoji: "✅",
      temporalAnchor: { label: "Finalizó ayer", kind: "recent", referenceDate: "2026-06-09T00:00:00Z" },
      participantsCount: 28,
    },
  },
  archived: {
    label: "Archived — rejected/archived",
    overrides: {
      lifecycle: "archived",
      sourceType: "proposal",
      sourceId: "proposal-archived",
      emoji: "🗄️",
      temporalAnchor: { label: "Archivada", kind: "completed", referenceDate: null },
    },
  },
  dormant: {
    label: "Dormant — inactive",
    overrides: {
      lifecycle: "dormant",
      emoji: "💤",
      temporalAnchor: { label: "Archivada", kind: "completed", referenceDate: null },
    },
  },
};
