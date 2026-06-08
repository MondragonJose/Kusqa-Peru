/**
 * civicEventsRepository — append-only event log reader.
 *
 * Phase 4A backbone. Reads go through SECURITY DEFINER RPC
 * `get_civic_events_for_profile(user_id, limit)` which returns a
 * public-safe projection (no email, no auth metadata, no private
 * payload). Writes happen exclusively through server-side RPCs and
 * triggers; the client never INSERTs into civic_events directly.
 */

import { supabase } from "@/lib/supabase";
import { z } from "zod";

const CIVIC_EVENT_KINDS = [
  "proposal.created",
  "proposal.supported",
  "proposal.unsupported",
  "proposal.comment_added",
  "proposal.collaborator_joined",
  "proposal.threshold_reached",
  "proposal.converted_to_mission",
  "proposal.reopened",
  "mission.joined",
  "mission.completed",
  "mission.evidence_submitted",
  "mission.evidence_verified",
  "district.first_movement",
  "community.trust_changed",
  "community.profile_milestone",
] as const;

export type CivicEventKind = (typeof CIVIC_EVENT_KINDS)[number];

export type CivicEventTargetType =
  | "mission"
  | "proposal"
  | "comment"
  | "district"
  | "profile"
  | "evidence";

export type CivicProfileEvent = {
  id: string;
  kind: CivicEventKind;
  targetType: CivicEventTargetType;
  targetId: string;
  districtId: string | null;
  districtSlug: string | null;
  districtName: string | null;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export const RPC_EVENT_SCHEMA = z.object({
  id: z.string().uuid(),
  kind: z.enum(CIVIC_EVENT_KINDS),
  target_type: z.string(),
  target_id: z.string().uuid(),
  district_id: z.string().uuid().nullable(),
  district_slug: z.string().nullable(),
  district_name: z.string().nullable(),
  occurred_at: z.string(),
  payload: z.record(z.unknown()).nullable(),
});

export const civicEventsRepository = {
  /**
   * Read the public activity timeline for a given user. Returns ZERO rows
   * (empty array) on any error — the UI must always render, even if the
   * event log is missing or the RPC has not been deployed yet.
   */
  async listForProfile(userId: string, limit: number = 20): Promise<CivicProfileEvent[]> {
    const { data, error } = await supabase.rpc("get_civic_events_for_profile", {
      p_user_id: userId,
      p_limit: limit,
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA CIVIC EVENTS TRACE] listForProfile error:", error);
      }
      return [];
    }
    if (!Array.isArray(data)) return [];

    const events: CivicProfileEvent[] = [];
    for (const row of data) {
      const parsed = RPC_EVENT_SCHEMA.safeParse(row);
      if (!parsed.success) continue;
      const r = parsed.data;
      events.push({
        id: r.id,
        kind: r.kind,
        targetType: r.target_type as CivicEventTargetType,
        targetId: r.target_id,
        districtId: r.district_id,
        districtSlug: r.district_slug,
        districtName: r.district_name,
        occurredAt: r.occurred_at,
        payload: (r.payload ?? {}) as Record<string, unknown>,
      });
    }
    return events;
  },
};

// Human-readable copy per event kind. Pure data so the timeline
// component stays free of conditional logic and is easy to localize.
export const CIVIC_EVENT_COPY: Record<
  CivicEventKind,
  { title: string; icon: "support" | "comment" | "check" | "spark" | "people" | "flag" | "shield" }
> = {
  "proposal.created": { title: "Inició una propuesta", icon: "spark" },
  "proposal.supported": { title: "Apoyó una propuesta", icon: "support" },
  "proposal.unsupported": { title: "Retiró su apoyo", icon: "support" },
  "proposal.comment_added": { title: "Participó en la conversación", icon: "comment" },
  "proposal.collaborator_joined": { title: "Se sumó a co-organizar", icon: "people" },
  "proposal.threshold_reached": { title: "Cruzó el umbral de apoyo", icon: "spark" },
  "proposal.converted_to_mission": { title: "Convirtió la propuesta en misión", icon: "check" },
  "proposal.reopened": { title: "Reabrió la propuesta", icon: "flag" },
  "mission.joined": { title: "Se sumó a una misión", icon: "people" },
  "mission.completed": { title: "Completó una misión", icon: "check" },
  "mission.evidence_submitted": { title: "Envió evidencia", icon: "comment" },
  "mission.evidence_verified": { title: "Evidencia verificada", icon: "shield" },
  "district.first_movement": { title: "Inició la primera ruta en su distrito", icon: "spark" },
  "community.trust_changed": { title: "Avanza en su nivel de confianza", icon: "shield" },
  "community.profile_milestone": { title: "Alcanzó un nuevo hito", icon: "spark" },
};
