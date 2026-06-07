/**
 * publicProfileRepository contract test — Phase 5A.1.
 *
 * Covers:
 *   - findByUserId happy path (single row RPC array)
 *   - findByUserId returns null on RPC error
 *   - findByUserId returns null when data is not an array
 *   - findByUserId returns null when row fails Zod validation
 *   - SECURITY DEFINER leak prevention: fields like `email` are not
 *     in the parsed result even if the RPC mistakenly returns them
 */
import { describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../test/createSupabaseMock";
import { makePublicProfileRpc } from "../../test/factories";

const mock = createSupabaseMock();
vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));

const { publicProfileRepository } = await import("../publicProfileRepository");

describe("publicProfileRepository", () => {
  describe("findByUserId", () => {
    it("returns a parsed public profile", async () => {
      mock.queue.rpcResponse("get_public_profile", {
        data: [makePublicProfileRpc({ username: "ana_cusco" })],
        error: null,
      });

      const profile = await publicProfileRepository.findByUserId(
        "22222222-2222-2222-2222-222222222222",
      );

      expect(profile).not.toBeNull();
      expect(profile?.username).toBe("ana_cusco");
      expect(profile?.region).toBe("sierra");
    });

    it("returns null on RPC error", async () => {
      mock.queue.rpcResponse("get_public_profile", {
        data: null,
        error: { message: "permission denied" },
      });

      const profile = await publicProfileRepository.findByUserId(
        "22222222-2222-2222-2222-222222222222",
      );
      expect(profile).toBeNull();
    });

    it("returns null when the RPC returns a non-array", async () => {
      mock.queue.rpcResponse("get_public_profile", {
        data: { not: "an array" },
        error: null,
      });

      const profile = await publicProfileRepository.findByUserId(
        "22222222-2222-2222-2222-222222222222",
      );
      expect(profile).toBeNull();
    });

    it("returns null when the row fails Zod validation", async () => {
      mock.queue.rpcResponse("get_public_profile", {
        data: [{ id: "not-a-uuid" }],
        error: null,
      });

      const profile = await publicProfileRepository.findByUserId(
        "22222222-2222-2222-2222-222222222222",
      );
      expect(profile).toBeNull();
    });

    it("does not leak email, phone, or auth metadata even if present", async () => {
      const rowWithSecrets = {
        ...makePublicProfileRpc(),
        email: "ana@example.com",
        phone: "+51999999999",
        auth_id: "auth-secret",
        raw_user_meta_data: { role: "admin" },
      };
      mock.queue.rpcResponse("get_public_profile", {
        data: [rowWithSecrets],
        error: null,
      });

      const profile = await publicProfileRepository.findByUserId(
        "22222222-2222-2222-2222-222222222222",
      );

      expect(profile).not.toBeNull();
      const profileRecord = profile as unknown as Record<string, unknown>;
      expect(profileRecord.email).toBeUndefined();
      expect(profileRecord.phone).toBeUndefined();
      expect(profileRecord.auth_id).toBeUndefined();
      expect(profileRecord.raw_user_meta_data).toBeUndefined();
    });
  });
});
