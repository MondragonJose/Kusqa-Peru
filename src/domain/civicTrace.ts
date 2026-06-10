export type TraceStrength = "faint" | "settled" | "landmark";

export type TraceVitality = "fresh" | "settling" | "dormant";

export interface CivicTraceInput {
  initiativeId: string;
  title: string;
  districtSlug: string;
  district: string;
  region: string;
  category: string;
  coords: { lat: number; lng: number } | null;
  boundary: unknown | null;
  completedAt: string | null;
  verifiedCount: number;
}

export interface CivicTrace {
  initiativeId: string;
  title: string;
  districtSlug: string;
  district: string;
  region: string;
  category: string;
  coords: { lat: number; lng: number } | null;
  boundary: unknown | null;
  completedAt: string;
  verifiedCount: number;
  strength: TraceStrength;
  vitality: TraceVitality;
  narrative: string;
}

const VITALITY_FRESH_DAYS = 30;
const VITALITY_SETTLING_DAYS = 90;

function daysSince(iso: string, now: Date): number {
  const then = new Date(iso).getTime();
  const nowMs = now.getTime();
  return Math.floor((nowMs - then) / 86_400_000);
}

export function deriveTraceStrength(verifiedCount: number): TraceStrength {
  if (verifiedCount >= 5) return "landmark";
  if (verifiedCount >= 2) return "settled";
  return "faint";
}

export function deriveTraceVitality(completedAt: string, now: Date): TraceVitality {
  const days = daysSince(completedAt, now);
  if (days <= VITALITY_FRESH_DAYS) return "fresh";
  if (days <= VITALITY_SETTLING_DAYS) return "settling";
  return "dormant";
}

export function deriveCivicTrace(input: CivicTraceInput): CivicTrace | null {
  if (!input.completedAt || input.verifiedCount < 1) return null;

  const strength = deriveTraceStrength(input.verifiedCount);
  const vitality = deriveTraceVitality(input.completedAt, new Date());

  const narrative = buildTraceNarrative(strength, vitality, input.title, input.district);

  return {
    initiativeId: input.initiativeId,
    title: input.title,
    districtSlug: input.districtSlug,
    district: input.district,
    region: input.region,
    category: input.category,
    coords: input.coords,
    boundary: input.boundary,
    completedAt: input.completedAt,
    verifiedCount: input.verifiedCount,
    strength,
    vitality,
    narrative,
  };
}

function buildTraceNarrative(
  strength: TraceStrength,
  vitality: TraceVitality,
  title: string,
  district: string,
): string {
  const when =
    vitality === "fresh" ? "recién" : vitality === "settling" ? "recientemente" : "anteriormente";

  switch (strength) {
    case "faint":
      return `Se completó una ruta en ${district} (${title}). Hay registro de participación, pero la huella aún es tenue.`;
    case "settled":
      return `Ruta completada en ${district} (${title}). La participación ha dejado una huella visible ${when}.`;
    case "landmark":
      return `${district} tiene un hito cívico: ${title}. Múltiples personas verificaron esta ruta, consolidando la memoria del territorio.`;
  }
}
