/**
 * publicProfileRepository — Phase 4A.
 *
 * Reads from the SECURITY DEFINER RPC `get_public_profile(user_id)`.
 * Returns a strictly public-safe projection of a profile: no email,
 * no auth metadata, no private fields. The profiles table itself
 * remains own-only RLS (see 20260601000000_fix_profiles_rls.sql) so
 * this RPC is the only auditable read path for other users.
 */

import { supabase } from "@/lib/supabase";
import { z } from "zod";

export type PublicTopDistrict = {
  id: string;
  slug: string;
  displayName: string;
  missionCount: number;
};

export type PublicProfile = {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  district: string | null;
  region: string | null;
  districtId: string | null;
  districtSlug: string | null;
  joinedAt: string;
  missionCount: number;
  coOrganizedCount: number;
  supportedProposalCount: number;
  distinctDistrictCount: number;
  topDistricts: PublicTopDistrict[];
};

const TOP_DISTRICT_SCHEMA = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  display_name: z.string(),
  mission_count: z.union([z.number(), z.string()]),
});

const RPC_PROFILE_SCHEMA = z.object({
  id: z.string().uuid(),
  username: z.string(),
  full_name: z.string(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  district: z.string().nullable(),
  region: z.string().nullable(),
  district_id: z.string().uuid().nullable(),
  district_slug: z.string().nullable(),
  joined_at: z.string(),
  mission_count: z.union([z.number(), z.string()]),
  co_organized_count: z.union([z.number(), z.string()]),
  supported_proposal_count: z.union([z.number(), z.string()]),
  distinct_district_count: z.union([z.number(), z.string()]),
  top_districts: z.array(TOP_DISTRICT_SCHEMA).nullable(),
});

const toInt = (v: number | string): number => (typeof v === "number" ? v : parseInt(v, 10) || 0);

export const publicProfileRepository = {
  /**
   * Returns the public-safe projection for a given user, or null if
   * the user does not exist (or RLS / RPC is missing). Never throws.
   */
  async findByUserId(userId: string): Promise<PublicProfile | null> {
    const { data, error } = await supabase.rpc("get_public_profile", {
      p_user_id: userId,
    });

    if (error) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA PUBLIC PROFILE TRACE] findByUserId error:", error);
      }
      return null;
    }
    if (!Array.isArray(data) || data.length === 0) return null;

    const parsed = RPC_PROFILE_SCHEMA.safeParse(data[0]);
    if (!parsed.success) {
      if (import.meta.env.DEV) {
        console.error("[KUSQA PUBLIC PROFILE TRACE] parse failure:", parsed.error);
      }
      return null;
    }
    const r = parsed.data;
    const topDistricts: PublicTopDistrict[] = (r.top_districts ?? []).map((d) => ({
      id: d.id,
      slug: d.slug,
      displayName: d.display_name,
      missionCount: toInt(d.mission_count),
    }));

    return {
      id: r.id,
      username: r.username,
      fullName: r.full_name,
      avatarUrl: r.avatar_url,
      bio: r.bio,
      district: r.district,
      region: r.region,
      districtId: r.district_id,
      districtSlug: r.district_slug,
      joinedAt: r.joined_at,
      missionCount: toInt(r.mission_count),
      coOrganizedCount: toInt(r.co_organized_count),
      supportedProposalCount: toInt(r.supported_proposal_count),
      distinctDistrictCount: toInt(r.distinct_district_count),
      topDistricts,
    };
  },
};
