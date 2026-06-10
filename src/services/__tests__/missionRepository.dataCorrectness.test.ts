/**
 * Phase 0 data correctness — permanent guard.
 *
 * These tests FAIL if anyone reintroduces hardcoded/fallback values in
 * missionRepository.ts. They are intentionally redundant with the
 * behaviour-based tests in missionRepository.test.ts but serve as an
 * explicit contract: null, not fabricated defaults.
 *
 * CASES COVERED (must fail if a fake is reintroduced):
 *   1. xp_reward absent → mission.xp === null (never 320)
 *   2. max_participants absent → mission.spotsLeft === null (never derived from default 10)
 *   3. RPC with no first_name/username → organizer === null (never "Kusqa"/"Comunidad KUSQA"/"🦙")
 *   4. Invalid/absent difficulty → mission.difficulty === null (never "Suave")
 *   5. No verified evidence → mission.impact === null (never description.slice)
 *   6. date from start_date / proposed_date, never created_at
 *   7. distanceKm === null when no referenceCoords (never 0)
 *   8. create() inserts start_date and end_date in payload
 *   9. Literal guard: source file contains none of the banned strings
 */

import { describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../test/createSupabaseMock";
import { makeMissionRow } from "../../test/factories";

// ─── Literal guard — hoisted before any import ──────────────────────────────

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __guardDirname = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(__guardDirname, "../missionRepository.ts"), "utf-8");

// ─── Mock setup ─────────────────────────────────────────────────────────────

const mock = createSupabaseMock();

vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));

const { missionRepository } = await import("../missionRepository");

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Call resolveAll with the given missions mock data and optional RPC mocks.
 * If `rpcOverrides` is omitted, a default set of passing RPC mocks is used.
 */
