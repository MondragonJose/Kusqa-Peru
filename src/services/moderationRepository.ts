/**
 * Trust & safety — lightweight moderation reports.
 */

import { supabase } from "@/lib/supabase";
import { z } from "zod";

export type ModerationTargetType = "mission" | "evidence" | "user" | "activity" | "proposal";

export type ModerationReportRow = {
  id: string;
  reporterId: string;
  targetType: ModerationTargetType;
  targetId: string;
  reasonCode: string;
  description: string | null;
  status: "pending" | "reviewing" | "resolved" | "dismissed";
  createdAt: string;
};

const REPORT_INPUT_SCHEMA = z.object({
  reporterId: z.string().uuid(),
  targetType: z.enum(["mission", "evidence", "user", "activity", "proposal"]),
  targetId: z.string().uuid(),
  reasonCode: z.string().min(2).max(64),
  description: z.string().max(2000).optional(),
});

const DB_REPORT_SCHEMA = z.object({
  id: z.string().uuid(),
  reporter_id: z.string().uuid(),
  target_type: z.enum(["mission", "evidence", "user", "activity", "proposal"]),
  target_id: z.string().uuid(),
  reason_code: z.string(),
  description: z.string().nullable(),
  status: z.enum(["pending", "reviewing", "resolved", "dismissed"]),
  created_at: z.string(),
});

export const moderationRepository = {
  async report(input: z.infer<typeof REPORT_INPUT_SCHEMA>): Promise<ModerationReportRow> {
    const parsed = REPORT_INPUT_SCHEMA.parse(input);

    const { data: existing } = await supabase
      .from("moderation_reports")
      .select("id")
      .eq("reporter_id", parsed.reporterId)
      .eq("target_type", parsed.targetType)
      .eq("target_id", parsed.targetId)
      .in("status", ["pending", "reviewing"])
      .maybeSingle();

    if (existing) {
      throw new Error("You have already reported this content");
    }

    const { data, error } = await supabase
      .from("moderation_reports")
      .insert({
        reporter_id: parsed.reporterId,
        target_type: parsed.targetType,
        target_id: parsed.targetId,
        reason_code: parsed.reasonCode,
        description: parsed.description ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to submit moderation report: ${error.message}`);
    }

    const row = DB_REPORT_SCHEMA.parse(data);
    return {
      id: row.id,
      reporterId: row.reporter_id,
      targetType: row.target_type,
      targetId: row.target_id,
      reasonCode: row.reason_code,
      description: row.description,
      status: row.status,
      createdAt: row.created_at,
    };
  },

  async findPending(limit = 100): Promise<ModerationReportRow[]> {
    const { data, error } = await supabase
      .from("moderation_reports")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch moderation queue: ${error.message}`);
    }

    return (data ?? []).map((row: unknown) => {
      const parsed = DB_REPORT_SCHEMA.parse(row);
      return {
        id: parsed.id,
        reporterId: parsed.reporter_id,
        targetType: parsed.target_type,
        targetId: parsed.target_id,
        reasonCode: parsed.reason_code,
        description: parsed.description,
        status: parsed.status,
        createdAt: parsed.created_at,
      };
    });
  },
};
