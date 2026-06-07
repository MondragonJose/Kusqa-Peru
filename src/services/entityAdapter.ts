/**
 * Entity Adapter — Single place to convert between domain types.
 *
 * Responsibilities:
 *   - proposalToEntity(): Proposal → CivicEntity with entityType
 *   - missionToEntity(): Mission → CivicEntity with entityType
 *   - Consistent emoji mapping, district derivation, etc.
 *
 * Phase 4C cleanup:
 *   - Removed proposalToMission (no external callers; use proposalToEntity
 *     and read the inner Mission if needed via _proposal).
 *   - Removed getCategoryEmoji (no callers).
 *   - Added districtId passthrough so the entity carries the FK.
 */

import type { Proposal } from "@/services/proposalContract";
import type { Mission, MissionCategory, MissionDifficulty } from "@/types";
import type { CivicEntity } from "@/types/entity";
import { computeLifecycleInfo } from "@/domain/lifecycle";

/**
 * Category → Emoji mapping.
 * Shared across missions and proposals for visual consistency.
 */
const CATEGORY_EMOJI: Record<string, string> = {
  "Medio ambiente": "🌱",
  Educación: "📚",
  "Arte & cultura": "🎨",
  Comunidad: "🤝",
  Salud: "❤️",
  Tecnología: "🏗️",
};

/**
 * Internal: lift a Proposal into a synthetic Mission-shape.
 * Not exported — proposalToEntity is the only public entry point.
 * Returns null if the proposal lacks coordinates (which the
 * public-facing renderer needs for the map).
 */
function adaptProposalToMission(proposal: Proposal): Mission | null {
  if (proposal.latitude == null || proposal.longitude == null) {
    return null;
  }

  return {
    id: proposal.id,
    title: proposal.title,
    description: proposal.description ?? proposal.title,
    district: proposal.district,
    districtId: proposal.districtId ?? null,
    region: proposal.region,
    category: proposal.category as MissionCategory,
    xp: 0,
    participants: 0,
    spotsLeft: proposal.teamSize,
    date: proposal.createdAt,
    distanceKm: 0,
    impact: proposal.description ?? proposal.title,
    difficulty: "Suave" as MissionDifficulty,
    organizer: { name: "Propuesta ciudadana", avatar: "🏛️" },
    coords: { lat: proposal.latitude, lng: proposal.longitude },
    emoji: CATEGORY_EMOJI[proposal.category] ?? "📌",
    startDate: null,
    endDate: null,
    lifecycleInfo: computeLifecycleInfo(null, null),
  };
}

/**
 * Convert Proposal to CivicEntity with entityType discriminator.
 * Returns null if the proposal lacks coordinates.
 */
export function proposalToEntity(proposal: Proposal): CivicEntity | null {
  const mission = adaptProposalToMission(proposal);
  if (!mission) {
    return null;
  }
  const entity: CivicEntity = {
    ...mission,
    entityType: "proposal",
    proposalId: proposal.id,
    _proposal: proposal,
  };
  return entity;
}

/**
 * Convert Mission to CivicEntity with entityType discriminator.
 */
export function missionToEntity(mission: Mission): CivicEntity {
  const entity: CivicEntity = {
    ...mission,
    entityType: "mission",
  };
  return entity;
}