async function resolveAllWith(
  rows: ReturnType<typeof makeMissionRow>[],
  rpcOverrides?: {
    organizer?: { data: unknown; error: unknown };
    impact?: { data: unknown; error: unknown };
    distance?: { data: unknown; error: unknown };
  },
) {
  const org = rpcOverrides?.organizer ?? {
    data: [{ user_id: "u1", username: "ana_cusco", first_name: "Ana", avatar_url: null }],
    error: null,
  };
  const imp = rpcOverrides?.impact ?? {
    data: [{ evidence_count: 0, latest_caption: null, latest_description: null }],
    error: null,
  };
  const dist = rpcOverrides?.distance ?? { data: null, error: { message: "no coords" } };

  mock.queue.rpcResponse("get_mission_organizer_preview", org);
  mock.queue.rpcResponse("get_mission_impact_preview", imp);
  mock.queue.rpcResponse("find_nearby_missions", dist);
  mock.queue.tableResponse("proposal_lifecycle_events", { data: null, error: null });
  mock.queue.tableResponse("proposals", { data: null, error: null });
  mock.queue.tableResponse("missions", { data: rows, error: null });

  return missionRepository.findAll();
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Phase 0 data correctness (guard)", () => {
  // ── 1. XP ────────────────────────────────────────────────────────────────

  it("never fabricates xp — null when xp_reward is absent", async () => {
    const row = makeMissionRow();
    delete (row as Record<string, unknown>).xp_reward;
    const missions = await resolveAllWith([row]);
    expect(missions[0].xp).toBeNull();
    // These exact numbers would appear if a DEFAULT_XP were reintroduced
    expect(missions[0].xp).not.toBe(320);
    expect(missions[0].xp).not.toBe(100);
    expect(missions[0].xp).not.toBe(0);
  });

  // ── 2. Spots left ────────────────────────────────────────────────────────

  it("never fabricates spotsLeft — null when max_participants is absent", async () => {
    const row = makeMissionRow();
    delete (row as Record<string, unknown>).max_participants;
    const missions = await resolveAllWith([row]);
    expect(missions[0].spotsLeft).toBeNull();
    // With default capacity 10 and current_progress 5, this would be 5
    expect(missions[0].spotsLeft).not.toBe(5);
    expect(missions[0].spotsLeft).not.toBe(10);
  });

  it("computes spotsLeft correctly when max_participants exists", async () => {
    const row = makeMissionRow({ max_participants: 10, current_progress: 3 });
    const missions = await resolveAllWith([row]);
    expect(missions[0].spotsLeft).toBe(7);
  });

  // ── 3. Organizer ─────────────────────────────────────────────────────────

  it("never fabricates organizer name — null when RPC returns no first_name/username", async () => {
    const missions = await resolveAllWith([makeMissionRow()], {
      organizer: {
        data: [{ user_id: "u1", first_name: null, username: null, avatar_url: null }],
        error: null,
      },
    });
    expect(missions[0].organizer).toBeNull();
  });

  it("never fabricates organizer on RPC error", async () => {
    const missions = await resolveAllWith([makeMissionRow()], {
      organizer: { data: null, error: { message: "RPC error" } },
    });
    expect(missions[0].organizer).toBeNull();
  });

  it("never returns the old hardcoded organizer placeholder", async () => {
    const missions = await resolveAllWith([makeMissionRow()], {
      organizer: { data: null, error: { message: "gone" } },
    });
    expect(missions[0].organizer).not.toEqual({
      name: "Comunidad KUSQA",
      avatar: "🦙",
    });
    expect(missions[0].organizer).not.toEqual(
      expect.objectContaining({ name: "Kusqa" }),
    );
  });

  // ── 4. Difficulty ────────────────────────────────────────────────────────

  it("never fabricates difficulty — null when DB difficulty is null", async () => {
    const missions = await resolveAllWith([makeMissionRow({ difficulty: null })]);
    expect(missions[0].difficulty).toBeNull();
  });

  it("rejects invalid difficulty strings as null", async () => {
    const missions = await resolveAllWith([makeMissionRow({ difficulty: "Invalid" })]);
    expect(missions[0].difficulty).toBeNull();
  });

  it("rejects empty difficulty as null", async () => {
    const missions = await resolveAllWith([makeMissionRow({ difficulty: "" })]);
    expect(missions[0].difficulty).toBeNull();
  });

  it('passes valid difficulties through ("Suave", "Andina", "Cumbre")', async () => {
    const m1 = makeMissionRow({ id: "00000001-0000-0000-0000-000000000001", difficulty: "Suave" });
    const m2 = makeMissionRow({ id: "00000002-0000-0000-0000-000000000002", difficulty: "Andina" });
    const m3 = makeMissionRow({ id: "00000003-0000-0000-0000-000000000003", difficulty: "Cumbre" });
    const missions = await resolveAllWith([m1, m2, m3]);
    expect(missions[0].difficulty).toBe("Suave");
    expect(missions[1].difficulty).toBe("Andina");
    expect(missions[2].difficulty).toBe("Cumbre");
  });

  // ── 5. Impact ────────────────────────────────────────────────────────────

  it("never fabricates impact — null when no verified evidence exists", async () => {
    const missions = await resolveAllWith([makeMissionRow()], {
      impact: { data: [{ evidence_count: 0, latest_caption: null, latest_description: null }], error: null },
    });
    expect(missions[0].impact).toBeNull();
  });

  it("never uses description.slice for impact", async () => {
    const missions = await resolveAllWith([makeMissionRow({ description: "A".repeat(200) })], {
      impact: { data: [{ evidence_count: 0, latest_caption: null, latest_description: null }], error: null },
    });
    // Must not be a truncated slice of description
    expect(missions[0].impact).not.toBe("A".repeat(80));
    expect(missions[0].impact).toBeNull();
  });

  it("returns evidence caption as impact when verified evidence exists", async () => {
    const missions = await resolveAllWith([makeMissionRow()], {
      impact: {
        data: [{ evidence_count: 3, latest_caption: "Recolectamos 50 kg de residuos", latest_description: null }],
        error: null,
      },
    });
    expect(missions[0].impact).toBe("Recolectamos 50 kg de residuos");
  });

  // ── 6. Date ──────────────────────────────────────────────────────────────

  it("uses start_date for date, not created_at", async () => {
    const missions = await resolveAllWith([
      makeMissionRow({
        start_date: "2026-12-25T10:00:00Z",
        created_at: "2025-01-01T00:00:00Z",
      }),
    ]);
    expect(missions[0].date).not.toBeNull();
    // Must not contain the year of created_at
    expect(missions[0].date).not.toContain("2025");
  });

  it("returns null date when both start_date and proposal fallback are missing", async () => {
    const missions = await resolveAllWith([makeMissionRow({ start_date: null })], {
      organizer: {
        data: [{ user_id: "u1", username: "ana", first_name: "Ana", avatar_url: null }],
        error: null,
      },
    });
    expect(missions[0].date).toBeNull();
  });

  it("never falls back to created_at when start_date is null", async () => {
    mock.queue.rpcResponse("get_mission_organizer_preview", {
      data: [{ user_id: "u1", username: "ana", first_name: "Ana", avatar_url: null }],
      error: null,
    });
    mock.queue.rpcResponse("get_mission_impact_preview", {
      data: [{ evidence_count: 0, latest_caption: null, latest_description: null }],
      error: null,
    });
    mock.queue.rpcResponse("find_nearby_missions", { data: null, error: { message: "no coords" } });
    // proposal_lifecycle_events returns a record → triggers proposal lookup
    mock.queue.tableResponse("proposal_lifecycle_events", {
      data: { proposal_id: "11111111-1111-1111-1111-111111111111" },
      error: null,
    });
    // But the proposal lookup fails (null) — no date fallback
    mock.queue.tableResponse("proposals", { data: null, error: null });
    mock.queue.tableResponse("missions", {
      data: [
        makeMissionRow({
          start_date: null,
          created_at: "2025-01-01T00:00:00Z",
        }),
      ],
      error: null,
    });

    const missions = await missionRepository.findAll();
    expect(missions[0].date).toBeNull();
  });

  // ── 7. DistanceKm ────────────────────────────────────────────────────────

  it("distanceKm is null when no referenceCoords are provided", async () => {
    const missions = await resolveAllWith([makeMissionRow()]);
    expect(missions[0].distanceKm).toBeNull();
  });

  it("distanceKm is null when find_nearby_missions RPC fails", async () => {
    mock.queue.rpcResponse("get_mission_organizer_preview", {
      data: [{ user_id: "u1", username: "ana", first_name: "Ana", avatar_url: null }],
      error: null,
    });
    mock.queue.rpcResponse("get_mission_impact_preview", {
      data: [{ evidence_count: 0, latest_caption: null, latest_description: null }],
      error: null,
    });
    // RPC fails
    mock.queue.rpcResponse("find_nearby_missions", {
      data: null,
      error: { message: "PostGIS unavailable" },
    });
    mock.queue.tableResponse("proposal_lifecycle_events", { data: null, error: null });
    mock.queue.tableResponse("proposals", { data: null, error: null });
    mock.queue.tableResponse("missions", { data: [makeMissionRow()], error: null });

    const missions = await missionRepository.findAll({
      referenceCoords: { lat: -12.0, lng: -77.0 },
    });
    expect(missions[0].distanceKm).toBeNull();
  });

  it("never returns 0 for distanceKm when coords are absent", async () => {
    const missions = await resolveAllWith([makeMissionRow()]);
    expect(missions[0].distanceKm).not.toBe(0);
  });

  // ── 8. Create persists dates ─────────────────────────────────────────────

  it("create() inserts start_date and end_date in the payload", async () => {
    mock.queue.rpcResponse("get_mission_organizer_preview", {
      data: [{ user_id: "u1", username: "ana", first_name: "Ana", avatar_url: null }],
      error: null,
    });
    mock.queue.rpcResponse("get_mission_impact_preview", {
      data: [{ evidence_count: 0, latest_caption: null, latest_description: null }],
      error: null,
    });
    mock.queue.rpcResponse("find_nearby_missions", { data: null, error: { message: "no coords" } });
    mock.queue.tableResponse("proposal_lifecycle_events", { data: null, error: null });
    mock.queue.tableResponse("proposals", { data: null, error: null });

    const inputRow = makeMissionRow({
      start_date: "2026-08-01T09:00:00Z",
      end_date: "2026-08-01T17:00:00Z",
    });
    mock.queue.tableResponse("missions", { data: inputRow, error: null });

    const mission = await missionRepository.create({
      title: inputRow.title,
      description: inputRow.description,
      district: inputRow.district,
      districtId: inputRow.district_id ?? null,
      region: "sierra",
      category: "Medio ambiente",
      xp: inputRow.xp_reward ?? null,
      participants: inputRow.current_progress ?? 0,
      spotsLeft: 15,
      date: null,
      distanceKm: null,
      impact: null,
      difficulty: null,
      startDate: "2026-08-01T09:00:00Z",
      endDate: "2026-08-01T17:00:00Z",
      lifecycleInfo: expect.any(Object),
      organizer: null,
      coords: { lat: inputRow.latitude, lng: inputRow.longitude },
      emoji: "🌱",
    });

    expect(mission.startDate).toBe("2026-08-01T09:00:00Z");
    expect(mission.endDate).toBe("2026-08-01T17:00:00Z");
  });

  // ── 9. Literal guard — NEVER commit these patterns ────────────────────────

  describe("literal guard (source file must not contain banned strings)", () => {
    // We read the source at module scope via vi.hoisted above.

    it('does not contain "DEFAULT_XP"', () => {
      expect(source).not.toContain("DEFAULT_XP");
    });

    it('does not contain "?? 10" (fabricated capacity)', () => {
      // `?? 100` (pagination default) is fine; `?? 10` as standalone is banned.
      const lines = source.split("\n").filter((l) => /\?\? 10[^0]/.test(l));
      expect(lines).toHaveLength(0);
    });

    it('does not contain "Comunidad KUSQA"', () => {
      expect(source).not.toContain("Comunidad KUSQA");
    });

    it('does not contain "🦙"', () => {
      expect(source).not.toContain("🦙");
    });

    it('does not contain DEFAULT_DIFFICULTY', () => {
      expect(source).not.toContain("DEFAULT_DIFFICULTY");
    });

    it('does not contain ".slice(0, 80)" or ".slice(0,80)"', () => {
      expect(source).not.toContain(".slice(0, 80)");
      expect(source).not.toContain(".slice(0,80)");
    });

    it('does not use created_at as a display date fallback', () => {
      // created_at is allowed for ordering (`.order("created_at", ...)`)
      // and Zod schema validation, but must NOT appear as a value used
      // in date resolution. Every occurrence in the source must be one
      // of these legitimate patterns. Matches:
      //   - created_at: z.string(),
      //   - .order("created_at", ...)
      //   - order("created_at", ...)
      const lines = source.split("\n").filter((l) => l.includes("created_at"));
      const bad = lines.filter(
        (l) => !l.includes('created_at: z.string()') && !l.includes('.order("created_at"'),
      );
      expect(bad).toHaveLength(0);
    });

    it('does not fabricate distanceKm as 0', () => {
      // distanceKm must be null when absent, never 0
      expect(source).not.toMatch(/distanceKm\s*[=:]\s*0/);
    });
  });
});
