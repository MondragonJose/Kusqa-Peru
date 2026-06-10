import { describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "../../test/createSupabaseMock";
import { makePublicProfileRpc, makeUserNotificationRow } from "../../test/factories";

const mock = createSupabaseMock();
vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));

const { publicProfileRepository } = await import("../publicProfileRepository");
const { notificationRepository } = await import("../notificationRepository");
const { proposalConversionRepository } = await import("../proposalConversionRepository");
const { proposalRepository } = await import("../proposalRepository");

describe("auth boundaries", () => {
  describe("public profile (SECURITY DEFINER RPC)", () => {
    it("strips fields not in the Zod schema (leak prevention)", async () => {
      const rowWithExtras = { ...makePublicProfileRpc(), role: "admin", is_verified: true };
      mock.queue.rpcResponse("get_public_profile", { data: [rowWithExtras], error: null });
      const profile = await publicProfileRepository.findByUserId(rowWithExtras.id);
      expect(profile).not.toBeNull();
      const r = profile as unknown as Record<string, unknown>;
      expect(r.role).toBeUndefined();
      expect(r.is_verified).toBeUndefined();
    });

    it("rejects a row with an invalid id (uuid constraint)", async () => {
      mock.queue.rpcResponse("get_public_profile", {
        data: [{ id: "not-a-uuid", username: "test", full_name: "Test User" }],
        error: null,
      });
      const profile = await publicProfileRepository.findByUserId("some-uuid");
      expect(profile).toBeNull();
    });
  });

  describe("user_notifications RLS isolation", () => {
    it("throws when supabase returns an error (RLS blocks access)", async () => {
      mock.queue.tableResponse("user_notifications", {
        data: null,
        error: { message: "permission denied" },
      });
      await expect(notificationRepository.findInboxByUserId("other-user-id")).rejects.toThrow(
        "Failed to fetch notifications",
      );
    });

    it("returns the data RLS allowed (app trusts DB)", async () => {
      const row = makeUserNotificationRow();
      mock.queue.tableResponse("user_notifications", {
        data: [row],
        error: null,
      });
      const rows = await notificationRepository.findInboxByUserId("any-user-id");
      expect(rows).toHaveLength(1);
      expect(rows[0].userId).toBe("22222222-2222-2222-2222-222222222222");
    });
  });

  describe("convert_proposal_to_mission ownership", () => {
    it("translates a NOT_AUTHOR RPC error", async () => {
      mock.queue.rpcResponse("convert_proposal_to_mission", {
        data: null,
        error: { message: "NOT_AUTHOR" },
      });
      const result = await proposalConversionRepository.convert({
        proposalId: "some-id",
        initialDate: null,
        organizerNotes: null,
      });
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toBe("Solo la persona que propuso puede realizar esta acción.");
      }
    });

    it("falls back to the raw error message for unrecognized codes", async () => {
      mock.queue.rpcResponse("convert_proposal_to_mission", {
        data: null,
        error: { message: "some unexpected db error" },
      });
      const result = await proposalConversionRepository.convert({
        proposalId: "some-id",
        initialDate: null,
        organizerNotes: null,
      });
      expect(result.status).toBe("error");
      if (result.status === "error") {
        expect(result.error).toBe("some unexpected db error");
      }
    });
  });

  describe("supportProposal idempotency", () => {
    it("treats 23505 duplicate key as success (idempotent)", async () => {
      mock.queue.tableResponse("proposals", {
        data: {
          id: "proposal-id",
          user_id: "test-user-id",
          title: "Test",
          description: null,
          category: "test",
          district: "test",
          region: "sierra",
          team_size: 5,
          images: null,
          status: "active",
          latitude: null,
          longitude: null,
          proposed_date: null,
          district_id: null,
          summary: null,
          why: null,
          location_label: null,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        error: null,
      });
      mock.queue.tableResponse("proposal_supports", {
        data: null,
        error: { message: "duplicate key", code: "23505" },
      });
      const result = await proposalRepository.supportProposal("proposal-id");
      expect(result.status).toBe("success");
    });

    it("returns error on a non-23505 failure", async () => {
      mock.queue.tableResponse("proposals", {
        data: {
          id: "proposal-id",
          user_id: "test-user-id",
          title: "Test",
          description: null,
          category: "test",
          district: "test",
          region: "sierra",
          team_size: 5,
          images: null,
          status: "active",
          latitude: null,
          longitude: null,
          proposed_date: null,
          district_id: null,
          summary: null,
          why: null,
          location_label: null,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
        },
        error: null,
      });
      mock.queue.tableResponse("proposal_supports", {
        data: null,
        error: { message: "permission denied" },
      });
      const result = await proposalRepository.supportProposal("proposal-id");
      expect(result.status).toBe("error");
    });
  });
});
