/**
 * Proposal repository — the ONLY layer that touches Supabase for proposals.
 *
 * Contract:
 *   UI (camelCase DTO) → Repository (normalize + enrich + validate) → DB (snake_case)
 *
 * Invariants:
 *   1. user_id is ALWAYS resolved from supabase.auth.getUser(), never from UI
 *   2. Zod validates ONLY the final snake_case DB payload
 *   3. All methods return ProposalResult — callers never need try/catch
 *   4. DB types are from proposalContract.ts (manual, since generated types are empty)
 */

import { supabase } from "@/lib/supabase";
import { z } from "zod";
import {
  type Proposal,
  type CreateProposalDTO,
  type UpdateProposalDTO,
  type ProposalResult,
  type DbProposalRow,
  type DbProposalSupportRow,
  type ProposalSupport,
  type ProposalRegion,
  type ProposalStatus,
  PROPOSAL_CATEGORIES,
  PROPOSAL_REGIONS,
  PROPOSAL_STATUSES,
  DB_DEFAULTS,
} from "./proposalContract";

// Re-export contract types so consumers only need one import
export type { Proposal, CreateProposalDTO, UpdateProposalDTO, ProposalResult };

// ─── Zod schemas (validate snake_case DB payloads ONLY) ────────────────────

const PROPOSAL_INSERT_SCHEMA = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1, "El título es requerido").max(200, "El título es demasiado largo"),
  description: z.string().max(2000, "La descripción es demasiado larga").optional(),
  category: z.enum(PROPOSAL_CATEGORIES),
  district: z.string().min(1, "El distrito es requerido"),
  region: z.enum(PROPOSAL_REGIONS),
  team_size: z.number().int().min(DB_DEFAULTS.TEAM_SIZE_MIN).max(DB_DEFAULTS.TEAM_SIZE_MAX),
  images: z.array(z.string()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  proposed_date: z.string().optional(),
});

const PROPOSAL_UPDATE_SCHEMA = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.enum(PROPOSAL_CATEGORIES).optional(),
  district: z.string().min(1).optional(),
  region: z.enum(PROPOSAL_REGIONS).optional(),
  team_size: z.number().int().min(DB_DEFAULTS.TEAM_SIZE_MIN).max(DB_DEFAULTS.TEAM_SIZE_MAX).optional(),
  images: z.array(z.string()).optional(),
  status: z.enum(PROPOSAL_STATUSES).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  proposed_date: z.string().optional(),
});

// ─── Runtime assertion: validate raw Supabase response has expected shape ───

function assertDbRow(raw: unknown): DbProposalRow {
  if (!raw || typeof raw !== "object") {
    throw new Error("[KUSQA PROPOSAL TRACE] DB returned non-object: " + typeof raw);
  }
  const row = raw as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.user_id !== "string" || typeof row.title !== "string") {
    throw new Error("[KUSQA PROPOSAL TRACE] DB row missing required fields (id, user_id, title)");
  }
  return row as unknown as DbProposalRow;
}

function assertDbRows(raw: unknown): DbProposalRow[] {
  if (!Array.isArray(raw)) {
    throw new Error("[KUSQA PROPOSAL TRACE] DB returned non-array: " + typeof raw);
  }
  return raw.map(assertDbRow);
}

// ─── Mapping: DB row → Domain model (single place, no duplication) ─────────

function toDomain(db: DbProposalRow): Proposal {
  return {
    id: db.id,
    userId: db.user_id,
    title: db.title,
    description: db.description,
    category: db.category,
    district: db.district,
    region: db.region,
    teamSize: db.team_size,
    images: db.images || [],
    status: db.status,
    latitude: db.latitude != null ? Number(db.latitude) : null,
    longitude: db.longitude != null ? Number(db.longitude) : null,
    proposedDate: db.proposed_date,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

// ─── Internal: resolve authenticated user_id ───────────────────────────────

async function resolveUserId(): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error(`[KUSQA PROPOSAL TRACE] Cannot resolve user_id: ${error?.message ?? "no session"}`);
  }
  return user.id;
}

// ─── Repository ────────────────────────────────────────────────────────────

