/**
 * Supabase RPC adapters for atomic mission join/complete.
 */

import { supabase } from "@/lib/supabase";
import type { UserMissionRow } from "@/services/userMissionRepository";
import { mapPostgrestRpcError, UserMissionRpcError } from "@/services/rpc/userMissionRpcErrors";
import { categorizeRpcError, logRpc } from "@/services/rpc/rpcLogger";
import {
  COMPLETE_MISSION_RPC_RESULT_SCHEMA,
  JOIN_MISSION_RPC_RESULT_SCHEMA,
  type RpcUserMissionRow,
} from "@/services/rpc/userMissionRpcSchemas";
import type { UserMissionStatus } from "@/types";
import { z } from "zod";

const RPC_NAME_JOIN = "join_mission_transaction";
const RPC_NAME_COMPLETE = "complete_mission_transaction";

const MISSION_ID_SCHEMA = z.string().uuid();
const USER_ID_SCHEMA = z.string().uuid();

function mapRpcRowToUserMissionRow(row: RpcUserMissionRow): UserMissionRow {
  return {
    id: row.id,
    userId: row.user_id,
    missionId: row.mission_id,
    status: row.status as UserMissionStatus,
    completedAt: row.completed_at,
    xpEarned: row.xp_earned,
    createdAt: row.created_at,
  };
}

function assertSessionMatchesUser(expectedUserId: string, sessionUserId: string | null): void {
  if (!sessionUserId) {
    throw new UserMissionRpcError("auth", "NOT_AUTHENTICATED", "No authenticated user");
  }
  if (sessionUserId !== expectedUserId) {
    throw new UserMissionRpcError(
      "auth",
      "USER_MISMATCH",
      `Session user ${sessionUserId} does not match ${expectedUserId}`
    );
  }
}

export async function joinMissionTransaction(
  userId: string,
  missionId: string
): Promise<UserMissionRow> {
  USER_ID_SCHEMA.parse(userId);
  MISSION_ID_SCHEMA.parse(missionId);

  const startedAt = performance.now();
  logRpc(RPC_NAME_JOIN, "start", { missionId, userId });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    const mapped = mapPostgrestRpcError(authError);
    logRpc(RPC_NAME_JOIN, "error", {
      durationMs: Math.round(performance.now() - startedAt),
      errorCategory: mapped.category,
      message: mapped.message,
    });
    throw mapped;
  }

  assertSessionMatchesUser(userId, user?.id ?? null);

  const { data, error } = await supabase.rpc(RPC_NAME_JOIN, {
    p_mission_id: missionId,
  });

  if (error) {
    const mapped = mapPostgrestRpcError(error);
    logRpc(RPC_NAME_JOIN, "error", {
      durationMs: Math.round(performance.now() - startedAt),
      errorCategory: mapped.category,
      message: mapped.message,
    });
    throw mapped;
  }

  try {
    const parsed = JOIN_MISSION_RPC_RESULT_SCHEMA.parse(data);
    logRpc(RPC_NAME_JOIN, "success", {
      durationMs: Math.round(performance.now() - startedAt),
      idempotent: parsed.idempotent,
    });
    return mapRpcRowToUserMissionRow(parsed.user_mission);
  } catch (parseError) {
    const message =
      parseError instanceof z.ZodError
        ? `Invalid join RPC payload: ${parseError.message}`
        : String(parseError);
    logRpc(RPC_NAME_JOIN, "error", {
      durationMs: Math.round(performance.now() - startedAt),
      errorCategory: categorizeRpcError(message),
      message,
    });
    throw new UserMissionRpcError("schema", "INVALID_RPC_PAYLOAD", message);
  }
}

/** Complete mission — XP is resolved exclusively in PostgreSQL from missions.xp_reward. */
export async function completeMissionTransaction(
  userId: string,
  missionId: string
): Promise<UserMissionRow> {
  USER_ID_SCHEMA.parse(userId);
  MISSION_ID_SCHEMA.parse(missionId);

  const startedAt = performance.now();
  logRpc(RPC_NAME_COMPLETE, "start", { missionId, userId });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    const mapped = mapPostgrestRpcError(authError);
    logRpc(RPC_NAME_COMPLETE, "error", {
      durationMs: Math.round(performance.now() - startedAt),
      errorCategory: mapped.category,
      message: mapped.message,
    });
    throw mapped;
  }

  assertSessionMatchesUser(userId, user?.id ?? null);

  const { data, error } = await supabase.rpc(RPC_NAME_COMPLETE, {
    p_mission_id: missionId,
  });

  if (error) {
    const mapped = mapPostgrestRpcError(error);
    logRpc(RPC_NAME_COMPLETE, "error", {
      durationMs: Math.round(performance.now() - startedAt),
      errorCategory: mapped.category,
      message: mapped.message,
    });
    throw mapped;
  }

  try {
    const parsed = COMPLETE_MISSION_RPC_RESULT_SCHEMA.parse(data);
    logRpc(RPC_NAME_COMPLETE, "success", {
      durationMs: Math.round(performance.now() - startedAt),
      idempotent: parsed.idempotent,
    });
    return mapRpcRowToUserMissionRow(parsed.user_mission);
  } catch (parseError) {
    const message =
      parseError instanceof z.ZodError
        ? `Invalid complete RPC payload: ${parseError.message}`
        : String(parseError);
    logRpc(RPC_NAME_COMPLETE, "error", {
      durationMs: Math.round(performance.now() - startedAt),
      errorCategory: categorizeRpcError(message),
      message,
    });
    throw new UserMissionRpcError("schema", "INVALID_RPC_PAYLOAD", message);
  }
}
