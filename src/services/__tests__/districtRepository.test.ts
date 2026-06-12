/**
 * districtRepository contract test — Phase 5A.1.
 *
 * Uses `vi.doMock` (non-hoisted) so the mock can reference an
 * imported helper at runtime. This is the recommended pattern
 * for repository tests that need access to the mock queue in
 * test bodies.
 */
import { describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../test/createSupabaseMock";
import { makeDistrictRow, makeDistrictStatsRow } from "../../test/factories";

const mock = createSupabaseMock();

vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));

// Imported AFTER the mock so the module binds the mocked supabase.
const { districtRepository } = await import("../districtRepository");

describe("districtRepository", () => {
  describe("getDistrictBySlug", () => {
    it("returns a district when the row matches the schema", async () => {
      mock.queue.tableResponse("districts", { data: makeDistrictRow(), error: null });

      const result = await districtRepository.getDistrictBySlug("cusco-cusco");

      expect(result).not.toBeNull();
      expect(result?.slug).toBe("cusco-cusco");
      expect(result?.displayName).toBe("Cusco");
      expect(result?.region).toBe("sierra");
    });

    it("returns null when the row fails Zod validation", async () => {
      mock.queue.tableResponse("districts", {
        data: { id: "not-a-uuid", slug: "x" },
        error: null,
      });

      const result = await districtRepository.getDistrictBySlug("x");
      expect(result).toBeNull();
    });

    it("returns null on supabase error", async () => {
      mock.queue.tableResponse("districts", {
        data: null,
        error: { message: "boom" },
      });

      const result = await districtRepository.getDistrictBySlug("x");
      expect(result).toBeNull();
    });
  });

  describe("getDistrictStats", () => {
    it("returns zeroed defaults when the table read fails", async () => {
      mock.queue.tableResponse("district_stats", {
        data: null,
        error: { message: "boom" },
      });

      const stats = await districtRepository.getDistrictStats("cusco-cusco");

      expect(stats.missionCount).toBe(0);
      expect(stats.activeProposalCount).toBe(0);
      expect(stats.uniqueSupporterCount).toBe(0);
      expect(stats.endorsementCount).toBe(0);
    });

    it("returns parsed stats when the table read succeeds", async () => {
      mock.queue.tableResponse("district_stats", {
        data: makeDistrictStatsRow({
          mission_count: 5,
          active_proposal_count: 4,
          last_activity_at: "2026-06-01T00:00:00Z",
        }),
        error: null,
      });

      const stats = await districtRepository.getDistrictStats("cusco-cusco");
      expect(stats.missionCount).toBe(5);
      expect(stats.activeProposalCount).toBe(4);
      expect(stats.lastActivityAt).toBe("2026-06-01T00:00:00Z");
      expect(stats.endorsementCount).toBe(0);
    });
  });

  describe("getDistrictEndorsementCount", () => {
    it("returns 0 when the table query errors", async () => {
      const count = await districtRepository.getDistrictEndorsementCount("cusco-cusco");
      expect(count).toBe(0);
    });

    it("returns count when the table query succeeds", async () => {
      mock.queue.tableResponse("initiative_endorsements", {
        data: [{ id: "1" }, { id: "2" }, { id: "3" }],
        error: null,
      });

      const count = await districtRepository.getDistrictEndorsementCount("cusco-cusco");
      expect(count).toBe(3);
    });
  });

  describe("getDistrictActivity", () => {
    it("filters out null entries (Zod failures)", async () => {
      mock.queue.rpcResponse("get_district_recent_activity", {
        data: [
          {
            activity_id: "44444444-4444-4444-4444-444444444444",
            activity_type: "join",
            entity_type: "mission",
            entity_id: "66666666-6666-6666-6666-666666666666",
            occurred_at: "2026-06-01T00:00:00Z",
            actor_username: "ana",
            actor_first_name: "Ana",
            actor_avatar_url: null,
            detail: null,
          },
          // Invalid row: missing required fields.
          { activity_id: "bad" },
        ],
        error: null,
      });

      const activity = await districtRepository.getDistrictActivity("cusco-cusco");
      expect(activity).toHaveLength(1);
      expect(activity[0].activityType).toBe("join");
    });
  });

  describe("listDistricts", () => {
    it("returns camelCase domain shapes", async () => {
      mock.queue.tableResponse("districts", {
        data: [makeDistrictRow()],
        error: null,
      });

      const list = await districtRepository.listDistricts();
      expect(list).toHaveLength(1);
      expect(list[0]).toMatchObject({
        slug: "cusco-cusco",
        displayName: "Cusco",
        region: "sierra",
      });
    });
  });
});
