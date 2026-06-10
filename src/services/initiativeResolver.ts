/**
 * Initiative Resolver — non-destructive read layer over missions and proposals.
 *
 * Resolution strategy:
 *   1. Fetch missions from missionRepository
 *   2. Fetch proposals from proposalRepository
 *   3. Map each to the unified Initiative shape
 *
 * This NEVER writes to any table. All existing mission/proposal storage is
 * untouched. The resolver is purely a read projection.
 *
 * Feature flag: VITE_USE_INITIATIVE_READ_MODEL
 *   When disabled, callers should use existing Mission/Proposal types directly.
 *   When enabled, consumers can switch to the unified Initiative shape.
 */

import type { Initiative, InitiativeLifecycle, InitiativeLocation, TemporalAnchor } from "@/domain/initiative";
import {
  deriveLifecycleFromMission,
  deriveLifecycleFromProposal,
  computeMissionAnchor,
  computeProposalAnchor,
} from "@/domain/initiative";
import type { Mission } from "@/types";
import type { Proposal } from "@/services/proposalContract";
import { missionRepository } from "@/services/missionRepository";
import { proposalRepository } from "@/services/proposalRepository";
import type { MissionCategory } from "@/domain/categories";
import { categoryEmoji } from "@/domain/categories";
import { getProposalThreshold } from "@/domain/proposalLifecycle";
import { buildMapEntity, type InitiativeMapEntity } from "@/domain/initiativeMapEntity";

// ─── Mappers ────────────────────────────────────────────────────────────────

function missionToInitiative(mission: Mission): Initiative {
  const lifecycle = deriveLifecycleFromMission(mission.lifecycleInfo.lifecycle);

  const location: InitiativeLocation = {
    district: mission.district,
    districtId: mission.districtId ?? null,
    region: mission.region,
    coords: mission.coords,
    locationLabel: null,
  };

  const temporalAnchor: TemporalAnchor = computeMissionAnchor(
    mission.lifecycleInfo,
    mission.startDate,
    mission.endDate,
  );

  return {
    id: `mission_${mission.id}`,
    sourceType: "mission",
    sourceId: mission.id,
    title: mission.title,
    summary: mission.description,
    category: mission.category,
    region: mission.region,
    lifecycle,
    participantsCount: mission.participants,
    temporalAnchor,
    emoji: mission.emoji,
    location,
  };
}

function proposalToInitiative(proposal: Proposal): Initiative {
  const threshold = getProposalThreshold(proposal.teamSize);
  const lifecycle = deriveLifecycleFromProposal(
    proposal.status,
    proposal.convertedAt,
    proposal.completedAt,
  );

  const location: InitiativeLocation = {
    district: proposal.district,
    districtId: proposal.districtId ?? null,
    region: proposal.region,
    coords: proposal.latitude != null && proposal.longitude != null
      ? { lat: Number(proposal.latitude), lng: Number(proposal.longitude) }
      : null,
    locationLabel: proposal.locationLabel ?? null,
  };

  const temporalAnchor: TemporalAnchor = computeProposalAnchor(
    proposal.status,
    proposal.proposedDate,
    proposal.createdAt,
    proposal.convertedAt,
    proposal.completedAt,
    0, // supportCount — enricher fills this
    threshold,
  );

  return {
    id: `proposal_${proposal.id}`,
    sourceType: "proposal",
    sourceId: proposal.id,
    title: proposal.title,
    summary: proposal.summary ?? proposal.description ?? proposal.title,
    category: proposal.category as MissionCategory,
    region: proposal.region,
    lifecycle,
    supportersCount: 0, // enricher fills this
    temporalAnchor,
    emoji: categoryEmoji(proposal.category as MissionCategory),
    location,
  };
}

// ─── Enricher: fills live counts from repositories ──────────────────────────

async function enrichInitiative(
  initiative: Initiative,
): Promise<Initiative> {
  if (initiative.sourceType === "mission") {
    try {
      const stats = await proposalRepository.getSupportStats(initiative.sourceId);
      return { ...initiative, vitalityScore: stats.supportCount > 0 ? 5 : 0 };
    } catch {
      return initiative;
    }
  }

  if (initiative.sourceType === "proposal") {
    try {
      const stats = await proposalRepository.getSupportStats(initiative.sourceId);
      return {
        ...initiative,
        supportersCount: stats.supportCount,
        vitalityScore: stats.supportCount > 0 ? Math.min(10, stats.supportCount) : 0,
      };
    } catch {
      return initiative;
    }
  }

  return initiative;
}

