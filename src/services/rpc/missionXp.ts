/**
 * Backend-authoritative mission XP resolution (read path for legacy + validation).
 */

import { missionRepository } from "@/services/missionRepository";
import { z } from "zod";

const MISSION_ID_SCHEMA = z.string().uuid();

/** Resolves XP from missions table — never trust client-supplied rewards. */
export async function resolveAuthoritativeMissionXp(missionId: string): Promise<number> {
  MISSION_ID_SCHEMA.parse(missionId);
  const mission = await missionRepository.findById(missionId);
  if (mission.xp < 0) {
    throw new Error(`Invalid mission XP reward: ${missionId}`);
  }
  return mission.xp;
}
