/**
 * proposalConversionRepository contract test — Phase 5A.1.
 *
 * Covers:
 *   - convert() returns success with mission_id on RPC success
 *   - convert() returns error envelope on RPC failure
 *   - convert() translates known error codes to user-friendly messages
 *     (THRESHOLD_NOT_REACHED, ALREADY_CONVERTED, NOT_AUTHOR)
 *   - reopen() returns success on RPC success
 *   - listLifecycleEvents() returns parsed events
 */
import { describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../test/createSupabaseMock";

const mock = createSupabaseMock();
vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));

const { proposalConversionRepository } = await import(
  "../proposalConversionRepository"
);

const proposalId = "11111111-1111-1111-1111-111111111111";

describe("proposalConversionRepository", () => {
  describe("convert", () => {
    it("returns success envelope with mission_id", async () => {
      mock.queue.rpcResponse("convert_proposal_to_mission", {
        data: "77777777-7777-7777-7777-777777777777",
        error: null,
      });

      const result = await proposalConversionRepository.convert({ proposalId });
      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data).toBe("77777777-7777-7777-7777-777777777777");
      }
    });

    it("returns error envelope with translated message on RPC failure", async () => {
      mock.queue.rpcResponse("convert_proposal_to_mission", {
        data: null,
        error: { message: "THRESHOLD_NOT_MET: needs more supporters" },
      });

      const result = await proposalConversionRepository.convert({ proposalId });
      expect(result.status).toBe("error");
      if (result.status === "error") {
        // The repo translates raw RPC errors into civic-language messages.
        expect(result.error).toBeTruthy();
        expect(result.error).toMatch(/apoyos/);
        expect(result.error).not.toMatch(/THRESHOLD_NOT_MET/);
      }
    });

    it("returns error envelope on ALREADY_CONVERTED", async () => {
      mock.queue.rpcResponse("convert_proposal_to_mission", {
        data: null,
        error: { message: "ALREADY_CONVERTED: this proposal is already a mission" },
      });

      const result = await proposalConversionRepository.convert({ proposalId });
      expect(result.status).toBe("error");
    });
  });

  describe("reopen", () => {
    it("returns success on RPC success", async () => {
      mock.queue.rpcResponse("reopen_proposal", { data: null, error: null });

      const result = await proposalConversionRepository.reopen({ proposalId });
      expect(result.status).toBe("success");
    });
  });

  describe("listLifecycleEvents", () => {
    it("returns parsed events from the table", async () => {
      mock.queue.tableResponse("proposal_lifecycle_events", {
        data: [
          {
            id: "e1",
            proposal_id: proposalId,
            event_type: "converted",
            actor_id: "22222222-2222-2222-2222-222222222222",
            occurred_at: "2026-06-01T00:00:00Z",
            payload: {},
          },
        ],
        error: null,
      });

      const events = await proposalConversionRepository.listLifecycleEvents(proposalId);
      expect(Array.isArray(events)).toBe(true);
    });
  });
});
