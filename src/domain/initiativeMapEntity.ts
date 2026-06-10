import type { Mission } from "@/types";
import type { MissionDifficulty } from "@/types/common";
import type { Proposal } from "@/services/proposalContract";
import type { Region } from "@/domain/regions";
import type { MissionCategory } from "@/domain/categories";
import type {
  Initiative,
  InitiativeLifecycle,
  InitiativeLocation,
  TemporalAnchor,
} from "@/domain/initiative";
import {
  deriveLifecycleFromMission,
  deriveLifecycleFromProposal,
  computeMissionAnchor,
  computeProposalAnchor,
} from "@/domain/initiative";
import { categoryEmoji } from "@/domain/categories";
import { getProposalThreshold } from "@/domain/proposalLifecycle";

// ─── MissionCompat ──────────────────────────────────────────────────────────

export type MissionCompat = {
  xp: number;
  difficulty: MissionDifficulty;
  impact: string;
  organizerName: string;
  organizerAvatar: string;
  participants: number;
  spotsLeft: number;
  distanceKm: number;
  date: string;
};

// ─── InitiativeMapEntity ────────────────────────────────────────────────────

export type InitiativeMapEntity = {
  id: string;
  prefixedId: string;
  sourceType: "mission" | "proposal";
  sourceId: string;

  title: string;
  summary: string;
  category: MissionCategory;
  region: Region;
  lifecycle: InitiativeLifecycle;
  emoji: string;

  location: InitiativeLocation | null;
  temporalAnchor: TemporalAnchor;

  supportCount: number;
  supportersCount: number;
  vitalityScore: number | null;

  xp: number | null;
  difficulty: string | null;
  impact: string | null;
  organizerName: string | null;
  organizerAvatar: string | null;
  participants: number | null;
  spotsLeft: number | null;
  distanceKm: number | null;
  date: string | null;

  original: Mission | Proposal | Initiative;
};

// ─── Discriminated input ────────────────────────────────────────────────────

export type MapEntityInput =
  | { type: "mission"; mission: Mission; supportCount?: number }
  | { type: "proposal"; proposal: Proposal; supportCount?: number }
  | { type: "initiative"; initiative: Initiative; missionCompat?: MissionCompat };

// ─── Builder ────────────────────────────────────────────────────────────────

export function buildMapEntity(input: MapEntityInput): InitiativeMapEntity {
  switch (input.type) {
    case "mission":
      return buildFromMission(input.mission, input.supportCount);
    case "proposal":
      return buildFromProposal(input.proposal, input.supportCount);
    case "initiative":
      return buildFromInitiative(input.initiative, input.missionCompat);
  }
}

function buildFromMission(mission: Mission, supportCount?: number): InitiativeMapEntity {
  const lifecycle = deriveLifecycleFromMission(mission.lifecycleInfo.lifecycle);
  const location: InitiativeLocation = {
    district: mission.district,
    districtId: mission.districtId ?? null,
    region: mission.region,
    coords: mission.coords,
    locationLabel: null,
  };
  const temporalAnchor = computeMissionAnchor(
    mission.lifecycleInfo,
    mission.startDate,
    mission.endDate,
  );
  const count = supportCount ?? 0;

  return {
    id: mission.id,
    prefixedId: `mission_${mission.id}`,
    sourceType: "mission",
    sourceId: mission.id,
    title: mission.title,
    summary: mission.description || mission.title,
    category: mission.category,
    region: mission.region,
    lifecycle,
    location,
    temporalAnchor,
    emoji: mission.emoji,
    supportCount: count,
    supportersCount: 0,
    vitalityScore: null,
    xp: mission.xp,
    difficulty: mission.difficulty ?? null,
    impact: mission.impact ?? null,
    organizerName: mission.organizer?.name ?? null,
    organizerAvatar: mission.organizer?.avatar ?? null,
    participants: mission.participants,
    spotsLeft: mission.spotsLeft,
    distanceKm: mission.distanceKm,
    date: mission.date ?? null,
    original: mission,
  };
}

function buildFromProposal(proposal: Proposal, supportCount?: number): InitiativeMapEntity {
  const lifecycle = deriveLifecycleFromProposal(
    proposal.status,
    proposal.convertedAt,
    proposal.completedAt,
  );
  const location: InitiativeLocation = {
    district: proposal.district,
    districtId: proposal.districtId ?? null,
    region: proposal.region,
    coords:
      proposal.latitude != null && proposal.longitude != null
        ? { lat: Number(proposal.latitude), lng: Number(proposal.longitude) }
        : null,
    locationLabel: proposal.locationLabel ?? null,
  };
  const threshold = getProposalThreshold(proposal.teamSize);
  const temporalAnchor = computeProposalAnchor(
    proposal.status,
    proposal.proposedDate,
    proposal.createdAt,
    proposal.convertedAt,
    proposal.completedAt,
    supportCount ?? 0,
    threshold,
  );
  const count = supportCount ?? 0;

  return {
    id: proposal.id,
    prefixedId: `proposal_${proposal.id}`,
    sourceType: "proposal",
    sourceId: proposal.id,
    title: proposal.title,
    summary: proposal.summary ?? proposal.description ?? proposal.title,
    category: proposal.category as MissionCategory,
    region: proposal.region,
    lifecycle,
    location,
    temporalAnchor,
    emoji: categoryEmoji(proposal.category as MissionCategory),
    supportCount: count,
    supportersCount: 0,
    vitalityScore: null,
    xp: null,
    difficulty: null,
    impact: null,
    organizerName: null,
    organizerAvatar: null,
    participants: null,
    spotsLeft: null,
    distanceKm: null,
    date: null,
    original: proposal,
  };
}

function buildFromInitiative(
  initiative: Initiative,
  missionCompat?: MissionCompat,
): InitiativeMapEntity {
  const location = initiative.location ?? null;

  return {
    id: initiative.sourceId,
    prefixedId: initiative.id,
    sourceType: initiative.sourceType,
    sourceId: initiative.sourceId,
    title: initiative.title,
    summary: initiative.summary,
    category: initiative.category,
    region: initiative.region,
    lifecycle: initiative.lifecycle,
    location,
    temporalAnchor: initiative.temporalAnchor,
    emoji: initiative.emoji,
    supportCount: initiative.supportersCount ?? 0,
    supportersCount: initiative.supportersCount ?? 0,
    vitalityScore: initiative.vitalityScore ?? null,
    xp: missionCompat?.xp ?? null,
    difficulty: missionCompat?.difficulty ?? null,
    impact: missionCompat?.impact ?? null,
    organizerName: missionCompat?.organizerName ?? null,
    organizerAvatar: missionCompat?.organizerAvatar ?? null,
    participants: missionCompat?.participants ?? null,
    spotsLeft: missionCompat?.spotsLeft ?? null,
    distanceKm: missionCompat?.distanceKm ?? null,
    date: missionCompat?.date ?? null,
    original: initiative,
  };
}

// ─── Safe helpers ───────────────────────────────────────────────────────────

export function entityRoute(entity: InitiativeMapEntity): string {
  const base = entity.sourceType === "mission" ? "/app/mision" : "/app/propuesta";
  return `${base}/${entity.id}`;
}

export function getSupportCount(entity: InitiativeMapEntity): number {
  return entity.supportCount;
}

export function getXp(entity: InitiativeMapEntity): number {
  return entity.xp ?? 0;
}
