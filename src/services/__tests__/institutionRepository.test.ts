/**
 * institutionRepository contract test — Phase 3.
 *
 * Covers:
 *   - findBySlug happy path (single row RPC array)
 *   - findBySlug returns null on RPC error
 *   - findBySlug returns null when data is not an array
 *   - findBySlug returns null when row fails Zod validation
 *   - SECURITY DEFINER leak prevention: fields like `verification_state`
 *     are not in the parsed result even if the RPC mistakenly returns them
 */
import { describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../test/createSupabaseMock";
import { makeInstitutionRpc } from "../../test/factories";

const mock = createSupabaseMock();
vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));

const { institutionRepository } = await import("../institutionRepository");

describe("institutionRepository", () => {
  describe("findBySlug", () => {
    it("returns a parsed public institution", async () => {
      mock.queue.rpcResponse("get_public_institution", {
        data: [makeInstitutionRpc({ name: "Municipalidad de Cusco" })],
        error: null,
      });

      const institution = await institutionRepository.findBySlug("municipalidad-cusco");

      expect(institution).not.toBeNull();
      expect(institution?.name).toBe("Municipalidad de Cusco");
      expect(institution?.kind).toBe("municipality");
      expect(institution?.districtId).toBe("33333333-3333-3333-3333-333333333333");
    });

    it("returns null on RPC error", async () => {
      mock.queue.rpcResponse("get_public_institution", {
        data: null,
        error: { message: "permission denied" },
      });

      const institution = await institutionRepository.findBySlug("municipalidad-cusco");
      expect(institution).toBeNull();
    });

    it("returns null when the RPC returns a non-array", async () => {
      mock.queue.rpcResponse("get_public_institution", {
        data: { not: "an array" },
        error: null,
      });

      const institution = await institutionRepository.findBySlug("municipalidad-cusco");
      expect(institution).toBeNull();
    });

    it("returns null when the row fails Zod validation", async () => {
      mock.queue.rpcResponse("get_public_institution", {
        data: [{ id: "not-a-uuid" }],
        error: null,
      });

      const institution = await institutionRepository.findBySlug("municipalidad-cusco");
      expect(institution).toBeNull();
    });

    it("exposes verified boolean but not raw verification_state", async () => {
      const rowWithSecret = {
        ...makeInstitutionRpc(),
        verification_state: "verified",
        internal_notes: "approved by admin",
      };
      mock.queue.rpcResponse("get_public_institution", {
        data: [rowWithSecret],
        error: null,
      });

      const institution = await institutionRepository.findBySlug("municipalidad-cusco");

      expect(institution).not.toBeNull();
      expect(institution?.verified).toBe(true);
      const record = institution as unknown as Record<string, unknown>;
      expect(record.verification_state).toBeUndefined();
      expect(record.internal_notes).toBeUndefined();
    });
  });
});
