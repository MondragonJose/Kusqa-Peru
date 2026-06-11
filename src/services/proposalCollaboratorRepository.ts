/**
 * Proposal collaborator repository — Phase 2A.
 *
 * Real coalition system: author invites specific users to co-organize a
 * proposal. Invitations are pending until the invitee accepts/declines.
 *
 * The author cannot invite themselves (DB CHECK constraint); service
 * layer blocks this defensively too.
 */

import { supabase } from "@/lib/supabase";
import { resolveAuthenticatedUserId } from "@/services/_resolveAuth";
import { DB_DEFAULTS } from "@/services/proposalContract";
import type {
  CreateCollaboratorInvitationDTO,
  ProposalCollaborator,
  ProposalResult,
  RespondToInvitationDTO,
} from "@/services/proposalContract";
import { z } from "zod";

const COLLABORATOR_ROLE_ENUM = z.enum(["co_steward", "ally"]);
const COLLABORATOR_STATUS_ENUM = z.enum(["pending", "accepted", "declined"]);

const DB_COLLABORATOR_SCHEMA = z.object({
  id: z.string().uuid(),
  initiative_id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: COLLABORATOR_ROLE_ENUM,
  invited_by: z.string().uuid().nullable(),
  status: COLLABORATOR_STATUS_ENUM,
  message: z.string().nullable(),
  created_at: z.string(),
  responded_at: z.string().nullable(),
  // Joined profile fields
  username: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
});

type JoinedCollaboratorRow = z.infer<typeof DB_COLLABORATOR_SCHEMA>;

function firstNameFromFullName(
  fullName: string | null | undefined,
  username: string | null,
): string {
  const name = (fullName ?? "").trim();
  if (name) return name.split(/\s+/)[0] ?? username ?? "KUSQA";
  return username ?? "KUSQA";
}

function toDomain(row: JoinedCollaboratorRow): ProposalCollaborator {
  const username = row.username ?? "kusqa";
  return {
    id: row.id,
    initiativeId: row.initiative_id,
    userId: row.user_id,
    username,
    firstName: firstNameFromFullName(row.full_name, username),
    avatarUrl: row.avatar_url ?? null,
    role: row.role,
    status: row.status,
    invitedBy: row.invited_by,
    message: row.message,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
  };
}

