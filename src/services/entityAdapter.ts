/**
 * Entity Adapter — Single place to convert between domain types.
 *
 * Responsibilities:
 *   - proposalToMission(): Proposal → Mission (original shape)
 *   - proposalToEntity(): Proposal → CivicEntity with entityType
 *   - Consistent emoji mapping, district derivation, etc.
 *
 * Benefits:
 *   - No duplication of proposalToMission logic across app.index.tsx and app.mapa.tsx
 *   - Easy to update mapping logic in one place
 *   - Type-safe with proper discriminated union
 */

import type { Proposal } from "@/services/proposalContract";
import type { Mission, MissionCategory, MissionDifficulty } from "@/types";
import type { CivicEntity, ProposalAsEntity } from "@/types/entity";

/**
 * Category → Emoji mapping.
 * Shared across missions and proposals for visual consistency.
 */
const CATEGORY_EMOJI: Record<string, string> = {
  "Medio ambiente": "🌱",
  "Educación": "📚",
  "Arte & cultura": "🎨",
  "Comunidad": "🤝",
  "Salud": "❤️",
  "Tecnología": "🏗️",
};

/**
 * Convert a Proposal to Mission shape (original adapter logic).
 * Returns null if proposal lacks coordinates.
 */
export function proposalToMission(proposal: Proposal): Mission | null {
  if (proposal.latitude == null || proposal.longitude == null) {
    return null;
  }

  return {
    id: proposal.id,
    title: proposal.title,
    description: proposal.description ?? proposal.title,
    district: proposal.district,
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
  };
}

/**
 * Convert Proposal to CivicEntity with entityType discriminator.
 * Returns null if proposal lacks coordinates.
 */
export function proposalToEntity(proposal: Proposal): CivicEntity | null {
  const mission = proposalToMission(proposal);
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

/**
 * Get emoji for category. Works for both missions and proposals.
 */
export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? "📌";
}
