/**
 * missionRepository contract test — Phase 0 data correctness.
 *
 * Covers:
 *   - No hardcoded "Comunidad KUSQA" / "🦙" / "Suave" / description.slice
 *   - organizer is null when the RPC fails or organizer_id is missing
 *   - date uses start_date (or proposal proposed_date), never created_at
 *   - create() persists start_date and end_date
 */
import { describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../test/createSupabaseMock";
import { makeMissionRow } from "../../test/factories";

const mock = createSupabaseMock();

vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));

const { missionRepository } = await import("../missionRepository");

function setDefaultMocks(): void {
  mock.queue.rpcResponse("get_mission_organizer_preview", {
    data: [
      {
        user_id: "22222222-2222-2222-2222-222222222222",
        username: "ana_cusco",
        first_name: "Ana",
        avatar_url: null,
      },
    ],
    error: null,
  });
  mock.queue.tableResponse("proposal_lifecycle_events", { data: null, error: null });
  mock.queue.tableResponse("proposals", { data: null, error: null });
}

describe("missionRepository", () => {
  describe("findAll", () => {
    it("returns domain missions in camelCase shape", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", { data: [makeMissionRow()], error: null });

      const missions = await missionRepository.findAll();

      expect(missions).toHaveLength(1);
      expect(missions[0].id).toBe("66666666-6666-6666-6666-666666666666");
      expect(missions[0].title).toBe("Limpieza del río Huatanay");
      expect(missions[0].district).toBe("cusco-cusco");
      expect(missions[0].category).toBe("Medio ambiente");
      expect(missions[0].coords).toEqual({ lat: -13.5167, lng: -71.9789 });
    });

    it("throws on supabase error", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", {
        data: null,
        error: { message: "permission denied" },
      });

      await expect(missionRepository.findAll()).rejects.toThrow(/Failed to fetch missions/);
    });

    it("returns empty array when data is null without error", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", { data: null, error: null });

      const missions = await missionRepository.findAll();
      expect(missions).toEqual([]);
    });
  });

  describe("findById", () => {
    it("returns a domain mission when found", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", { data: makeMissionRow(), error: null });

      const mission = await missionRepository.findById("66666666-6666-6666-6666-666666666666");

      expect(mission).not.toBeNull();
      expect(mission?.id).toBe("66666666-6666-6666-6666-666666666666");
    });

    it("throws on supabase error", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", {
        data: null,
        error: { message: "permission denied" },
      });

      await expect(
        missionRepository.findById("66666666-6666-6666-6666-666666666666"),
      ).rejects.toThrow(/Failed to fetch mission/);
    });

    it("returns null when the row is missing", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", { data: null, error: null });

      const mission = await missionRepository.findById("66666666-6666-6666-6666-666666666666");
      expect(mission).toBeNull();
    });
  });

  describe("findAllByIds", () => {
    it("returns all requested missions", async () => {
      setDefaultMocks();
      const rowA = makeMissionRow({ id: "66666666-6666-6666-6666-666666666666" });
      const rowB = makeMissionRow({
        id: "77777777-7777-7777-7777-777777777777",
        title: "Reforestación en San Blas",
      });
      mock.queue.tableResponse("missions", { data: [rowA, rowB], error: null });

      const missions = await missionRepository.findAllByIds([
        "66666666-6666-6666-6666-666666666666",
        "77777777-7777-7777-7777-777777777777",
      ]);

      expect(missions).toHaveLength(2);
    });

    it("deduplicates duplicate ids", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", {
        data: [makeMissionRow()],
        error: null,
      });

      const missions = await missionRepository.findAllByIds([
        "66666666-6666-6666-6666-666666666666",
        "66666666-6666-6666-6666-666666666666",
      ]);

      expect(missions).toHaveLength(1);
    });

    it("throws when some ids are not found", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", {
        data: [makeMissionRow({ id: "66666666-6666-6666-6666-666666666666" })],
        error: null,
      });

      await expect(
        missionRepository.findAllByIds([
          "66666666-6666-6666-6666-666666666666",
          "00000000-0000-0000-0000-000000000000",
        ]),
      ).rejects.toThrow(/Missions not found/);
    });
  });

  describe("findByDistrict", () => {
    it("queries by district_id when available", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", { data: [makeMissionRow()], error: null });

      const missions = await missionRepository.findByDistrict(
        "Cusco",
        "cusco-cusco",
        "33333333-3333-3333-3333-333333333333",
      );

      expect(missions).toHaveLength(1);
      expect(mock.fromCalls).toContain("missions");
    });

    it("returns [] on supabase error", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", {
        data: null,
        error: { message: "boom" },
      });

      const missions = await missionRepository.findByDistrict("X", "x");
      expect(missions).toEqual([]);
    });
  });

  describe("create", () => {
    it("persists start_date and end_date and returns the mission", async () => {
      setDefaultMocks();
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
        xp: inputRow.xp_reward ?? 320,
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

    it("throws on create error", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", {
        data: null,
        error: { message: "insert failed" },
      });

      await expect(
        missionRepository.create({
          title: "Test",
          description: "Test",
          district: "test",
          districtId: null,
          region: "sierra",
          category: "Medio ambiente",
          xp: 320,
          participants: 0,
          spotsLeft: 10,
          date: null,
          distanceKm: null,
          impact: null,
          difficulty: null,
          startDate: null,
          endDate: null,
          lifecycleInfo: expect.any(Object),
          organizer: null,
          coords: { lat: -13.5, lng: -71.9 },
          emoji: "🌱",
        }),
      ).rejects.toThrow(/Failed to create mission/);
    });
  });

  describe("data correctness (Phase 0)", () => {
    it("does not fabricate organizer — null when organizer_id is unresolvable", async () => {
      mock.queue.rpcResponse("get_mission_organizer_preview", {
        data: null,
        error: { message: "permission denied" },
      });
      mock.queue.tableResponse("proposal_lifecycle_events", { data: null, error: null });
      mock.queue.tableResponse("proposals", { data: null, error: null });
      mock.queue.tableResponse("missions", {
        data: [makeMissionRow({ organizer_id: "22222222-2222-2222-2222-222222222222" })],
        error: null,
      });

      const missions = await missionRepository.findAll();
      expect(missions).toHaveLength(1);
      // Must not contain the old hardcoded placeholder
      expect(missions[0].organizer).toBeNull();
    });

    it("does not fabricate difficulty — null when DB difficulty is null", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", {
        data: [makeMissionRow({ difficulty: null })],
        error: null,
      });

      const missions = await missionRepository.findAll();
      expect(missions[0].difficulty).toBeNull();
    });

    it("rejects an invalid difficulty string as null", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", {
        data: [makeMissionRow({ difficulty: "InvalidValue" })],
        error: null,
      });

      const missions = await missionRepository.findAll();
      expect(missions[0].difficulty).toBeNull();
    });

    it("does not fabricate impact — always null", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", {
        data: [makeMissionRow()],
        error: null,
      });

      const missions = await missionRepository.findAll();
      expect(missions[0].impact).toBeNull();
    });

    it("does not use description.slice for impact even when description is long", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", {
        data: [
          makeMissionRow({
            description: "A".repeat(200),
          }),
        ],
        error: null,
      });

      const missions = await missionRepository.findAll();
      // Must not be the truncated description — must be null
      expect(missions[0].impact).toBeNull();
    });

    it("uses start_date for date, not created_at", async () => {
      setDefaultMocks();
      mock.queue.tableResponse("missions", {
        data: [
          makeMissionRow({
            start_date: "2026-12-25T10:00:00Z",
            created_at: "2025-01-01T00:00:00Z",
          }),
        ],
        error: null,
      });

      const missions = await missionRepository.findAll();
      expect(missions[0].date).not.toBeNull();
      // date must not be a formatting of created_at (year 2025)
      expect(missions[0].date).not.toContain("2025");
    });

    it("returns null date when both start_date and proposal fallback are missing", async () => {
      mock.queue.rpcResponse("get_mission_organizer_preview", {
        data: [
          {
            user_id: "22222222-2222-2222-2222-222222222222",
            username: "ana_cusco",
            first_name: "Ana",
            avatar_url: null,
          },
        ],
        error: null,
      });
      mock.queue.tableResponse("proposal_lifecycle_events", { data: null, error: null });
      mock.queue.tableResponse("proposals", { data: null, error: null });
      mock.queue.tableResponse("missions", {
        data: [makeMissionRow({ start_date: null })],
        error: null,
      });

      const missions = await missionRepository.findAll();
      expect(missions[0].date).toBeNull();
    });

    it("never falls back to created_at when start_date is null", async () => {
      mock.queue.rpcResponse("get_mission_organizer_preview", {
        data: [
          {
            user_id: "22222222-2222-2222-2222-222222222222",
            username: "ana_cusco",
            first_name: "Ana",
            avatar_url: null,
          },
        ],
        error: null,
      });
      // Simulate: proposal_lifecycle_events returns a proposal_id
      mock.queue.tableResponse("proposal_lifecycle_events", {
        data: { proposal_id: "11111111-1111-1111-1111-111111111111" },
        error: null,
      });
      // But the proposal lookup itself fails (returns null)
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
      // date must be null — never created_at
      expect(missions[0].date).toBeNull();
    });
  });
});
