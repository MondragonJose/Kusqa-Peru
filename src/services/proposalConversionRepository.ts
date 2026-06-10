/**
 * Proposal conversion repository — Phase 3B.
 *
 * Wraps the `convert_proposal_to_mission` and `reopen_proposal` SECURITY
 * DEFINER RPCs added in migration 20260606040000.
 *
 * Authorization rules:
 *   - The RPC itself enforces author-only access. The repository's job is
 *     to translate typed DTOs into the right RPC args and surface errors
 *     in Spanish for the UI.
 *   - All methods return ProposalResult (deterministic).
 */

import { supabase } from "@/lib/supabase";
import { z } from "zod";

export const PROPOSAL_LIFECYCLE_EVENT_TYPES = [
  "coalition_threshold_reached",
  "organizer_confirmed",
  "mission_created",
  "proposal_locked",
  "proposal_reopened",
] as const;
export type ProposalLifecycleEventType = (typeof PROPOSAL_LIFECYCLE_EVENT_TYPES)[number];

export type ProposalLifecycleEvent = {
  id: string;
  eventType: ProposalLifecycleEventType;
  actorUsername: string;
  actorFirstName: string;
  actorAvatarUrl: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  convertedMissionId: string | null;
  detail: string | null;
  createdAt: string;
};

export type ProposalResult<T = unknown> =
  | { status: "success"; data: T }
  | { status: "error"; error: string };

// ─── Error message translation ────────────────────────────────────────────

const RPC_ERROR_COPY: Record<string, string> = {
  UNAUTHENTICATED: "Necesitas iniciar sesión para continuar.",
  PROPOSAL_NOT_FOUND: "No encontramos esta propuesta.",
  NOT_AUTHOR: "Solo la persona que propuso puede realizar esta acción.",
  THRESHOLD_NOT_MET:
    "La propuesta aún no ha reunido los apoyos necesarios para convertirse en misión.",
  NOT_CONVERTED: "Esta propuesta no ha sido convertida todavía.",
};

function translateRpcError(code: string | null, fallback: string): string {
  if (!code) return fallback;
  return RPC_ERROR_COPY[code] ?? fallback;
}

function extractRpcErrorCode(message: string): string | null {
  // Postgres `raise exception 'CODE' using errcode = '...'`
  // The JS error.message typically contains the code string.
  for (const code of Object.keys(RPC_ERROR_COPY)) {
    if (message.includes(code)) return code;
  }
  return null;
}

// ─── Repository ──────────────────────────────────────────────────────────

const LIFECYCLE_EVENT_SCHEMA = z.object({
  id: z.string().uuid(),
  event_type: z.enum(PROPOSAL_LIFECYCLE_EVENT_TYPES),
  actor_username: z.string(),
  actor_first_name: z.string(),
  actor_avatar_url: z.string().nullable(),
  from_status: z.string().nullable(),
  to_status: z.string().nullable(),
  converted_mission_id: z.string().uuid().nullable(),
  detail: z.string().nullable(),
  created_at: z.string(),
});

function toLifecycleEvent(row: z.infer<typeof LIFECYCLE_EVENT_SCHEMA>): ProposalLifecycleEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    actorUsername: row.actor_username,
    actorFirstName: row.actor_first_name,
    actorAvatarUrl: row.actor_avatar_url,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    convertedMissionId: row.converted_mission_id,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

export const proposalConversionRepository = {
  /**
   * Author-initiated conversion. The RPC is idempotent: if the proposal
   * was already converted, it returns the existing mission_id.
   */
  async convert(input: {
    proposalId: string;
    initialDate?: string | null;
    organizerNotes?: string | null;
  }): Promise<ProposalResult<string>> {
    try {
      const { data, error } = await supabase.rpc("convert_proposal_to_mission", {
        p_proposal_id: input.proposalId,
        p_initial_date: input.initialDate ?? null,
        p_organizer_notes: input.organizerNotes ?? null,
      });

      if (error) {
        const code = extractRpcErrorCode(error.message);
        return {
          status: "error",
          error: translateRpcError(code, error.message),
        };
      }

      const missionId = typeof data === "string" ? data : null;
      if (!missionId) {
        return { status: "error", error: "Respuesta inesperada del servidor." };
      }
      return { status: "success", data: missionId };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido.";
      const code = extractRpcErrorCode(message);
      return {
        status: "error",
        error: translateRpcError(code, "No se pudo convertir la propuesta."),
      };
    }
  },

  /**
   * Author-only undo. Reverts proposal status to pending and clears the
   * converted link. The original mission row is preserved for history.
   */
  async reopen(input: {
    proposalId: string;
    reason?: string | null;
  }): Promise<ProposalResult<true>> {
    try {
      const { error } = await supabase.rpc("reopen_proposal", {
        p_proposal_id: input.proposalId,
        p_reason: input.reason ?? null,
      });

      if (error) {
        const code = extractRpcErrorCode(error.message);
        return {
          status: "error",
          error: translateRpcError(code, error.message),
        };
      }
      return { status: "success", data: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error desconocido.";
      const code = extractRpcErrorCode(message);
      return {
        status: "error",
        error: translateRpcError(code, "No se pudo reabrir la propuesta."),
      };
    }
  },

  /**
   * Reverse lookup: find the proposal that originated a mission.
   * Queries lifecycle events where converted_mission_id matches.
   * Returns the proposal_id if found, null otherwise.
   */
  async findProposalByMissionId(missionId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from("proposal_lifecycle_events")
        .select("proposal_id")
        .eq("converted_mission_id", missionId)
        .eq("event_type", "mission_created")
        .maybeSingle();

      if (error || !data) return null;
      return (data as { proposal_id: string }).proposal_id;
    } catch {
      return null;
    }
  },

  /**
   * Public-safe list of lifecycle events for a proposal. Used by the
   * conversion history section on the proposal detail page.
   */
  async listLifecycleEvents(
    proposalId: string,
    limit: number = 20,
  ): Promise<ProposalLifecycleEvent[]> {
    try {
      const { data, error } = await supabase.rpc("get_proposal_lifecycle_events", {
        p_proposal_id: proposalId,
        p_limit: limit,
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error("[KUSQA CONVERSION TRACE] listLifecycleEvents error:", error);
        }
        return [];
      }
      if (!Array.isArray(data)) return [];

      return data
        .map((row: unknown) => {
          const parsed = LIFECYCLE_EVENT_SCHEMA.safeParse(row);
          return parsed.success ? toLifecycleEvent(parsed.data) : null;
        })
        .filter((e): e is ProposalLifecycleEvent => e !== null);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA CONVERSION TRACE] listLifecycleEvents unexpected:", e);
      }
      return [];
    }
  },
};
