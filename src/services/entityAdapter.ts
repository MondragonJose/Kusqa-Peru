/**
 * Entity Adapter — Converts domain types to entity rendering contracts.
 *
 * Phase 10D: ProposalEntity is now a native shape with only proposal
 * fields — no synthetic Mission fields (xp, participants, difficulty).
 */

import type { Proposal } from "@/services/proposalContract";
import type { Mission } from "@/types";
import type { ProposalEntity, CivicEntity } from "@/types/entity";
import { computeLifecycleInfo } from "@/domain/lifecycle";

const CATEGORY_EMOJI: Record<string, string> = {
  "Medio ambiente": "🌱",
  Educación: "📚",
  "Arte & cultura": "🎨",
  Comunidad: "🤝",
  Salud: "❤️",
  Tecnología: "🏗️",
};

/**
 * Convert Proposal to native ProposalEntity.
 * Returns null if the proposal lacks coordinates (for map rendering).
 */
export function proposalToEntity(proposal: Proposal): ProposalEntity | null {
  const coords =
    proposal.latitude != null && proposal.longitude != null
      ? { lat: proposal.latitude, lng: proposal.longitude }
      : null;

  if (!coords) return null;

  return {
    entityType: "proposal",
    id: proposal.id,
    proposalId: proposal.id,
    title: proposal.title,
    description: proposal.description,
    category: proposal.category,
    district: proposal.district,
    districtId: proposal.districtId ?? null,
    region: proposal.region,
    spotsLeft: proposal.teamSize,
    date: proposal.createdAt,
    emoji: CATEGORY_EMOJI[proposal.category] ?? "📌",
    coords,
    lifecycleInfo: computeLifecycleInfo(null, null),
    _proposal: proposal,
  };
}

/**
 * Convert Mission to CivicEntity with entityType discriminator.
 */
export function missionToEntity(mission: Mission): CivicEntity {
  return { ...mission, entityType: "mission" };
}
