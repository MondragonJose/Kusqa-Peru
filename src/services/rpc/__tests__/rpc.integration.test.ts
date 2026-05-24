/**
 * Integration tests against live Supabase (optional).
 *
 * Run: SUPABASE_TEST_URL=... SUPABASE_TEST_ANON_KEY=... npm run test:rpc
 */
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  COMPLETE_MISSION_RPC_RESULT_SCHEMA,
  JOIN_MISSION_RPC_RESULT_SCHEMA,
} from "@/services/rpc/userMissionRpcSchemas";

const url = process.env.SUPABASE_TEST_URL;
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const testEmail = process.env.SUPABASE_TEST_EMAIL;
const testPassword = process.env.SUPABASE_TEST_PASSWORD;
const testMissionId = process.env.SUPABASE_TEST_MISSION_ID;

const canRun = Boolean(url && anonKey && testEmail && testPassword && testMissionId);

describe.skipIf(!canRun)("RPC mission transactions (integration)", () => {
  const client = createClient(url!, anonKey!);
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    const { data, error } = await client.auth.signInWithPassword({
      email: testEmail!,
      password: testPassword!,
    });
    if (error || !data.session) {
      throw new Error(`Test auth failed: ${error?.message ?? "no session"}`);
    }
    accessToken = data.session.access_token;
    userId = data.user.id;
    await client.auth.setSession({
      access_token: accessToken,
      refresh_token: data.session.refresh_token,
    });
  });

  afterAll(async () => {
    await client.auth.signOut();
  });

  it("join is idempotent on second call", async () => {
    const first = await client.rpc("join_mission_transaction", {
      p_mission_id: testMissionId!,
    });
    expect(first.error).toBeNull();
    const parsedFirst = JOIN_MISSION_RPC_RESULT_SCHEMA.parse(first.data);

    const second = await client.rpc("join_mission_transaction", {
      p_mission_id: testMissionId!,
    });
    expect(second.error).toBeNull();
    const parsedSecond = JOIN_MISSION_RPC_RESULT_SCHEMA.parse(second.data);
    expect(parsedSecond.idempotent).toBe(true);
    expect(parsedSecond.user_mission.id).toBe(parsedFirst.user_mission.id);
  });

  it("complete is idempotent and does not double XP in profile", async () => {
    await client.rpc("join_mission_transaction", { p_mission_id: testMissionId! });

    const first = await client.rpc("complete_mission_transaction", {
      p_mission_id: testMissionId!,
    });
    expect(first.error).toBeNull();
    const parsedFirst = COMPLETE_MISSION_RPC_RESULT_SCHEMA.parse(first.data);
    expect(parsedFirst.xp_granted).toBeGreaterThanOrEqual(0);

    const { data: profileAfterFirst } = await client
      .from("profiles")
      .select("experience_points")
      .eq("id", userId)
      .single();

    const second = await client.rpc("complete_mission_transaction", {
      p_mission_id: testMissionId!,
    });
    expect(second.error).toBeNull();
    const parsedSecond = COMPLETE_MISSION_RPC_RESULT_SCHEMA.parse(second.data);
    expect(parsedSecond.idempotent).toBe(true);

    const { data: profileAfterSecond } = await client
      .from("profiles")
      .select("experience_points")
      .eq("id", userId)
      .single();

    expect(profileAfterSecond?.experience_points).toBe(profileAfterFirst?.experience_points);
  });

  it("rejects complete without join when row missing", async () => {
    const orphanMissionId = "00000000-0000-4000-8999-000000000099";
    const { error } = await client.rpc("complete_mission_transaction", {
      p_mission_id: orphanMissionId,
    });
    expect(error).not.toBeNull();
    expect(error?.message.toUpperCase()).toContain("USER_MISSION_NOT_FOUND");
  });
});
