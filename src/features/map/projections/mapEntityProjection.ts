import type { InitiativeMapEntity } from "@/domain/initiativeMapEntity";
import type { Initiative } from "@/domain/initiative";
import { getLifecyclePresentation } from "@/domain/lifecyclePresentation";
import { isValidLatLng } from "../utils/projection";
import type { TerritorialImpactSummary } from "@/domain/territoryAggregations";

// ─── Marker Projection ──────────────────────────────────────────────────────

export type MapMarkerProjection = {
  id: string;
  coords: { lat: number; lng: number } | null;
  sourceType: "mission" | "proposal";
  region: string;
  lifecycle: string;
  emoji: string;
  title: string;
  district: string;
};

export function projectMapMarker(entity: InitiativeMapEntity): MapMarkerProjection | null {
  const coords = entity.location?.coords ?? null;
  if (!coords || !isValidLatLng(coords.lat, coords.lng)) return null;

  return {
    id: entity.id,
    coords,
    sourceType: entity.sourceType,
    region: entity.region,
    lifecycle: entity.lifecycle,
    emoji: entity.emoji,
    title: entity.title,
    district: entity.location?.district ?? entity.region,
  };
}

// ─── Sidebar Projection ─────────────────────────────────────────────────────

export type SidebarItemProjection = {
  id: string;
  region: string;
  emoji: string;
  category: string;
  title: string;
  district: string;
  summary: string;
  xp: number | null;
  spotsLeft: number | null;
  difficulty: string | null;
  impact: string | null;
  organizerName: string | null;
  organizerAvatar: string | null;
  temporalLabel: string;
};

export function projectMapSidebarItem(entity: InitiativeMapEntity): SidebarItemProjection {
  return {
    id: entity.id,
    region: entity.region,
    emoji: entity.emoji,
    category: entity.category,
    title: entity.title,
    district: entity.location?.district ?? entity.region,
    summary: entity.summary,
    xp: entity.xp,
    spotsLeft: entity.spotsLeft,
    difficulty: entity.difficulty,
    impact: entity.impact,
    organizerName: entity.organizerName,
    organizerAvatar: entity.organizerAvatar,
    temporalLabel: entity.temporalAnchor.label,
  };
}

// ─── Drawer Projection ──────────────────────────────────────────────────────

export type DrawerItemProjection = SidebarItemProjection;

export function projectMapDrawerItem(entity: InitiativeMapEntity): DrawerItemProjection {
  return projectMapSidebarItem(entity);
}

// ─── Lifecycle helpers ──────────────────────────────────────────────────────

export function getEntityPresentation(entity: InitiativeMapEntity) {
  return getLifecyclePresentation(entity.lifecycle);
}

export function isProposalEntity(entity: InitiativeMapEntity): boolean {
  return entity.sourceType === "proposal";
}

export function isMissionEntity(entity: InitiativeMapEntity): boolean {
  return entity.sourceType === "mission";
}

export function entityDetailRoute(entity: InitiativeMapEntity): string {
  const base = entity.sourceType === "mission" ? "/app/mision" : "/app/propuesta";
  return `${base}/${entity.id}`;
}

export function buildMapEntitySummary(entities: InitiativeMapEntity[]): TerritorialImpactSummary {
  let missionCount = 0;
  let completedMissionCount = 0;
  let proposalCount = 0;
  let activeProposalCount = 0;
  let lastActivityAt: string | null = null;
  let recentProposalCount = 0;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  let supporterSum = 0;
  let collaboratorSum = 0;

  for (const e of entities) {
    if (e.sourceType === "mission") {
      missionCount++;
      if (e.lifecycle === "completed") completedMissionCount++;
      if (e.participants != null) collaboratorSum += e.participants;
    } else {
      proposalCount++;
      if (e.lifecycle === "forming") activeProposalCount++;
      if (e.date && new Date(e.date) > thirtyDaysAgo) recentProposalCount++;
    }

    supporterSum += e.supportCount;
    if (e.date && (!lastActivityAt || e.date > lastActivityAt)) {
      lastActivityAt = e.date;
    }
  }

  return {
    missionCount,
    completedMissionCount,
    proposalCount,
    activeProposalCount,
    uniqueSupporterCount: supporterSum,
    acceptedCollaboratorCount: collaboratorSum,
    lastActivityAt,
    recentProposalCount: recentProposalCount > 0 ? recentProposalCount : undefined,
  };
}
/**
 * Converts InitiativeMapEntity to Initiative for use with action domain.
 * Fields not present on InitiativeMapEntity (participantsCount) are mapped
 * from the closest equivalent (participants).
 */
export function mapEntityToActionInitiative(entity: InitiativeMapEntity): Initiative {
  return {
    id: entity.id,
    sourceType: entity.sourceType,
    sourceId: entity.sourceId,
    title: entity.title,
    summary: entity.summary,
    category: entity.category,
    region: entity.region,
    lifecycle: entity.lifecycle,
    emoji: entity.emoji,
    temporalAnchor: entity.temporalAnchor,
    location: entity.location ?? undefined,
    participantsCount: entity.participants ?? undefined,
    supportersCount: entity.supportersCount,
    vitalityScore: entity.vitalityScore ?? undefined,
  };
}
