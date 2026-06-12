import { describe, expect, it, vi, beforeEach } from "vitest";
import { createSupabaseMock } from "../../test/createSupabaseMock";

const mock = createSupabaseMock();
vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));

const { initiativeContinuationRepository } = await import(
  "../initiativeContinuationRepository"
);

const initiativeId = "11111111-1111-1111-1111-111111111111";
const actorId = "22222222-2222-2222-2222-222222222222";

describe("initiativeContinuationRepository", () => {
  describe("continue", () => {
    beforeEach(() => {
      mock.queue.rpcCalls.length = 0;
    });
    it("returns success with camelCase mapped fields", async () => {
      mock.queue.rpcResponse("continue_initiative", {
        data: {
          initiative_id: initiativeId,
          steward_id: "33333333-3333-3333-3333-333333333333",
          event_id: "44444444-4444-4444-4444-444444444444",
          owner_id: "55555555-5555-5555-5555-555555555555",
          owner_id_unchanged: true,
          new_status: "forming",
        },
        error: null,
      });

      const result = await initiativeContinuationRepository.continue(
        initiativeId,
        actorId,
      );
      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.initiativeId).toBe(initiativeId);
        expect(result.data.stewardId).toBe(
          "33333333-3333-3333-3333-333333333333",
        );
        expect(result.data.eventId).toBe(
          "44444444-4444-4444-4444-444444444444",
        );
        expect(result.data.ownerId).toBe(
          "55555555-5555-5555-5555-555555555555",
        );
      }
    });

    it("returns error with translated Spanish copy for known RPC error codes", async () => {
      mock.queue.rpcResponse("continue_initiative", {
        data: null,
        error: { message: "INVALID_STATE: only dormant initiatives" },
      });

      const result = await initiativeContinuationRepository.continue(
        initiativeId,
        actorId,
      );
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toMatch(/inactivas/);
        expect(result.error).not.toMatch(/INVALID_STATE/);
      }
    });

    it("returns error with translated message for INITIATIVE_NOT_FOUND", async () => {
      mock.queue.rpcResponse("continue_initiative", {
        data: null,
        error: { message: "INITIATIVE_NOT_FOUND" },
      });

      const result = await initiativeContinuationRepository.continue(
        initiativeId,
        actorId,
      );
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toMatch(/No encontramos/);
      }
    });

    it("returns fallback error for unknown error codes", async () => {
      mock.queue.rpcResponse("continue_initiative", {
        data: null,
        error: { message: "DB_ERROR: connection failed" },
      });

      const result = await initiativeContinuationRepository.continue(
        initiativeId,
        actorId,
      );
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toBe("DB_ERROR: connection failed");
      }
    });

    it("calls rpc with correct parameter names", async () => {
      mock.queue.rpcResponse("continue_initiative", {
        data: {
          initiative_id: initiativeId,
          steward_id: crypto.randomUUID(),
          event_id: crypto.randomUUID(),
          owner_id: crypto.randomUUID(),
        },
        error: null,
      });

      await initiativeContinuationRepository.continue(initiativeId, actorId);

      expect(mock.queue.rpcCalls).toHaveLength(1);
      expect(mock.queue.rpcCalls[0].name).toBe("continue_initiative");
      expect(mock.queue.rpcCalls[0].params).toEqual({
        p_initiative_id: initiativeId,
        p_actor_id: actorId,
      });
    });
  });
});
