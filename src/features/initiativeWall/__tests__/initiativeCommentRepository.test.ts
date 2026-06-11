import { describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "@/test/createSupabaseMock";

const mock = createSupabaseMock();

vi.doMock("@/lib/supabase", () => ({ supabase: mock.client }));
vi.doMock("@/services/_resolveAuth", () => ({
  resolveAuthenticatedUserId: () => Promise.resolve("00000000-0000-4000-a000-000000000001"),
}));

const { initiativeCommentRepository } = await import("@/services/proposalCommentRepository");

const MISSION_ID = "00000000-0000-4000-a000-000000000010";
const PROP_ID = "00000000-0000-4000-a000-000000000020";
const AUTHOR_ID = "00000000-0000-4000-a000-000000000001";
const COMMENT_ID = "00000000-0000-4000-a000-000000000100";
const PARENT_ID = "00000000-0000-4000-a000-000000000200";

describe("initiativeCommentRepository", () => {
  describe("countByInitiative", () => {
    it("returns count for a mission initiative", async () => {
      mock.queue.tableResponse("proposal_comments", {
        data: null,
        error: null,
      });

      const count = await initiativeCommentRepository.countByInitiative(MISSION_ID, "mission");

      expect(count).toBe(0);
      expect(mock.queue.fromCalls).toContain("proposal_comments");
    });

    it("returns 0 on supabase error", async () => {
      mock.queue.tableResponse("proposal_comments", {
        data: null,
        error: { message: "connection error" },
      });

      const count = await initiativeCommentRepository.countByInitiative(PROP_ID, "proposal");

      expect(count).toBe(0);
    });
  });

  describe("createForInitiative", () => {
    it("creates a comment for a mission", async () => {
      mock.queue.tableResponse("proposal_comments", {
        data: {
          id: COMMENT_ID,
          initiative_id: MISSION_ID,
          initiative_type: "mission",
          user_id: AUTHOR_ID,
          parent_comment_id: null,
          content: "Great mission!",
          created_at: "2025-06-10T12:00:00Z",
          updated_at: "2025-06-10T12:00:00Z",
          deleted_at: null,
          profiles: {
            username: "testuser",
            full_name: "Test User",
            avatar_url: null,
          },
        },
        error: null,
      });

      const result = await initiativeCommentRepository.createForInitiative({
        initiativeId: MISSION_ID,
        initiativeType: "mission",
        content: "Great mission!",
      });

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.initiativeId).toBe(MISSION_ID);
        expect(result.data.initiativeType).toBe("mission");
        expect(result.data.content).toBe("Great mission!");
        expect(result.data.authorFirstName).toBe("Test");
      }
    });

    it("creates a reply comment", async () => {
      mock.queue.tableResponse("proposal_comments", {
        data: {
          id: "00000000-0000-4000-a000-000000000101",
          initiative_id: PROP_ID,
          initiative_type: "proposal",
          user_id: AUTHOR_ID,
          parent_comment_id: PARENT_ID,
          content: "Estoy de acuerdo",
          created_at: "2025-06-10T13:00:00Z",
          updated_at: "2025-06-10T13:00:00Z",
          deleted_at: null,
          profiles: {
            username: "responder",
            full_name: null,
            avatar_url: null,
          },
        },
        error: null,
      });

      const result = await initiativeCommentRepository.createForInitiative({
        initiativeId: PROP_ID,
        initiativeType: "proposal",
        content: "Estoy de acuerdo",
        parentCommentId: PARENT_ID,
      });

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.parentCommentId).toBe(PARENT_ID);
        expect(result.data.initiativeType).toBe("proposal");
      }
    });

    it("returns error for empty content", async () => {
      const result = await initiativeCommentRepository.createForInitiative({
        initiativeId: MISSION_ID,
        initiativeType: "mission",
        content: "   ",
      });

      expect(result.status).toBe("error");
    });

    it("returns error for content exceeding max", async () => {
      const longContent = "x".repeat(1201);
      const result = await initiativeCommentRepository.createForInitiative({
        initiativeId: MISSION_ID,
        initiativeType: "mission",
        content: longContent,
      });

      expect(result.status).toBe("error");
    });
  });

  describe("listByInitiative", () => {
    it("returns empty list when no root comments exist", async () => {
      mock.queue.tableResponse("proposal_comments", {
        data: [],
        error: null,
      });

      const result = await initiativeCommentRepository.listByInitiative(MISSION_ID, "mission");

      expect(result.comments).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });

  describe("softDeleteComment", () => {
    it("soft-deletes a comment", async () => {
      mock.queue.tableResponse("proposal_comments", {
        data: null,
        error: null,
      });

      const result = await initiativeCommentRepository.softDeleteComment(COMMENT_ID, AUTHOR_ID);

      expect(result.status).toBe("success");
    });
  });

  describe("editComment", () => {
    it("edits a comment", async () => {
      mock.queue.tableResponse("proposal_comments", {
        data: {
          id: COMMENT_ID,
          initiative_id: MISSION_ID,
          initiative_type: "mission",
          user_id: AUTHOR_ID,
          parent_comment_id: null,
          content: "Edited content",
          created_at: "2025-06-10T12:00:00Z",
          updated_at: "2025-06-10T12:30:00Z",
          deleted_at: null,
          profiles: {
            username: "testuser",
            full_name: "Test User",
            avatar_url: null,
          },
        },
        error: null,
      });

      const result = await initiativeCommentRepository.editComment({
        commentId: COMMENT_ID,
        content: "Edited content",
        currentUserId: AUTHOR_ID,
      });

      expect(result.status).toBe("success");
      if (result.status === "success") {
        expect(result.data.content).toBe("Edited content");
      }
    });
  });
});
