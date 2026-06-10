/**
 * Civic Journey — pure projection of a user's territorial narrative.
 *
 * NO new domain models. NO I/O. NO React. Pure derivation from
 * existing types (Mission, Proposal, UserMission, User).
 *
 * The CivicJourney is NEVER persisted; it is recomputed each time
 * from canonical data (Initiative being the single source of truth).
 */

import type { Region } from "@/domain/regions";
import type { MissionCategory } from "@/domain/categories";
import type { Mission } from "@/types";
import { inferRegionFromDistrict } from "@/domain/territorial";

// ─── Primitive types ─────────────────────────────────────────────────────────

export type BeatProvenance = "event" | "derived";

export type DatePrecision = "exact" | "approximate" | "unknown";

// ─── Narrative beat kinds ────────────────────────────────────────────────────

export type NarrativeBeatKind =
  | "first_mission"
  | "completed_mission"
  | "supported_proposal"
  | "created_proposal"
  | "proposal_converted"
  | "joined_mission"
  | "district_activated"
  | "region_unlocked";

// ─── Narrative beat ──────────────────────────────────────────────────────────

export type NarrativeBeat = {
  kind: NarrativeBeatKind;
  title: string;
  description: string;
  timestamp: string;
  datePrecision: DatePrecision;
  provenance: BeatProvenance;
  sourceId?: string;
  sourceType?: "mission" | "proposal";
  emoji?: string;
};

// ─── Milestone ───────────────────────────────────────────────────────────────

export type Milestone = {
  kind: NarrativeBeatKind;
  title: string;
  description: string;
  timestamp: string;
  sourceId: string;
  sourceType: "mission" | "proposal";
  emoji: string;
};

// ─── Territorial footprint ───────────────────────────────────────────────────

export type TerritorialFootprint = {
  regions: Region[];
  districts: string[];
  categories: MissionCategory[];
  reach: "local" | "regional" | "national";
  missionCount: number;
  proposalCount: number;
  districtCount: number;
};

// ─── Journey phase ───────────────────────────────────────────────────────────

export type JourneyPhase =
  | "primer_paso"
  | "explorando"
  | "organizando"
  | "construyendo"
  | "tejiendo_territorio"
  | "en_pausa";

export const JOURNEY_PHASE_LABELS: Record<JourneyPhase, string> = {
  primer_paso: "Primer paso",
  explorando: "Explorando",
  organizando: "Organizando",
  construyendo: "Construyendo",
  tejiendo_territorio: "Tejiendo territorio",
  en_pausa: "En pausa",
};

// ─── Journey arc ─────────────────────────────────────────────────────────────

export type JourneyArc = {
  phase: JourneyPhase;
  phaseLabel: string;
  beats: NarrativeBeat[];
  milestones: Milestone[];
  prologue: NarrativeBeat[];
  totalBeats: number;
  totalMilestones: number;
  isDormant: boolean;
};

// ─── Civic journey (top-level projection) ────────────────────────────────────

export type CivicJourney = {
  footprint: TerritorialFootprint;
  arc: JourneyArc;
};

// ─── Input types ─────────────────────────────────────────────────────────────

export type TerritorialFootprintInput = {
  missions: Pick<Mission, "id" | "district" | "region" | "category">[];
  proposals: Array<{
    id: string;
    district: string;
    category: string;
    region: Region;
  }>;
  userDistrict: string;
};

export type CivicJourneyInput = {
  userMissions: Array<{
    id: string;
    missionId: string;
    status: "in_progress" | "completed";
    joinedAt: string | null;
    completedAt: string | null;
    mission: Pick<
      Mission,
      "id" | "title" | "district" | "region" | "category" | "startDate" | "endDate"
    >;
  }>;
  supportedProposals: Array<{
    id: string;
    title: string;
    createdAt: string;
  }>;
  userProposals: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    convertedAt: string | null;
  }>;
  userDistrict: string;
};

// ─── Pure helpers ────────────────────────────────────────────────────────────