export const proposalRepository = {

  async createProposal(dto: CreateProposalDTO): Promise<ProposalResult> {
    // STEP 1: Resolve user_id from Supabase session
    let userId: string;
    try {
      userId = await resolveUserId();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Auth failed";
      console.error("[KUSQA PROPOSAL TRACE] Auth error:", msg);
      return { status: "error", error: msg };
    }

    // STEP 2: Normalize DTO → snake_case DB payload + apply DB-safe defaults
    const teamSize = (dto.teamSize != null && dto.teamSize >= DB_DEFAULTS.TEAM_SIZE_MIN)
      ? dto.teamSize
      : DB_DEFAULTS.TEAM_SIZE_FALLBACK;

    const dbPayload = {
      user_id: userId,
      title: dto.title,
      description: dto.description || undefined,
      category: dto.category,
      district: dto.district || "Perú",
      region: dto.region,
      team_size: teamSize,
      images: dto.images?.length ? dto.images : undefined,
      latitude: dto.latitude ?? undefined,
      longitude: dto.longitude ?? undefined,
      proposed_date: dto.proposedDate ?? undefined,
    };

    // STEP 3: Validate final payload with Zod
    if (import.meta.env.DEV) {
      console.log("[KUSQA PROPOSAL TRACE] Normalized DB payload:", JSON.stringify(dbPayload, null, 2));
    }
    let validatedPayload: Record<string, unknown>;
    try {
      validatedPayload = PROPOSAL_INSERT_SCHEMA.parse(dbPayload);
    } catch (e) {
      const msg = e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") : "Validation failed";
      console.error("[KUSQA PROPOSAL TRACE] Zod validation error:", msg);
      return { status: "error", error: `Datos inválidos: ${msg}` };
    }

    // STEP 4: Persist to Supabase
    const { data: rawData, error } = await supabase
      .from("proposals")
      .insert(validatedPayload)
      .select()
      .single();

    if (error) {
      console.error("[KUSQA PROPOSAL TRACE] Supabase insert error:", error);
      return { status: "error", error: `DB error: ${error.message}` };
    }

    if (!rawData) {
      console.error("[KUSQA PROPOSAL TRACE] Insert returned no data");
      return { status: "error", error: "Insert returned no data — persistence not confirmed" };
    }

    // STEP 5: Verify persistence — runtime-assert and return domain model
    const proposal = toDomain(assertDbRow(rawData));
    return { status: "success", data: proposal };
  },

  async getProposalById(id: string): Promise<Proposal | null> {
    const { data: rawData, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[KUSQA PROPOSAL TRACE] Error fetching proposal:", error);
      throw new Error(`Failed to fetch proposal: ${error.message}`);
    }

    if (!rawData) return null;

    return toDomain(assertDbRow(rawData));
  },

  async getProposalsByUserId(userId: string): Promise<Proposal[]> {
    const { data: rawData, error } = await supabase
      .from("proposals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[KUSQA PROPOSAL TRACE] Error fetching user proposals:", error);
      throw new Error(`Failed to fetch user proposals: ${error.message}`);
    }

    return assertDbRows(rawData).map(toDomain);
  },

  async getAllProposals(filters?: {
    region?: ProposalRegion;
    status?: ProposalStatus;
    district?: string;
  }): Promise<Proposal[]> {
    let query = supabase
      .from("proposals")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters?.region) query = query.eq("region", filters.region);
    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.district) query = query.ilike("district", `%${filters.district}%`);

    const { data: rawData, error } = await query;

    if (error) {
      console.error("[KUSQA PROPOSAL TRACE] Error fetching proposals:", error);
      throw new Error(`Failed to fetch proposals: ${error.message}`);
    }

    return assertDbRows(rawData).map(toDomain);
  },

  async updateProposal(id: string, dto: UpdateProposalDTO): Promise<ProposalResult> {
    if (import.meta.env.DEV) {
      console.log("[KUSQA PROPOSAL TRACE] Repository.updateProposal — id:", id);
    }

    // Normalize DTO → snake_case DB payload
    const dbPayload: Record<string, unknown> = {};
    if (dto.title !== undefined) dbPayload.title = dto.title;
    if (dto.description !== undefined) dbPayload.description = dto.description;
    if (dto.category !== undefined) dbPayload.category = dto.category;
    if (dto.district !== undefined) dbPayload.district = dto.district;
    if (dto.region !== undefined) dbPayload.region = dto.region;
    if (dto.teamSize !== undefined) dbPayload.team_size = dto.teamSize;
    if (dto.images !== undefined) dbPayload.images = dto.images;
    if (dto.status !== undefined) dbPayload.status = dto.status;
    if (dto.latitude !== undefined) dbPayload.latitude = dto.latitude;
    if (dto.longitude !== undefined) dbPayload.longitude = dto.longitude;
    if (dto.proposedDate !== undefined) dbPayload.proposed_date = dto.proposedDate;

    let validatedPayload: Record<string, unknown>;
    try {
      validatedPayload = PROPOSAL_UPDATE_SCHEMA.parse(dbPayload);
    } catch (e) {
      const msg = e instanceof z.ZodError ? e.issues.map(i => i.message).join("; ") : "Validation failed";
      console.error("[KUSQA PROPOSAL TRACE] Zod update validation error:", msg);
      return { status: "error", error: `Datos inválidos: ${msg}` };
    }

    const { data: rawData, error } = await supabase
      .from("proposals")
      .update(validatedPayload)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      console.error("[KUSQA PROPOSAL TRACE] Error updating proposal:", error);
      return { status: "error", error: `DB error: ${error.message}` };
    }

    if (!rawData) {
      return { status: "error", error: "Propuesta no encontrada" };
    }

    const proposal = toDomain(assertDbRow(rawData));
    return { status: "success", data: proposal };
  },

  async deleteProposal(id: string): Promise<ProposalResult<void>> {
    const { error } = await supabase
      .from("proposals")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[KUSQA PROPOSAL TRACE] Error deleting proposal:", error);
      return { status: "error", error: `DB error: ${error.message}` };
    }

    return { status: "success", data: undefined as void };
  },

  // ─── Proposal supports ───────────────────────────────────────────────────

  async supportProposal(proposalId: string): Promise<ProposalResult<void>> {
    let userId: string;
    try {
      userId = await resolveUserId();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Auth failed";
      return { status: "error", error: msg };
    }

    const { error } = await supabase
      .from("proposal_supports")
      .insert({ user_id: userId, proposal_id: proposalId });

    if (error) {
      if (error.code === "23505") {
        return { status: "success", data: undefined as void };
      }
      console.error("[KUSQA PROPOSAL TRACE] Error supporting proposal:", error);
      return { status: "error", error: `DB error: ${error.message}` };
    }

    return { status: "success", data: undefined as void };
  },

  async unsupportProposal(proposalId: string): Promise<ProposalResult<void>> {
    let userId: string;
    try {
      userId = await resolveUserId();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Auth failed";
      return { status: "error", error: msg };
    }

    const { error } = await supabase
      .from("proposal_supports")
      .delete()
      .eq("user_id", userId)
      .eq("proposal_id", proposalId);

    if (error) {
      console.error("[KUSQA PROPOSAL TRACE] Error unsupporting proposal:", error);
      return { status: "error", error: `DB error: ${error.message}` };
    }

    return { status: "success", data: undefined as void };
  },

  async getSupportedProposalIds(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from("proposal_supports")
      .select("proposal_id")
      .eq("user_id", userId);

    if (error) {
      console.error("[KUSQA PROPOSAL TRACE] Error fetching supported proposals:", error);
      throw new Error(`Failed to fetch supported proposals: ${error.message}`);
    }

    return (data ?? []).map((row: { proposal_id: string }) => row.proposal_id);
  },

  async getSupportCount(proposalId: string): Promise<number> {
    const { count, error } = await supabase
      .from("proposal_supports")
      .select("*", { count: "exact", head: true })
      .eq("proposal_id", proposalId);

    if (error) {
      console.error("[KUSQA PROPOSAL TRACE] Error counting proposal supports:", error);
      return 0;
    }

    return count ?? 0;
  },
};