// ─── Filters ────────────────────────────────────────────────────────────────

export type InitiativeFilter = {
  region?: string;
  category?: string;
  lifecycle?: InitiativeLifecycle;
  district?: string;
  sourceType?: "mission" | "proposal";
};

function applyFilters(initiatives: Initiative[], filters?: InitiativeFilter): Initiative[] {
  if (!filters) return initiatives;

  return initiatives.filter((i) => {
    if (filters.region && i.region !== filters.region) return false;
    if (filters.category && i.category !== filters.category) return false;
    if (filters.lifecycle && i.lifecycle !== filters.lifecycle) return false;
    if (filters.district && i.location?.district !== filters.district) return false;
    if (filters.sourceType && i.sourceType !== filters.sourceType) return false;
    return true;
  });
}

// ─── Resolver ───────────────────────────────────────────────────────────────

async function resolveAll(filters?: InitiativeFilter): Promise<Initiative[]> {
  const [missions, proposals] = await Promise.all([
    missionRepository.findAll(),
    proposalRepository.getAllProposals(),
  ]);

  const initiativeList: Initiative[] = [
    ...missions.map(missionToInitiative),
    ...proposals.map(proposalToInitiative),
  ];

  const filtered = applyFilters(initiativeList, filters);

  return filtered;
}

async function resolveById(initiativeId: string): Promise<Initiative | null> {
  // Parse the sourceType prefix: "mission_<uuid>" or "proposal_<uuid>"
  const missionPrefix = "mission_";
  const proposalPrefix = "proposal_";

  if (initiativeId.startsWith(missionPrefix)) {
    const sourceId = initiativeId.slice(missionPrefix.length);
    const mission = await missionRepository.findById(sourceId);
    if (!mission) return null;
    return missionToInitiative(mission);
  }

  if (initiativeId.startsWith(proposalPrefix)) {
    const sourceId = initiativeId.slice(proposalPrefix.length);
    const proposal = await proposalRepository.getProposalById(sourceId);
    if (!proposal) return null;
    return proposalToInitiative(proposal);
  }

  // Try bare UUID — check missions first, then proposals
  const mission = await missionRepository.findById(initiativeId);
  if (mission) return missionToInitiative(mission);

  const proposal = await proposalRepository.getProposalById(initiativeId);
  if (proposal) return proposalToInitiative(proposal);

  return null;
}

async function resolveWithEnrichment(
  initiativeId: string,
): Promise<Initiative | null> {
  const base = await resolveById(initiativeId);
  if (!base) return null;
  return enrichInitiative(base);
}

async function resolveAllWithEnrichment(
  filters?: InitiativeFilter,
): Promise<Initiative[]> {
  const base = await resolveAll(filters);
  return Promise.all(base.map(enrichInitiative));
}

async function resolveMapEntities(filters?: InitiativeFilter): Promise<InitiativeMapEntity[]> {
  const [missions, proposals] = await Promise.all([
    missionRepository.findAll(),
    proposalRepository.getAllProposals(),
  ]);

  let entities: InitiativeMapEntity[] = [
    ...missions.map((m) => buildMapEntity({ type: "mission", mission: m })),
    ...proposals.map((p) => buildMapEntity({ type: "proposal", proposal: p })),
  ];

  if (filters) {
    entities = entities.filter((e) => {
      if (filters.region && e.region !== filters.region) return false;
      if (filters.category && e.category !== filters.category) return false;
      if (filters.lifecycle && e.lifecycle !== filters.lifecycle) return false;
      if (filters.district && e.location?.district !== filters.district) return false;
      if (filters.sourceType && e.sourceType !== filters.sourceType) return false;
      return true;
    });
  }

  return entities;
}

export const initiativeResolver = {
  resolveAll,
  resolveById,
  resolveWithEnrichment,
  resolveAllWithEnrichment,
  resolveMapEntities,
};