function parseTimestamp(ts: string | null | undefined): number {
  if (!ts) return 0;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

// ─── deriveTerritorialFootprint ──────────────────────────────────────────────

export function deriveTerritorialFootprint(input: TerritorialFootprintInput): TerritorialFootprint {
  const { missions, proposals, userDistrict } = input;

  const allMissions = missions ?? [];
  const allProposals = proposals ?? [];

  const regionSet = new Set<Region>();
  const districtSet = new Set<string>();
  const categorySet = new Set<MissionCategory>();

  const addDistrict = (d: string) => {
    if (!d) return;
    districtSet.add(d.toLowerCase());
    regionSet.add(inferRegionFromDistrict(d));
  };

  addDistrict(userDistrict);

  for (const m of allMissions) {
    if (m.region) regionSet.add(m.region);
    if (m.district) addDistrict(m.district);
    if (m.category) categorySet.add(m.category);
  }

  for (const p of allProposals) {
    if (p.region) regionSet.add(p.region);
    if (p.district) addDistrict(p.district);
    if (p.category && isMissionCategory(p.category)) categorySet.add(p.category);
  }

  const regions = Array.from(regionSet);
  const districts = Array.from(districtSet);
  const categories = Array.from(categorySet);

  let reach: TerritorialFootprint["reach"] = "local";
  if (regions.length >= 3) {
    reach = "national";
  } else if (regions.length >= 2) {
    reach = "regional";
  }

  return {
    regions,
    districts,
    categories,
    reach,
    missionCount: allMissions.length,
    proposalCount: allProposals.length,
    districtCount: districts.length,
  };
}

function isMissionCategory(value: string): value is MissionCategory {
  return [
    "Medio ambiente",
    "Educación",
    "Arte & cultura",
    "Comunidad",
    "Salud",
    "Tecnología",
  ].includes(value);
}

// ─── deriveCivicJourney ──────────────────────────────────────────────────────

function makeTimestampMeta(
  exactTs: string | null | undefined,
  fallbackTs: string | null | undefined,
): { timestamp: string; datePrecision: DatePrecision; provenance: BeatProvenance } {
  if (exactTs) {
    return { timestamp: exactTs, datePrecision: "exact", provenance: "event" };
  }
  if (fallbackTs) {
    return { timestamp: fallbackTs, datePrecision: "approximate", provenance: "derived" };
  }
  return { timestamp: "", datePrecision: "unknown", provenance: "derived" };
}

export function deriveCivicJourney(input: CivicJourneyInput, now?: number): CivicJourney {
  const beats: NarrativeBeat[] = [];
  const prologue: NarrativeBeat[] = [];
  const milestones: Milestone[] = [];
  const seenDistricts = new Set<string>();
  const seenRegions = new Set<Region>();

  const recordRegion = (region: Region) => {
    if (!seenRegions.has(region)) {
      seenRegions.add(region);
      prologue.push({
        kind: "region_unlocked",
        title: region,
        description:
          region === "costa" ? "Costeando" : region === "sierra" ? "Ascendiendo" : "Selva adentro",
        timestamp: "",
        datePrecision: "unknown",
        provenance: "derived",
        emoji: region === "costa" ? "🌊" : region === "sierra" ? "⛰️" : "🌳",
      });
    }
  };

  const recordDistrict = (
    district: string,
    ts: string,
    precision: DatePrecision,
    prov: BeatProvenance,
  ) => {
    const key = district.toLowerCase();
    if (!seenDistricts.has(key)) {
      seenDistricts.add(key);
      const region = inferRegionFromDistrict(district);
      const beat: NarrativeBeat = {
        kind: "district_activated",
        title: district,
        description: region,
        timestamp: ts,
        datePrecision: precision,
        provenance: prov,
        sourceType: "mission",
        emoji: "📍",
      };
      if (precision === "unknown") {
        prologue.push(beat);
      } else {
        beats.push(beat);
      }
      recordRegion(region);
    }
  };

  const joinedMissions = [...input.userMissions].sort(
    (a, b) => parseTimestamp(a.joinedAt) - parseTimestamp(b.joinedAt),
  );

  for (const um of joinedMissions) {
    const meta = makeTimestampMeta(um.joinedAt, um.mission.startDate);
    const district = um.mission.district;
    const region = um.mission.region;

    if (district) recordDistrict(district, meta.timestamp, meta.datePrecision, meta.provenance);

    const beat: NarrativeBeat = {
      kind: "joined_mission",
      title: um.mission.title,
      description: district ?? region ?? "",
      timestamp: meta.timestamp,
      datePrecision: meta.datePrecision,
      provenance: meta.provenance,
      sourceId: um.missionId,
      sourceType: "mission",
      emoji: "🚀",
    };

    if (meta.datePrecision === "unknown") {
      prologue.push(beat);
    } else {
      beats.push(beat);
    }

    if (um.status === "completed" && um.completedAt) {
      const cm: NarrativeBeat = {
        kind: "completed_mission",
        title: um.mission.title,
        description: district ?? region ?? "",
        timestamp: um.completedAt,
        datePrecision: "exact",
        provenance: "event",
        sourceId: um.missionId,
        sourceType: "mission",
        emoji: "✅",
      };
      beats.push(cm);

      milestones.push({
        kind: "completed_mission",
        title: um.mission.title,
        description: district ?? region ?? "",
        timestamp: um.completedAt,
        sourceId: um.missionId,
        sourceType: "mission",
        emoji: "✅",
      });
    }
  }

  const sortedProposals = [...input.supportedProposals].sort(
    (a, b) => parseTimestamp(a.createdAt) - parseTimestamp(b.createdAt),
  );

  for (const sp of sortedProposals) {
    beats.push({
      kind: "supported_proposal",
      title: sp.title,
      description: "",
      timestamp: sp.createdAt,
      datePrecision: "exact",
      provenance: "event",
      sourceId: sp.id,
      sourceType: "proposal",
      emoji: "💜",
    });
  }

  const sortedUserProposals = [...input.userProposals].sort(
    (a, b) => parseTimestamp(a.createdAt) - parseTimestamp(b.createdAt),
  );

  for (const up of sortedUserProposals) {
    beats.push({
      kind: "created_proposal",
      title: up.title,
      description: "",
      timestamp: up.createdAt,
      datePrecision: "exact",
      provenance: "event",
      sourceId: up.id,
      sourceType: "proposal",
      emoji: "✨",
    });

    milestones.push({
      kind: "created_proposal",
      title: up.title,
      description: "",
      timestamp: up.createdAt,
      sourceId: up.id,
      sourceType: "proposal",
      emoji: "✨",
    });

    if (up.convertedAt) {
      beats.push({
        kind: "proposal_converted",
        title: up.title,
        description: "",
        timestamp: up.convertedAt,
        datePrecision: "exact",
        provenance: "event",
        sourceId: up.id,
        sourceType: "proposal",
        emoji: "🌟",
      });

      milestones.push({
        kind: "proposal_converted",
        title: up.title,
        description: "",
        timestamp: up.convertedAt,
        sourceId: up.id,
        sourceType: "proposal",
        emoji: "🌟",
      });
    }
  }

  const firstMissionBeat =
    joinedMissions.length > 0
      ? (beats.find((b) => b.kind === "joined_mission") ??
        prologue.find((b) => b.kind === "joined_mission"))
      : null;

  if (firstMissionBeat) {
    milestones.push({
      kind: "first_mission",
      title: firstMissionBeat.title,
      description: "",
      timestamp: firstMissionBeat.timestamp || "",
      sourceId: firstMissionBeat.sourceId ?? "",
      sourceType: "mission",
      emoji: "🎯",
    });
  }

  const totalBeats = beats.length;
  const totalMilestones = milestones.length;

  const hasCompletedMissions = input.userMissions.some((um) => um.status === "completed");
  const hasCreatedProposals = input.userProposals.length > 0;
  const hasAnyActivity =
    joinedMissions.length > 0 || sortedProposals.length > 0 || sortedUserProposals.length > 0;

  const footprint = deriveTerritorialFootprint({
    missions: input.userMissions.map((um) => ({
      id: um.mission.id,
      district: um.mission.district,
      region: um.mission.region,
      category: um.mission.category,
    })),
    proposals: [
      ...input.userProposals.map((p) => ({
        id: p.id,
        district: input.userDistrict,
        category: "",
        region: inferRegionFromDistrict(input.userDistrict),
      })),
      ...input.supportedProposals.map((sp) => ({
        id: sp.id,
        district: input.userDistrict,
        category: "",
        region: inferRegionFromDistrict(input.userDistrict),
      })),
    ],
    userDistrict: input.userDistrict,
  });

  const basePhase = derivePhase({
    hasCompletedMissions,
    hasCreatedProposals,
    regions: footprint.regions,
    hasAnyActivity,
  });

  const dormant = isDormant(input, beats, now);
  const phase = dormant && basePhase !== "primer_paso" ? "en_pausa" : basePhase;

  return {
    footprint,
    arc: {
      phase,
      phaseLabel: JOURNEY_PHASE_LABELS[phase],
      beats,
      milestones,
      prologue,
      totalBeats,
      totalMilestones,
      isDormant: dormant,
    },
  };
}

// ─── Phase derivation ────────────────────────────────────────────────────────

type PhaseInput = {
  hasCompletedMissions: boolean;
  hasCreatedProposals: boolean;
  regions: Region[];
  hasAnyActivity: boolean;
};

function derivePhase(input: PhaseInput): JourneyPhase {
  if (input.hasCreatedProposals) return "organizando";
  if (input.hasCompletedMissions) return "construyendo";
  if (input.regions.length >= 2) return "tejiendo_territorio";
  if (input.hasAnyActivity) return "explorando";
  return "primer_paso";
}

// ─── Dormancy ────────────────────────────────────────────────────────────────

/**
 * Pure dormancy check — reuses the same business logic as detectDormancy
 * but accepts an explicit `now` parameter for deterministic testing.
 */
export function computeIsDormant(
  input: CivicJourneyInput,
  datedBeats: NarrativeBeat[],
  now?: number,
): boolean {
  const timestamps = datedBeats
    .map((b) => b.timestamp)
    .filter(Boolean)
    .sort();
  const lastActivityAt = timestamps.length > 0 ? timestamps[timestamps.length - 1] : null;

  const total = input.userMissions.length + input.userProposals.length;
  if (total === 0) return false;

  if (!lastActivityAt) return false;

  const nowMs = now ?? Date.now();
  const then = new Date(lastActivityAt).getTime();
  const daysSince = Math.floor((nowMs - then) / (1000 * 60 * 60 * 24));

  if (daysSince <= 30) return false;
  if (daysSince <= 60) {
    const hasActiveProposals = input.userProposals.some((p) => p.status === "pending");
    return !hasActiveProposals;
  }

  if (daysSince > 60) {
    const hasActiveProposals = input.userProposals.some((p) => p.status === "pending");
    if (hasActiveProposals) return false;
    return true;
  }

  return false;
}

const isDormant = computeIsDormant;
