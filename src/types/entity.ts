/**
 * Unified Entity System — Single source of truth for civic activities.
 *
 * This module defines a discriminated union approach for treating missions and proposals
 * as a single entity type in the UI layer. The key insight: for display/filtering purposes,
 * missions and adapted proposals behave identically. We differentiate them via entityType
 * to apply targeted styling and actions.
 *
 * Architecture:
 *   - EntityType: discriminator ("mission" | "proposal")
 *   - CivicEntity: discriminated union of Mission + ProposalAsEntity
 *   - Helpers: type guards, extractors
 */

import type { Mission } from "./domain";
import type { Proposal } from "@/services/proposalContract";

/**
 * Discriminator: Tells UI layer what kind of entity this is.
 * Controls button text, badges, styling, actions availability.
 */
export type EntityType = "mission" | "proposal";

/**
 * Proposal viewed as a civic entity (for display in mission contexts).
 * This is the "adapted" form that shares Mission shape for rendering.
 */
export type ProposalAsEntity = Omit<Mission, "entityType"> & {
  /** Original proposal ID (needed for mutations) */
  proposalId: string;
  /** Original proposal object reference */
  _proposal: Proposal;
};

/**
 * Discriminated union: either a real Mission or a Proposal-as-Entity.
 *
 * Usage:
 *   type Guard with entityType before accessing entity-specific fields.
 *   Example:
 *     if (entity.entityType === "mission") {
 *       // Use mission-specific features (join, progress)
 *     }
 */
export type CivicEntity =
  | (Mission & { entityType: "mission" })
  | (ProposalAsEntity & { entityType: "proposal" });

/**
 * Type guard: check if entity is a real mission.
 */
export function isMission(entity: CivicEntity): entity is Mission & { entityType: "mission" } {
  return entity.entityType === "mission";
}

/**
 * Type guard: check if entity is a proposal.
 */
export function isProposal(
  entity: CivicEntity,
): entity is ProposalAsEntity & { entityType: "proposal" } {
  return entity.entityType === "proposal";
}

/**
 * Extract entityType from any entity.
 */
export function getEntityType(entity: CivicEntity): EntityType {
  return entity.entityType;
}

/**
 * Extract original proposal if entity is a proposal, else null.
 */
export function getOriginalProposal(entity: CivicEntity): Proposal | null {
  if (isProposal(entity)) {
    return entity._proposal;
  }
  return null;
}
