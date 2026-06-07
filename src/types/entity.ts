/**
 * Unified Entity System — Single source of truth for civic activities.
 *
 * Discriminated union of Mission + Proposal-as-Entity. The discriminator
 * (`entityType: "mission" | "proposal"`) lets the UI branch without
 * unsafe casts. Phase 4C cleanup: removed dead helpers `getEntityType`
 * and `getOriginalProposal` (zero callers after the proposal→mission
 * bridge consolidation in `entityAdapter.ts`).
 */

import type { Mission } from "./domain";
import type { Proposal } from "@/services/proposalContract";

/**
 * Discriminator: tells the UI which rendering + mutation path to use.
 */
export type EntityType = "mission" | "proposal";

/**
 * Proposal viewed as a civic entity (for display in mission contexts).
 * The `_proposal` indirection is the only place we keep the original
 * Proposal — callers that need proposal-only fields read it from here.
 */
export type ProposalAsEntity = Omit<Mission, "entityType"> & {
  proposalId: string;
  _proposal: Proposal;
};

/**
 * Discriminated union: either a real Mission or a Proposal-as-Entity.
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
