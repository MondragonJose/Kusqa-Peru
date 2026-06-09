/**
 * Entity types — Native rendering contracts for civic activities.
 *
 * Phase 10D: ProposalEntity is no longer derived from Mission.
 * Each entity type carries only what its domain genuinely provides.
 *
 * The discriminator (`entityType`) lets the UI branch without
 * unsafe casts or instanceof checks.
 */

import type { Mission } from "./domain";
import type { Proposal } from "@/services/proposalContract";
import type { MapCoords, Region } from "./common";
import type { MissionLifecycleInfo } from "./lifecycle";

/**
 * Discriminator: tells the UI which rendering + mutation path to use.
 */
export type EntityType = "mission" | "proposal";

/**
 * Native proposal rendering contract.
 *
 * Only contains fields that proposals genuinely provide. No synthetic
 * Mission fields (xp, participants, difficulty, etc.).
 *
 * The `_proposal` reference lets callers access proposal-native fields
 * (summary, why, status, etc.) without putting them on the entity shape.
 */
export type ProposalEntity = {
  entityType: "proposal";
  id: string;
  proposalId: string;
  title: string;
  description: string | null;
  category: string;
  district: string;
  districtId: string | null;
  region: Region;
  /** For support progress bar — maps from proposal.teamSize */
  spotsLeft: number;
  date: string;
  emoji: string;
  coords: MapCoords | null;
  lifecycleInfo: MissionLifecycleInfo;
  _proposal: Proposal;
};

/**
 * Discriminated union: either a real Mission or a Proposal as entity.
 */
export type CivicEntity =
  | (Mission & { entityType: "mission" })
  | ProposalEntity;

/**
 * Type guard: check if entity is a real mission.
 */
export function isMission(entity: CivicEntity): entity is Mission & { entityType: "mission" } {
  return entity.entityType === "mission";
}

/**
 * Type guard: check if entity is a proposal.
 */
export function isProposal(entity: CivicEntity): entity is ProposalEntity {
  return entity.entityType === "proposal";
}
