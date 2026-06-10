/**
 * AmbientSignal — lightweight read model for territory mood.
 *
 * Reuses TerritorialEvent, DistrictVitality, SpatialNarrativeSignal.
 * No new tables, queries, or analytics.
 *
 * Three derivations:
 *   1. AmbientCadence  — temporal rhythm (pulse, recency, diversity)
 *   2. AmbientSignal   — mood + energy + tone + cadence
 *   3. AmbientPulse    — full ambient read model with cross-references
 */

import type { TerritorialEvent } from "./territorialEvent";
import type { DistrictVitality, SpatialNarrativeSignal } from "./territorialIntelligence";

// ─── AmbientCadence ───────────────────────────────────────────────────

export type AmbientPulseCadence = "calm" | "steady" | "lively" | "intense";

export type AmbientCadence = {
  pulse: AmbientPulseCadence;
  eventsLast7d: number;
  eventsLast30d: number;
  uniqueActors: number;
  diversity: number;
  lastActivityAt: string | null;
};

// ─── AmbientSignal ────────────────────────────────────────────────────

export type AmbientMood = "quiet" | "hopeful" | "awakening" | "vibrant" | "determined";

export type AmbientSignal = {
  mood: AmbientMood;
  energy: number;
  tone: string;
  cadence: AmbientCadence;
};

// ─── AmbientPulse — full read model ───────────────────────────────────

export type AmbientPulse = {
  districtSlug: string;
  districtName: string;
  signal: AmbientSignal;
  vitalityRef: DistrictVitality | null;
  spatialRef: SpatialNarrativeSignal[] | null;
};

// ─── Resolver: AmbientCadence ─────────────────────────────────────────

function daysAgo(isoString: string): number {
  const then = new Date(isoString).getTime();
  const now = Date.now();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

export function deriveAmbientCadence(events: TerritorialEvent[]): AmbientCadence {
  if (events.length === 0) {
    return {
      pulse: "calm",
      eventsLast7d: 0,
      eventsLast30d: 0,
      uniqueActors: 0,
      diversity: 0,
      lastActivityAt: null,
    };
  }

  let eventsLast7d = 0;
  let eventsLast30d = 0;
  const actorSet = new Set<string>();
  const typeSet = new Set<string>();
  let latestDate: string | null = null;

  for (const ev of events) {
    const age = daysAgo(ev.createdAt);
    if (age <= 7) eventsLast7d++;
    if (age <= 30) eventsLast30d++;

    if (ev.actor.id) actorSet.add(ev.actor.id);
    typeSet.add(ev.type);

    if (!latestDate || ev.createdAt > latestDate) {
      latestDate = ev.createdAt;
    }
  }

  let pulse: AmbientPulseCadence = "calm";
  if (eventsLast7d > 5) pulse = "intense";
  else if (eventsLast7d > 2) pulse = "lively";
  else if (eventsLast7d > 0) pulse = "steady";

  return {
    pulse,
    eventsLast7d,
    eventsLast30d,
    uniqueActors: actorSet.size,
    diversity: typeSet.size,
    lastActivityAt: latestDate,
  };
}

// ─── Resolver: AmbientSignal ──────────────────────────────────────────

const MOOD_TONES: Record<AmbientMood, string> = {
  quiet: "El distrito está en calma.",
  hopeful: "Algo nuevo está germinando.",
  awakening: "El distrito está despertando.",
  vibrant: "El distrito vibra con actividad.",
  determined: "El distrito avanza con determinación.",
};

function deriveMood(events: TerritorialEvent[], cadence: AmbientCadence): AmbientMood {
  if (cadence.eventsLast30d === 0) return "quiet";

  const hasConversions = events.some(
    (e) => e.type === "proposal.converted_to_mission" || e.type === "mission.completed",
  );
  const hasNewProposals = events.some((e) => e.type === "proposal.created");

  if (hasConversions && cadence.pulse === "intense") return "determined";
  if (hasConversions) return "determined";
  if (cadence.pulse === "lively" || cadence.pulse === "intense") return "vibrant";
  if (hasNewProposals) return "hopeful";
  if (cadence.pulse === "steady") return "awakening";

  return "awakening";
}

function deriveEnergy(
  events: TerritorialEvent[],
  cadence: AmbientCadence,
  vitalityScore?: number,
): number {
  if (vitalityScore != null) return vitalityScore;

  // Lightweight energy estimation from cadence
  let score = 0;
  if (cadence.eventsLast7d > 0) score += 3;
  if (cadence.eventsLast7d > 2) score += 2;
  if (cadence.eventsLast30d > 5) score += 2;
  if (cadence.uniqueActors > 2) score += 2;
  if (cadence.diversity > 2) score += 1;

  return Math.min(10, score);
}

export function deriveAmbientSignal(
  events: TerritorialEvent[],
  vitality?: DistrictVitality,
): AmbientSignal {
  const cadence = deriveAmbientCadence(events);
  const mood = deriveMood(events, cadence);
  const energy = deriveEnergy(events, cadence, vitality?.score);

  return {
    mood,
    energy,
    tone: MOOD_TONES[mood],
    cadence,
  };
}

// ─── Resolver: AmbientPulse ───────────────────────────────────────────

export function deriveAmbientPulse(
  events: TerritorialEvent[],
  districtSlug: string,
  districtName: string,
  vitality?: DistrictVitality,
  spatialSignals?: SpatialNarrativeSignal[],
): AmbientPulse | null {
  if (events.length === 0) return null;

  return {
    districtSlug,
    districtName,
    signal: deriveAmbientSignal(events, vitality),
    vitalityRef: vitality ?? null,
    spatialRef: spatialSignals ?? null,
  };
}

// ─── Utility: adapter for pages without TerritorialEvent[] ────────────

import type { Initiative } from "./initiative";

/**
 * Converts Initiative[] to minimal TerritorialEvent[] for ambient derivation.
 */
export function initiativesToAmbientEvents(initiatives: Initiative[]): TerritorialEvent[] {
  return initiatives
    .map((i) => ({ i, refDate: i.temporalAnchor.referenceDate }))
    .filter((entry): entry is { i: Initiative; refDate: string } => entry.refDate != null)
    .map(({ i, refDate }) => ({
      id: `amb-${i.id}`,
      type: (i.sourceType === "mission"
        ? "mission.joined"
        : "proposal.created") as TerritorialEvent["type"],
      actor: { id: "", username: "", firstName: "", avatarUrl: null },
      entityType: i.sourceType,
      entityId: i.sourceId,
      entityTitle: i.title,
      districtId: i.location?.districtId ?? null,
      region: i.region,
      createdAt: refDate,
      metadata: {},
    }));
}

/**
 * Groups TerritorialEvent[] by a key function.
 * Useful for per-district ambient derivation on the map page.
 */
export function groupEventsByDistrict(
  events: TerritorialEvent[],
  getDistrict: (e: TerritorialEvent) => string,
): Map<string, TerritorialEvent[]> {
  const grouped = new Map<string, TerritorialEvent[]>();
  for (const ev of events) {
    const key = getDistrict(ev).toLowerCase().trim();
    if (!key) continue;
    const list = grouped.get(key);
    if (list) list.push(ev);
    else grouped.set(key, [ev]);
  }
  return grouped;
}
