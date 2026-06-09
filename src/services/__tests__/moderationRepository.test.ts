/**
 * moderationRepository contract test — Phase 5A.1.
 *
 * Phase 5 scope: only `report()` is exercised. Moderator-facing
 * methods (findByTarget, findQueue, resolve, markAppeal) are
 * intentionally not tested here — they are gated on Phase 4D which
 * is explicitly out of scope.
 *
 * Covers:
 *   - report() happy path
 *   - report() throws on supabase error
 *   - report() rejects malformed input (missing required fields)
 *   - report() rejects unknown reason codes
 */
import { describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../test/createSupabaseMock";

const mock = createSupabaseMock();
vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));

const { moderationRepository } = await import("../moderationRepository");

const validInput = {
  reporterId: "22222222-2222-2222-2222-222222222222",
  targetType: "proposal" as const,
  targetId: "11111111-1111-1111-1111-111111111111",
  reasonCode: "spam" as const,
  description: "Esta propuesta es claramente spam.",
};

describe("moderationRepository", () => {
  describe("report()", () => {
    it("submits a moderation report and returns the row", async () => {
      let callCount = 0;
      mock.queue.tableResponse("moderation_reports", () => {
        callCount += 1;
        if (callCount === 1) {
          // First call: duplicate check — return no existing report
          return { data: null, error: null };
        }
        // Second call: the actual insert
        return {
          data: {
            id: "99999999-9999-9999-9999-999999999999",
            reporter_id: validInput.reporterId,
            target_type: validInput.targetType,
            target_id: validInput.targetId,
            reason_code: validInput.reasonCode,
            description: validInput.description,
            status: "pending",
            created_at: "2026-06-07T10:00:00Z",
          },
          error: null,
        };
      });

      const row = await moderationRepository.report(validInput);
      expect(row.reporterId).toBe(validInput.reporterId);
      expect(row.status).toBe("pending");
    });

    it("throws on supabase error", async () => {
      let callCount = 0;
      mock.queue.tableResponse("moderation_reports", () => {
        callCount += 1;
        if (callCount === 1) {
          return { data: null, error: null };
        }
        return { data: null, error: { message: "duplicate report" } };
      });

      await expect(moderationRepository.report(validInput)).rejects.toThrow(
        /Failed to submit moderation report/,
      );
    });

    it("rejects malformed input (missing required fields)", async () => {
      const malformed = {
        reporterId: "22222222-2222-2222-2222-222222222222",
        // missing targetType, targetId, reasonCode
      } as unknown as Parameters<typeof moderationRepository.report>[0];

      await expect(moderationRepository.report(malformed)).rejects.toThrow();
    });

    it("rejects unknown reason codes", async () => {
      const badReason = {
        ...validInput,
        reasonCode: "not_a_real_reason",
      } as unknown as Parameters<typeof moderationRepository.report>[0];

      await expect(moderationRepository.report(badReason)).rejects.toThrow();
    });
  });
});
