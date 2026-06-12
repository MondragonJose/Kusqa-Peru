/**
 * endorsementRepository — Phase 3.
 *
 * Reads from the initiative_endorsements table (authenticated SELECT RLS).
 * Returns public-safe endorsement records: which institutions are linked
 * to which initiatives and in what relation.
 *
 * Batch reads to avoid N+1 in the enrichment pipeline.
 */

import { supabase } from "@/lib/supabase";
import { z } from "zod";
import type { InitiativeEndorsement } from "@/domain/initiative";

const RPC_ENDORSEMENT_SCHEMA = z.object({
  id: z.string().uuid(),
  initiative_id: z.string().uuid(),
  institution_id: z.string().uuid(),
  relation: z.enum(["supporter", "collaborator", "origin"]),
  created_at: z.string(),
});

function parseRow(row: unknown): InitiativeEndorsement | null {
  const parsed = RPC_ENDORSEMENT_SCHEMA.safeParse(row);
  if (!parsed.success) return null;
  const r = parsed.data;
  return {
    id: r.id,
    initiativeId: r.initiative_id,
    institutionId: r.institution_id,
    relation: r.relation,
    createdAt: r.created_at,
  };
}

export const endorsementRepository = {
  /**
   * Batch-load endorsements for a set of initiative UUIDs.
   * Returns a Map keyed by initiativeId for O(1) lookup.
   * Never throws — returns an empty map on error.
   */
  async listByInitiativeIds(ids: string[]): Promise<Map<string, InitiativeEndorsement[]>> {
    if (ids.length === 0) return new Map();

    const { data, error } = await supabase
      .from("initiative_endorsements")
      .select("*")
      .in("initiative_id", ids);

    if (error || !data) return new Map();

    const map = new Map<string, InitiativeEndorsement[]>();
    for (const row of data) {
      const endorsement = parseRow(row);
      if (!endorsement) continue;
      const existing = map.get(endorsement.initiativeId) ?? [];
      existing.push(endorsement);
      map.set(endorsement.initiativeId, existing);
    }
    return map;
  },

  /**
   * Load endorsements for a single initiative UUID.
   */
  async listByInitiativeId(id: string): Promise<InitiativeEndorsement[]> {
    const result = await this.listByInitiativeIds([id]);
    return result.get(id) ?? [];
  },
};