export const proposalCollaboratorRepository = {
  /**
   * Invite a user to co-organize a proposal.
   * Caller must be the proposal's author (DB-enforced).
   */
  async invite(
    input: CreateCollaboratorInvitationDTO,
  ): Promise<ProposalResult<ProposalCollaborator>> {
    const invitedBy = await resolveAuthenticatedUserId();
    if (input.userId === invitedBy) {
      return { status: "error", error: "No puedes invitarte a ti mismo." };
    }
    if (input.message && input.message.length > DB_DEFAULTS.COLLABORATOR_MESSAGE_MAX) {
      return {
        status: "error",
        error: `El mensaje no puede superar ${DB_DEFAULTS.COLLABORATOR_MESSAGE_MAX} caracteres.`,
      };
    }

    const { data, error } = await supabase
      .from("initiative_stewards")
      .insert({
        initiative_id: input.initiativeId,
        user_id: input.userId,
        role: input.role,
        invited_by: invitedBy,
        message: input.message ?? null,
        status: "pending",
      })
      .select(
        `
        id, initiative_id, user_id, role, invited_by, status, message,
        created_at, responded_at,
        profiles:user_id ( username, full_name, avatar_url )
        `,
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return {
          status: "error",
          error: "Esta persona ya tiene una invitación para esta propuesta.",
        };
      }
      return { status: "error", error: `No se pudo enviar la invitación: ${error.message}` };
    }

    const flattened = flattenRow(data);
    const parsed = DB_COLLABORATOR_SCHEMA.safeParse(flattened);
    if (!parsed.success) {
      return { status: "error", error: "Respuesta inesperada del servidor." };
    }
    return { status: "success", data: toDomain(parsed.data) };
  },

  /**
   * Respond to an invitation (accept or decline).
   * Caller must be the invited user (DB-enforced).
   */
  async respond(
    input: RespondToInvitationDTO & { currentUserId: string },
  ): Promise<ProposalResult<ProposalCollaborator>> {
    const { data, error } = await supabase
      .from("initiative_stewards")
      .update({
        status: input.response,
        responded_at: new Date().toISOString(),
      })
      .eq("id", input.collaboratorId)
      .eq("user_id", input.currentUserId)
      .select(
        `
        id, initiative_id, user_id, role, invited_by, status, message,
        created_at, responded_at,
        profiles:user_id ( username, full_name, avatar_url )
        `,
      )
      .single();

    if (error) {
      return { status: "error", error: `No se pudo responder a la invitación: ${error.message}` };
    }
    const flattened = flattenRow(data);
    const parsed = DB_COLLABORATOR_SCHEMA.safeParse(flattened);
    if (!parsed.success) {
      return { status: "error", error: "Respuesta inesperada del servidor." };
    }
    return { status: "success", data: toDomain(parsed.data) };
  },

  /**
   * List ACCEPTED collaborators for a proposal. Public to all authenticated
   * users (this is the public coalition).
   */
  async listAccepted(initiativeId: string): Promise<ProposalCollaborator[]> {
    const { data, error } = await supabase
      .from("initiative_stewards")
      .select(
        `
        id, initiative_id, user_id, role, invited_by, status, message,
        created_at, responded_at,
        profiles:user_id ( username, full_name, avatar_url )
        `,
      )
      .eq("initiative_id", initiativeId)
      .eq("status", "accepted")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to load collaborators: ${error.message}`);
    }
    return (data ?? [])
      .map(flattenRow)
      .map((row: unknown) => {
        const parsed = DB_COLLABORATOR_SCHEMA.safeParse(row);
        return parsed.success ? toDomain(parsed.data) : null;
      })
      .filter((c: ProposalCollaborator | null): c is ProposalCollaborator => c !== null);
  },

  /**
   * List the pending invitations received by the current user.
   */
  async listPendingForUser(currentUserId: string): Promise<ProposalCollaborator[]> {
    const { data, error } = await supabase
      .from("initiative_stewards")
      .select(
        `
        id, initiative_id, user_id, role, invited_by, status, message,
        created_at, responded_at,
        profiles:user_id ( username, full_name, avatar_url )
        `,
      )
      .eq("user_id", currentUserId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to load pending invitations: ${error.message}`);
    }
    return (data ?? [])
      .map(flattenRow)
      .map((row: unknown) => {
        const parsed = DB_COLLABORATOR_SCHEMA.safeParse(row);
        return parsed.success ? toDomain(parsed.data) : null;
      })
      .filter((c: ProposalCollaborator | null): c is ProposalCollaborator => c !== null);
  },

  /**
   * Withdraw a pending invitation (author-only).
   * Authorization is enforced by RLS: the author can only delete rows
   * belonging to their own proposals.
   */
  async withdraw(collaboratorId: string): Promise<ProposalResult<true>> {
    const { error } = await supabase
      .from("initiative_stewards")
      .delete()
      .eq("id", collaboratorId)
      .eq("status", "pending");

    if (error) {
      return { status: "error", error: `No se pudo retirar la invitación: ${error.message}` };
    }
    return { status: "success", data: true };
  },
};

// ─── Helper: flatten Supabase join shapes ──────────────────────────────────

function flattenRow(raw: unknown): JoinedCollaboratorRow {
  if (!raw || typeof raw !== "object") {
    return {
      id: "",
      initiative_id: "",
      user_id: "",
      role: "ally",
      invited_by: null,
      status: "pending",
      message: null,
      created_at: new Date().toISOString(),
      responded_at: null,
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
    user_id: String(row.user_id ?? ""),
    role: (row.role as JoinedCollaboratorRow["role"]) ?? "ally",
    invited_by: (row.invited_by as string | null) ?? null,
    status: (row.status as JoinedCollaboratorRow["status"]) ?? "pending",
    message: (row.message as string | null) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    responded_at: (row.responded_at as string | null) ?? null,
    username: (profile?.username as string | null) ?? null,
    full_name: (profile?.full_name as string | null) ?? null,
    avatar_url: (profile?.avatar_url as string | null) ?? null,
  };
}
