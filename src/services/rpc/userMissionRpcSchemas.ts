/**
 * Zod schemas for Supabase mission RPC payloads (strict parse, no fallbacks).
 */

import { z } from "zod";

export const RPC_USER_MISSION_ROW_SCHEMA = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  mission_id: z.string().uuid(),
  status: z.enum(["completed", "in_progress"]),
  completed_at: z.string().nullable(),
  xp_earned: z.number().int().nullable(),
  created_at: z.string(),
});

export const RPC_USER_PROGRESS_ROW_SCHEMA = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  community_points: z.number().int(),
  total_missions_completed: z.number().int(),
  last_activity_at: z.string(),
});

export const JOIN_MISSION_RPC_RESULT_SCHEMA = z.object({
  user_mission: RPC_USER_MISSION_ROW_SCHEMA,
  idempotent: z.boolean(),
});

export const COMPLETE_MISSION_RPC_RESULT_SCHEMA = z.object({
  user_mission: RPC_USER_MISSION_ROW_SCHEMA,
  user_progress: RPC_USER_PROGRESS_ROW_SCHEMA,
  profile_xp: z.number().int(),
  xp_granted: z.number().int().nonnegative(),
  idempotent: z.boolean(),
});

export type RpcUserMissionRow = z.infer<typeof RPC_USER_MISSION_ROW_SCHEMA>;
export type JoinMissionRpcResult = z.infer<typeof JOIN_MISSION_RPC_RESULT_SCHEMA>;
export type CompleteMissionRpcResult = z.infer<typeof COMPLETE_MISSION_RPC_RESULT_SCHEMA>;
