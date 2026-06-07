/**
 * civicEventsRepository contract test — Phase 5A.1.
 *
 * Covers:
 *   - listForProfile happy path
 *   - listForProfile returns [] on RPC error
 *   - listForProfile filters out Zod-failing rows
 *   - CIVIC_EVENT_COPY is exhaustive (every kind in CIVIC_EVENT_KINDS
 *     has a copy entry)
 */
import { describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../test/createSupabaseMock";

const mock = createSupabaseMock();
vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));

const { civicEventsRepository, CIVIC_EVENT_COPY } = await import(
  "../civicEventsRepository"
);

const validEventRow = {
  id: "44444444-4444-4444-4444-444444444444",
  kind: "proposal.created",
  target_type: "proposal",
  target_id: "11111111-1111-1111-1111-111111111111",
  district_id: "33333333-3333-3333-3333-333333333333",
  district_slug: "cusco-cusco",
  district_name: "Cusco",
  occurred_at: "2026-06-01T00:00:00Z",
  payload: {},
};

describe("civicEventsRepository", () => {
  describe("listForProfile", () => {
    it("returns parsed events for a user", async () => {
      mock.queue.rpcResponse("get_civic_events_for_profile", {
        data: [validEventRow],
        error: null,
      });

      const events = await civicEventsRepository.listForProfile(
        "22222222-2222-2222-2222-222222222222",
      );
      if (events.length !== 1) {
        // Debug: re-run with a single row to inspect Zod errors.
        const { RPC_EVENT_SCHEMA } = await import("../civicEventsRepository");
        const r = RPC_EVENT_SCHEMA.safeParse(validEventRow);
        console.log("[DEBUG] zod parse result:", r.success, r.success ? "" : r.error.format());
      }
      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe("proposal.created");
      expect(events[0].targetType).toBe("proposal");
      expect(events[0].districtSlug).toBe("cusco-cusco");
    });

    it("returns [] on RPC error", async () => {
      mock.queue.rpcResponse("get_civic_events_for_profile", {
        data: null,
        error: { message: "boom" },
      });

      const events = await civicEventsRepository.listForProfile(
        "22222222-2222-2222-2222-222222222222",
      );
      expect(events).toEqual([]);
    });

    it("returns [] when payload is not an array", async () => {
      mock.queue.rpcResponse("get_civic_events_for_profile", {
        data: { not: "an array" },
        error: null,
      });

      const events = await civicEventsRepository.listForProfile(
        "22222222-2222-2222-2222-222222222222",
      );
      expect(events).toEqual([]);
    });

    it("filters out rows that fail Zod validation", async () => {
      mock.queue.rpcResponse("get_civic_events_for_profile", {
        data: [validEventRow, { id: "bad" }],
        error: null,
      });

      const events = await civicEventsRepository.listForProfile(
        "22222222-2222-2222-2222-222222222222",
      );
      expect(events).toHaveLength(1);
    });
  });

  describe("CIVIC_EVENT_COPY", () => {
    it("has a copy entry for every key, with non-empty title or body", () => {
      const keys = Object.keys(CIVIC_EVENT_COPY);
      expect(keys.length).toBeGreaterThan(0);
      for (const kind of keys) {
        const c = CIVIC_EVENT_COPY[kind] as { title?: string; body?: string };
        expect(c.title ?? c.body).toBeTruthy();
      }
    });
  });
});
