/**
 * Proposal comment repository — Phase 2A.
 *
 * Public civic discussion on proposals. 1-level threading (parent_comment_id),
 * soft-delete only, 1–1200 char content.
 *
 * RLS enforces:
 *   - read: any authenticated user, but only non-deleted rows
 *   - insert: auth.uid() = user_id
 *   - update: own row, while not deleted
 *   - delete: NOT allowed by RLS (soft-delete only)
 */

import { supabase } from "@/lib/supabase";
import { resolveAuthenticatedUserId } from "@/services/_resolveAuth";
import { DB_DEFAULTS } from "@/services/proposalContract";
import type {
  CreateCommentDTO,
  CreateInitiativeCommentDTO,
  EditCommentDTO,
  InitiativeComment,
  ListCommentsResult,
  ListInitiativeCommentsResult,
  ProposalComment,
  ProposalResult,
  InitiativeType,
} from "@/services/proposalContract";
import { z } from "zod";

const DB_COMMENT_SCHEMA = z.object({
  id: z.string().uuid(),
  proposal_id: z.string().uuid(),
  user_id: z.string().uuid(),
  parent_comment_id: z.string().uuid().nullable(),
  content: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
  username: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

const DB_INITIATIVE_COMMENT_SCHEMA = z.object({
  id: z.string().uuid(),
  initiative_id: z.string().uuid(),
  initiative_type: z.enum(["proposal", "mission"]),
  user_id: z.string().uuid(),
  parent_comment_id: z.string().uuid().nullable(),
  content: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
  username: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

type JoinedCommentRow = z.infer<typeof DB_COMMENT_SCHEMA>;

function firstNameFromFullName(
  fullName: string | null | undefined,
  username: string | null,
): string {
  const name = (fullName ?? "").trim();
  if (name) return name.split(/\s+/)[0] ?? username ?? "KUSQA";
  return username ?? "KUSQA";
}

function toDomain(
  row: JoinedCommentRow,
  args: { currentUserId: string | null; now: number },
): ProposalComment {
  const username = row.username ?? "kusqa";
  const updatedMs = Date.parse(row.updated_at);
  const isEditable =
    args.currentUserId !== null &&
    row.user_id === args.currentUserId &&
    row.deleted_at === null &&
    Number.isFinite(updatedMs) &&
    args.now - updatedMs <= DB_DEFAULTS.COMMENT_EDIT_WINDOW_MS;
  return {
    id: row.id,
    proposalId: row.proposal_id,
    authorId: row.user_id,
    authorUsername: username,
    authorFirstName: firstNameFromFullName(row.full_name, username),
    authorAvatarUrl: row.avatar_url ?? null,
    parentCommentId: row.parent_comment_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isEditable,
    isDeleted: row.deleted_at !== null,
  };
}

const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 50;

/**
 * @deprecated Use `initiativeCommentRepository` instead.
 * All methods now delegate to `initiative_comments` via
 * `initiativeCommentRepository` with `initiativeType: 'proposal'`.
 * This wrapper exists only to preserve the `ProposalComment` return
 * type for existing consumers. Remove when all callers migrate to
 * `initiativeCommentRepository` + `InitiativeComment`.
 */
export const proposalCommentRepository = {
  async count(proposalId: string): Promise<number> {
    return initiativeCommentRepository.countByInitiative(proposalId, "proposal");
  },

  async list(
    proposalId: string,
    options: { page?: number; pageSize?: number; currentUserId?: string | null } = {},
  ): Promise<ListCommentsResult> {
    const result = await initiativeCommentRepository.listByInitiative(
      proposalId,
      "proposal",
      options,
    );
    return {
      comments: result.comments.map(toProposalComment),
      total: result.total,
      hasMore: result.hasMore,
    };
  },

  async create(input: CreateCommentDTO): Promise<ProposalResult<ProposalComment>> {
    const result = await initiativeCommentRepository.createForInitiative({
      initiativeId: input.proposalId,
      initiativeType: "proposal",
      content: input.content,
      parentCommentId: input.parentCommentId ?? null,
    });
    if (result.status === "success") {
      return { status: "success", data: toProposalComment(result.data) };
    }
    if (result.status === "partial_success") {
      return { status: "partial_success", data: toProposalComment(result.data), warnings: result.warnings };
    }
    return result;
  },

  async edit(
    input: EditCommentDTO & { currentUserId: string },
  ): Promise<ProposalResult<ProposalComment>> {
    const result = await initiativeCommentRepository.editComment(input);
    if (result.status === "success") {
      return { status: "success", data: toProposalComment(result.data) };
    }
    if (result.status === "partial_success") {
      return { status: "partial_success", data: toProposalComment(result.data), warnings: result.warnings };
    }
    return result;
  },

  async softDelete(commentId: string, currentUserId: string): Promise<ProposalResult<true>> {
    return initiativeCommentRepository.softDeleteComment(commentId, currentUserId);
  },
};

function toInitiativeDomain(
  row: z.infer<typeof DB_INITIATIVE_COMMENT_SCHEMA>,
  args: { currentUserId: string | null; now: number },
): InitiativeComment {
  const username = row.username ?? "kusqa";
  const updatedMs = Date.parse(row.updated_at);
  const isEditable =
    args.currentUserId !== null &&
    row.user_id === args.currentUserId &&
    row.deleted_at === null &&
    Number.isFinite(updatedMs) &&
    args.now - updatedMs <= DB_DEFAULTS.COMMENT_EDIT_WINDOW_MS;
  return {
    id: row.id,
    initiativeId: row.initiative_id,
    initiativeType: row.initiative_type,
    authorId: row.user_id,
    authorUsername: username,
    authorFirstName: firstNameFromFullName(row.full_name, username),
    authorAvatarUrl: row.avatar_url ?? null,
    parentCommentId: row.parent_comment_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isEditable,
    isDeleted: row.deleted_at !== null,
  };
}

function flattenInitiativeComment(raw: unknown): z.infer<typeof DB_INITIATIVE_COMMENT_SCHEMA> {
  if (!raw || typeof raw !== "object") {
    return {
      id: "",
      initiative_id: "",
      initiative_type: "proposal",
      user_id: "",
      parent_comment_id: null,
      content: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      username: null,
      full_name: null,
      avatar_url: null,
    };
  }
  const row = raw as Record<string, unknown> & { profiles?: unknown };
  const profile =
    row.profiles && typeof row.profiles === "object" && !Array.isArray(row.profiles)
      ? (row.profiles as Record<string, unknown>)
      : null;
  return {
    id: String(row.id ?? ""),
    initiative_id: String(row.initiative_id ?? ""),
    initiative_type: (row.initiative_type as InitiativeType) ?? "proposal",
    user_id: String(row.user_id ?? ""),
    parent_comment_id: (row.parent_comment_id as string | null) ?? null,
    content: String(row.content ?? ""),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    deleted_at: (row.deleted_at as string | null) ?? null,
    username: (profile?.username as string | null) ?? null,
    full_name: (profile?.full_name as string | null) ?? null,
    avatar_url: (profile?.avatar_url as string | null) ?? null,
  };
}

const INITIATIVE_SELECT = `
  id, initiative_id, initiative_type, user_id, parent_comment_id, content,
  created_at, updated_at, deleted_at,
  profiles!initiative_comments_user_id_fkey ( username, full_name, avatar_url )
` as const;

export const initiativeCommentRepository = {
  async countByInitiative(initiativeId: string, initiativeType: InitiativeType): Promise<number> {
    const { count, error } = await supabase
      .from("initiative_comments")
      .select("*", { count: "exact", head: true })
      .eq("initiative_id", initiativeId)
      .eq("initiative_type", initiativeType)
      .is("deleted_at", null);

    if (error) {
      console.error("[KUSQA INITIATIVE COMMENT TRACE] Error counting:", error);
      return 0;
    }
    return count ?? 0;
  },

  async listByInitiative(
    initiativeId: string,
    initiativeType: InitiativeType,
    options: { page?: number; pageSize?: number; currentUserId?: string | null } = {},
  ): Promise<ListInitiativeCommentsResult> {
    const page = Math.max(0, options.page ?? 0);
    const pageSize = Math.min(50, Math.max(1, options.pageSize ?? 20));
    const now = Date.now();
    const offset = page * pageSize;

    const {
      data: topLevel,
      error: topErr,
      count: topCount,
    } = await supabase
      .from("initiative_comments")
      .select(INITIATIVE_SELECT, { count: "exact" })
      .eq("initiative_id", initiativeId)
      .eq("initiative_type", initiativeType)
      .is("parent_comment_id", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (topErr) {
      throw new Error(`Failed to load comments: ${topErr.message}`);
    }

    const topIds = (topLevel ?? []).map((r: any) => (r as { id: string }).id);
    let replies: unknown[] = [];
    if (topIds.length > 0) {
      const { data, error } = await supabase
        .from("initiative_comments")
        .select(INITIATIVE_SELECT)
        .eq("initiative_id", initiativeId)
        .eq("initiative_type", initiativeType)
        .in("parent_comment_id", topIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      if (error) {
        throw new Error(`Failed to load replies: ${error.message}`);
      }
      replies = data ?? [];
    }

    const flatReplies = replies.map(flattenInitiativeComment);
    const byParent = new Map<string, InitiativeComment[]>();
    for (const r of flatReplies) {
      const parsed = DB_INITIATIVE_COMMENT_SCHEMA.safeParse(r);
      if (!parsed.success || !parsed.data.parent_comment_id) continue;
      const list = byParent.get(parsed.data.parent_comment_id) ?? [];
      list.push(
        toInitiativeDomain(parsed.data, { currentUserId: options.currentUserId ?? null, now }),
      );
      byParent.set(parsed.data.parent_comment_id, list);
    }

    const comments: InitiativeComment[] = (topLevel ?? [])
      .map(flattenInitiativeComment)
      .flatMap((row: z.infer<typeof DB_INITIATIVE_COMMENT_SCHEMA>) => {
        const parsed = DB_INITIATIVE_COMMENT_SCHEMA.safeParse(row);
        if (!parsed.success) return [];
        const top = toInitiativeDomain(parsed.data, {
          currentUserId: options.currentUserId ?? null,
          now,
        });
        return [top, ...(byParent.get(top.id) ?? [])];
      });

    return {
      comments,
      total: topCount ?? comments.length,
      hasMore: (topCount ?? 0) > offset + topIds.length,
    };
  },

  async createForInitiative(
    input: CreateInitiativeCommentDTO,
  ): Promise<ProposalResult<InitiativeComment>> {
    const authorId = await resolveAuthenticatedUserId();
    const trimmed = input.content.trim();
    if (trimmed.length < DB_DEFAULTS.COMMENT_MIN) {
      return { status: "error", error: "El comentario no puede estar vacío." };
    }
    if (trimmed.length > DB_DEFAULTS.COMMENT_MAX) {
      return {
        status: "error",
        error: `El comentario no puede superar ${DB_DEFAULTS.COMMENT_MAX} caracteres.`,
      };
    }

    const { data, error } = await supabase
      .from("initiative_comments")
      .insert({
        initiative_id: input.initiativeId,
        initiative_type: input.initiativeType,
        user_id: authorId,
        parent_comment_id: input.parentCommentId ?? null,
        content: trimmed,
      })
      .select(INITIATIVE_SELECT)
      .single();

    if (error) {
      return { status: "error", error: `No se pudo publicar el comentario: ${error.message}` };
    }
    const flattened = flattenInitiativeComment(data);
    const parsed = DB_INITIATIVE_COMMENT_SCHEMA.safeParse(flattened);
    if (!parsed.success) {
      return { status: "error", error: "Respuesta inesperada del servidor." };
    }
    return {
      status: "success",
      data: toInitiativeDomain(parsed.data, { currentUserId: authorId, now: Date.now() }),
    };
  },

  async editComment(
    input: EditCommentDTO & { currentUserId: string },
  ): Promise<ProposalResult<InitiativeComment>> {
    const trimmed = input.content.trim();
    if (trimmed.length < DB_DEFAULTS.COMMENT_MIN) {
      return { status: "error", error: "El comentario no puede estar vacío." };
    }
    if (trimmed.length > DB_DEFAULTS.COMMENT_MAX) {
      return {
        status: "error",
        error: `El comentario no puede superar ${DB_DEFAULTS.COMMENT_MAX} caracteres.`,
      };
    }

    const { data, error } = await supabase
      .from("initiative_comments")
      .update({ content: trimmed, updated_at: new Date().toISOString() })
      .eq("id", input.commentId)
      .eq("user_id", input.currentUserId)
      .is("deleted_at", null)
      .select(INITIATIVE_SELECT)
      .single();

    if (error) {
      return { status: "error", error: `No se pudo editar el comentario: ${error.message}` };
    }
    const flattened = flattenInitiativeComment(data);
    const parsed = DB_INITIATIVE_COMMENT_SCHEMA.safeParse(flattened);
    if (!parsed.success) {
      return { status: "error", error: "Respuesta inesperada del servidor." };
    }
    return {
      status: "success",
      data: toInitiativeDomain(parsed.data, {
        currentUserId: input.currentUserId,
        now: Date.now(),
      }),
    };
  },

  async softDeleteComment(commentId: string, currentUserId: string): Promise<ProposalResult<true>> {
    const { error } = await supabase
      .from("initiative_comments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", commentId)
      .eq("user_id", currentUserId)
      .is("deleted_at", null);

    if (error) {
      return { status: "error", error: `No se pudo eliminar el comentario: ${error.message}` };
    }
    return { status: "success", data: true };
  },
};

// ─── Helper: map InitiativeComment → ProposalComment (legacy compat) ───────

function toProposalComment(c: InitiativeComment): ProposalComment {
  return {
    id: c.id,
    proposalId: c.initiativeId,
    authorId: c.authorId,
    authorUsername: c.authorUsername,
    authorFirstName: c.authorFirstName,
    authorAvatarUrl: c.authorAvatarUrl,
    parentCommentId: c.parentCommentId,
    content: c.content,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    isEditable: c.isEditable,
    isDeleted: c.isDeleted,
  };
}

// ─── Helper: flatten Supabase join shapes ──────────────────────────────────

function flattenComment(raw: unknown): JoinedCommentRow {
  if (!raw || typeof raw !== "object") {
    return {
      id: "",
      proposal_id: "",
      user_id: "",
      parent_comment_id: null,
      content: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      username: null,
      full_name: null,
      avatar_url: null,
    };
  }
  const row = raw as Record<string, unknown> & { profiles?: unknown };
  const profile =
    row.profiles && typeof row.profiles === "object" && !Array.isArray(row.profiles)
      ? (row.profiles as Record<string, unknown>)
      : null;
  return {
    id: String(row.id ?? ""),
    proposal_id: String(row.proposal_id ?? ""),
    user_id: String(row.user_id ?? ""),
    parent_comment_id: (row.parent_comment_id as string | null) ?? null,
    content: String(row.content ?? ""),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString()),
    deleted_at: (row.deleted_at as string | null) ?? null,
    username: (profile?.username as string | null) ?? null,
    full_name: (profile?.full_name as string | null) ?? null,
    avatar_url: (profile?.avatar_url as string | null) ?? null,
  };
}
