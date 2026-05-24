/**

 * User–mission repository — persistence only (no mission enrichment).

 * Table: public.user_missions (see supabase/migrations/20260523120000_create_user_missions.sql)

 * RPC: supabase/migrations/20260524120000_mission_transaction_rpcs.sql

 */



import { useRpcTransactions } from "@/lib/rpcFeature";

import { supabase } from "@/lib/supabase";

import { missionRepository } from "@/services/missionRepository";

import { resolveAuthoritativeMissionXp } from "@/services/rpc/missionXp";

import {

  completeMissionTransaction,

  joinMissionTransaction,

} from "@/services/rpc/userMissionRpc";

import type { UserMissionStatus } from "@/types";

import { z } from "zod";



/** Row shape aligned with migration; not hand-edited in supabase.generated.ts */

export type DbUserMissionRow = {

  id: string;

  user_id: string;

  mission_id: string;

  status: string;

  completed_at: string | null;

  xp_earned: number | null;

  created_at: string;

};



export type UserMissionRow = {

  id: string;

  userId: string;

  missionId: string;

  status: UserMissionStatus;

  completedAt: string | null;

  xpEarned: number | null;

  createdAt: string;

};



export type UserMissionRepository = {

  findRowsByUserId(userId: string): Promise<UserMissionRow[]>;

  findCompletedRowsByUserId(userId: string): Promise<UserMissionRow[]>;

  joinMission(userId: string, missionId: string): Promise<UserMissionRow>;

  completeMission: {

    (userId: string, missionId: string): Promise<UserMissionRow>;

    (userId: string, missionId: string, legacyXpIgnored?: number): Promise<UserMissionRow>;

  };

};



const USER_ID_SCHEMA = z.string().uuid();

const MISSION_ID_SCHEMA = z.string().uuid();



const DB_USER_MISSION_SCHEMA = z.object({

  id: z.string().uuid(),

  user_id: z.string().uuid(),

  mission_id: z.string().uuid(),

  status: z.enum(["completed", "in_progress"]),

  completed_at: z.string().nullable(),

  xp_earned: z.number().nullable(),

  created_at: z.string(),

});



function assertUserId(userId: string): void {

  if (!USER_ID_SCHEMA.safeParse(userId).success) {

    throw new Error(`Invalid user ID: ${userId}`);

  }

}



function assertMissionId(missionId: string): void {

  if (!MISSION_ID_SCHEMA.safeParse(missionId).success) {

    throw new Error(`Invalid mission ID: ${missionId}`);

  }

}



function parseRow(row: DbUserMissionRow): DbUserMissionRow {

  const result = DB_USER_MISSION_SCHEMA.safeParse(row);

  if (!result.success) {

    throw new Error(`Invalid user_missions row: ${result.error.message}`);

  }

  return row;

}



function toUserMissionRow(row: DbUserMissionRow): UserMissionRow {

  const parsed = parseRow(row);

  return {

    id: parsed.id,

    userId: parsed.user_id,

    missionId: parsed.mission_id,

    status: parsed.status as UserMissionStatus,

    completedAt: parsed.completed_at,

    xpEarned: parsed.xp_earned,

    createdAt: parsed.created_at,

  };

}



async function fetchRowsForUser(

  userId: string,

  status?: UserMissionStatus

): Promise<UserMissionRow[]> {

  assertUserId(userId);

  // user_missions table may not exist — return empty array without calling Supabase
  console.warn("[KUSQA] user_missions table unavailable, returning empty rows");
  return [];

}



async function joinMissionLegacy(userId: string, missionId: string): Promise<UserMissionRow> {

  assertUserId(userId);

  assertMissionId(missionId);

  await missionRepository.findById(missionId);

  // user_missions table may not exist — throw without calling Supabase
  throw new Error("[KUSQA] user_missions table unavailable, cannot join mission");

}



async function completeMissionLegacy(userId: string, missionId: string): Promise<UserMissionRow> {

  assertUserId(userId);

  assertMissionId(missionId);

  const xpEarned = await resolveAuthoritativeMissionXp(missionId);
  await missionRepository.findById(missionId);
  // user_missions table may not exist — throw without calling Supabase
  throw new Error("[KUSQA] user_missions table unavailable, cannot complete mission");

}



/**

 * Completes a mission. XP is never accepted from the client — resolved from missions.xp_reward.

 * @param legacyXpIgnored Deprecated third argument; ignored for backward compatibility.

 */

export async function completeMission(

  userId: string,

  missionId: string,

  legacyXpIgnored?: number

): Promise<UserMissionRow> {

  void legacyXpIgnored;



  if (useRpcTransactions()) {

    return completeMissionTransaction(userId, missionId);

  }

  return completeMissionLegacy(userId, missionId);

}



export const userMissionRepository: UserMissionRepository = {

  async findRowsByUserId(userId: string): Promise<UserMissionRow[]> {

    return fetchRowsForUser(userId);

  },



  async findCompletedRowsByUserId(userId: string): Promise<UserMissionRow[]> {

    const rows = await fetchRowsForUser(userId, "completed");

    return [...rows].sort((a, b) => {

      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;

      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;

      return bTime - aTime;

    });

  },



  async joinMission(userId: string, missionId: string): Promise<UserMissionRow> {

    if (useRpcTransactions()) {

      return joinMissionTransaction(userId, missionId);

    }

    return joinMissionLegacy(userId, missionId);

  },



  completeMission,

};


