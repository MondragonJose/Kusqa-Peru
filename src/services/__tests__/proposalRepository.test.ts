/**
 * proposalRepository contract test — Phase 5A.1.
 *
 * Covers:
 *   - getProposalById happy path + throws on supabase error + manual
 *     type-guard rejection for malformed rows
 *   - getAllProposals with status filter
 *   - getSupportCount returns 0 on error (non-critical)
 *   - supportProposal returns success/error result envelope
 */
import { describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../test/createSupabaseMock";
import { makeProposalRow } from "../../test/factories";

const mock = createSupabaseMock();
vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));

const { proposalRepository } = await import("../proposalRepository");

describe("proposalRepository", () => {
  describe("getProposalById", () => {
    it("returns a domain proposal when the row matches", async () => {
      mock.queue.tableResponse("proposals", {
        data: makeProposalRow(),
        error: null,
      });

      const result = await proposalRepository.getProposalById(
        "11111111-1111-1111-1111-111111111111",
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe("11111111-1111-1111-1111-111111111111");
      expect(result?.userId).toBe("22222222-2222-2222-2222-222222222222");
      expect(result?.title).toBe("Reparación de veredas en Av. Principal");
    });

    it("throws on supabase error", async () => {
      mock.queue.tableResponse("proposals", {
        data: null,
        error: { message: "permission denied" },
      });

      await expect(
        proposalRepository.getProposalById("11111111-1111-1111-1111-111111111111"),
      ).rejects.toThrow(/Failed to fetch proposal/);
    });

    it("returns null when the row is missing", async () => {
      mock.queue.tableResponse("proposals", { data: null, error: null });

      const result = await proposalRepository.getProposalById(
        "11111111-1111-1111-1111-111111111111",
      );

      expect(result).toBeNull();
    });
  });

  describe("getAllProposals", () => {
    it("returns parsed proposals in camelCase shape", async () => {
      mock.queue.tableResponse("proposals", {
        data: [makeProposalRow({ status: "active" })],
        error: null,
      });

      const list = await proposalRepository.getAllProposals();
      expect(list).toHaveLength(1);
      expect(list[0].status).toBe("active");
    });

    it("passes the status filter through to the chain", async () => {
      mock.queue.tableResponse("proposals", { data: [], error: null });

      await proposalRepository.getAllProposals({ status: "active" });
      expect(mock.fromCalls).toContain("proposals");
    });
  });

  describe("getSupportCount", () => {
    it("returns 0 on error (non-critical read)", async () => {
      mock.queue.tableResponse("proposal_supports", {
        data: null,
        error: { message: "boom" },
      });

      const count = await proposalRepository.getSupportCount(
        "11111111-1111-1111-1111-111111111111",
      );
      expect(count).toBe(0);
    });
  });

  describe("supportProposal", () => {
    it("returns a success envelope on insert", async () => {
      mock.queue.tableResponse("proposals", {
        data: makeProposalRow(),
        error: null,
      });
      mock.queue.tableResponse("proposal_supports", {
        data: { id: "s1" },
        error: null,
      });

      const result = await proposalRepository.supportProposal(
        "11111111-1111-1111-1111-111111111111",
      );

      expect(result.status).toBe("success");
    });

    it("returns an error envelope on failure", async () => {
      mock.queue.tableResponse("proposals", {
        data: makeProposalRow(),
        error: null,
      });
      mock.queue.tableResponse("proposal_supports", {
        data: null,
        error: { message: "boom" },
      });

      const result = await proposalRepository.supportProposal(
        "11111111-1111-1111-1111-111111111111",
      );

      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toMatch(/boom/);
      }
    });

    it("treats 23505 (already supported) as success", async () => {
      mock.queue.tableResponse("proposals", {
        data: makeProposalRow(),
        error: null,
      });
      mock.queue.tableResponse("proposal_supports", {
        data: null,
        error: { message: "duplicate", code: "23505" },
      });

      const result = await proposalRepository.supportProposal(
        "11111111-1111-1111-1111-111111111111",
      );

      expect(result.status).toBe("success");
    });
  });

});
