import { describe, expect, it } from "vitest";
import {
  COMPLETE_MISSION_RPC_RESULT_SCHEMA,
  JOIN_MISSION_RPC_RESULT_SCHEMA,
} from "@/services/rpc/userMissionRpcSchemas";

const BASE_USER_MISSION = {
  id: "00000000-0000-4000-8000-000000000001",
  user_id: "00000000-0000-4000-8000-000000000002",
  mission_id: "00000000-0000-4000-8000-000000000003",
  status: "in_progress" as const,
  completed_at: null,
  xp_earned: null,
  created_at: "2026-05-25T12:00:00.000Z",
};

const BASE_PROGRESS = {
  id: "00000000-0000-4000-8000-000000000004",
  user_id: "00000000-0000-4000-8000-000000000002",
  community_points: 320,
  total_missions_completed: 1,
  last_activity_at: "2026-05-25T12:00:00.000Z",
};

describe("JOIN_MISSION_RPC_RESULT_SCHEMA", () => {
  it("parses join success payload", () => {
    const parsed = JOIN_MISSION_RPC_RESULT_SCHEMA.parse({
      user_mission: BASE_USER_MISSION,
      idempotent: false,
    });
    expect(parsed.idempotent).toBe(false);
  });

  it("rejects missing user_mission", () => {
    expect(() => JOIN_MISSION_RPC_RESULT_SCHEMA.parse({ idempotent: true })).toThrow();
  });
});

describe("COMPLETE_MISSION_RPC_RESULT_SCHEMA", () => {
  it("parses complete payload with backend xp_granted", () => {
    const parsed = COMPLETE_MISSION_RPC_RESULT_SCHEMA.parse({
      user_mission: {
        ...BASE_USER_MISSION,
        status: "completed",
        completed_at: "2026-05-25T12:01:00.000Z",
        xp_earned: 320,
      },
      user_progress: BASE_PROGRESS,
      profile_xp: 640,
      xp_granted: 320,
      idempotent: false,
    });
    expect(parsed.xp_granted).toBe(320);
  });

  it("rejects negative xp_granted", () => {
    expect(() =>
      COMPLETE_MISSION_RPC_RESULT_SCHEMA.parse({
        user_mission: BASE_USER_MISSION,
        user_progress: BASE_PROGRESS,
        profile_xp: 0,
        xp_granted: -1,
        idempotent: false,
      })
    ).toThrow();
  });
});
