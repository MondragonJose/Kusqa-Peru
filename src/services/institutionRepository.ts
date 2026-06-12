/**
 * institutionRepository — Phase 3.
 *
 * Reads from the SECURITY DEFINER RPC `get_public_institution(slug)`.
 * Returns a strictly public-safe projection of an institution:
 * no verification_state, no private fields. The institutions table
 * itself is RLS-default-deny (see 20260628000000_create_institutions)
 * so this RPC is the only auditable read path.
 */

import { supabase } from "@/lib/supabase";
import { z } from "zod";

export type PublicInstitution = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: string;
  districtId: string;
  verified: boolean;
  email: string | null;
  phone: string | null;
  website: string | null;
  createdAt: string;
};

const RPC_INSTITUTION_SCHEMA = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  kind: z.string(),
  district_id: z.string().uuid(),
  verified: z.boolean(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().nullable(),
  created_at: z.string(),
});

export const institutionRepository = {
  /**
   * Returns the public-safe projection for a given institution slug,
   * or null if the institution does not exist (or RPC is missing).
   * Never throws.
   */
  async findBySlug(slug: string): Promise<PublicInstitution | null> {
    const { data, error } = await supabase.rpc("get_public_institution", {
      p_slug: slug,
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA INSTITUTION TRACE] findBySlug error:", error);
      }
      return null;
    }
    if (!Array.isArray(data) || data.length === 0) return null;

    const parsed = RPC_INSTITUTION_SCHEMA.safeParse(data[0]);
    if (!parsed.success) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA INSTITUTION TRACE] parse failure:", parsed.error);
      }
      return null;
    }
    const r = parsed.data;

    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
      kind: r.kind,
      districtId: r.district_id,
      verified: r.verified,
      email: r.email,
      phone: r.phone,
      website: r.website,
      createdAt: r.created_at,
    };
  },
};
