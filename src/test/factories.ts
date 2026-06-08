/**
 * Test factories — Phase 5A.
 *
 * Generate Zod-validated row payloads for repository tests. Each
 * factory takes an optional `overrides` so individual tests can
 * mutate one field without rebuilding the whole object.
 *
 * The factories intentionally mirror the database column shape
 * (snake_case, nullable columns) — repositories transform these
 * into the domain shape the rest of the app uses.
 */

import { z } from "zod";

// ---- Proposals ---------------------------------------------------------

export const proposalRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  district: z.string(),
  region: z.enum(["costa", "sierra", "selva"]),
  team_size: z.number().int().nonnegative(),
  images: z.array(z.string()).nullable(),
  status: z.enum(["draft", "active", "converted", "closed"]),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  proposed_date: z.string().nullable(),
  district_id: z.string().uuid().nullable(),
  summary: z.string().nullable(),
  why: z.string().nullable(),
  location_label: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ProposalRow = z.infer<typeof proposalRowSchema>;

export function makeProposalRow(overrides: Partial<ProposalRow> = {}): ProposalRow {
  return proposalRowSchema.parse({
    id: "11111111-1111-1111-1111-111111111111",
    user_id: "22222222-2222-2222-2222-222222222222",
    title: "Reparación de veredas en Av. Principal",
    description: "Las veredas del jirón están en mal estado.",
    category: "infraestructura",
    district: "cusco-cusco",
    region: "sierra",
    team_size: 1,
    images: null,
    status: "active",
    latitude: null,
    longitude: null,
    proposed_date: null,
    district_id: null,
    summary: null,
    why: null,
    location_label: null,
    created_at: "2026-06-01T12:00:00Z",
    updated_at: "2026-06-01T12:00:00Z",
    ...overrides,
  });
}

// ---- Districts ---------------------------------------------------------

export const districtRowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  display_name: z.string(),
  region: z.enum(["costa", "sierra", "selva"]),
  department: z.string().nullable(),
  latitude: z.union([z.string(), z.number()]).nullable(),
  longitude: z.union([z.string(), z.number()]).nullable(),
  narrative: z.string().nullable(),
  sort_order: z.number().nullable(),
});

export type DistrictRow = z.infer<typeof districtRowSchema>;

export function makeDistrictRow(overrides: Partial<DistrictRow> = {}): DistrictRow {
  return districtRowSchema.parse({
    id: "33333333-3333-3333-3333-333333333333",
    slug: "cusco-cusco",
    display_name: "Cusco",
    region: "sierra",
    department: "Cusco",
    latitude: -13.5167,
    longitude: -71.9789,
    narrative: "Capital histórica del imperio inca",
    sort_order: 1,
    ...overrides,
  });
}

export const districtStatsRowSchema = z.object({
  district_id: z.string(),
  slug: z.string(),
  display_name: z.string(),
  region: z.enum(["costa", "sierra", "selva"]),
  department: z.string().nullable(),
  mission_count: z.number().int().nonnegative(),
  upcoming_mission_count: z.number().int().nonnegative(),
  completed_mission_count: z.number().int().nonnegative(),
  proposal_count: z.number().int().nonnegative(),
  active_proposal_count: z.number().int().nonnegative(),
  unique_supporter_count: z.number().int().nonnegative(),
  accepted_collaborator_count: z.number().int().nonnegative(),
  last_activity_at: z.string().nullable(),
});

export type DistrictStatsRow = z.infer<typeof districtStatsRowSchema>;

export function makeDistrictStatsRow(overrides: Partial<DistrictStatsRow> = {}): DistrictStatsRow {
  return districtStatsRowSchema.parse({
    district_id: "33333333-3333-3333-3333-333333333333",
    slug: "cusco-cusco",
    display_name: "Cusco",
    region: "sierra",
    department: "Cusco",
    mission_count: 0,
    upcoming_mission_count: 0,
    completed_mission_count: 0,
    proposal_count: 0,
    active_proposal_count: 0,
    unique_supporter_count: 0,
    accepted_collaborator_count: 0,
    last_activity_at: null,
    ...overrides,
  });
}

// ---- Civic events ------------------------------------------------------

export const civicEventRowSchema = z.object({
  id: z.string().uuid(),
  kind: z.string(),
  actor_id: z.string().uuid().nullable(),
  target_type: z.string().nullable(),
  target_id: z.string().uuid().nullable(),
  district_id: z.string().uuid().nullable(),
  payload: z.record(z.string(), z.unknown()),
  occurred_at: z.string(),
  dedupe_key: z.string().nullable(),
});

export type CivicEventRow = z.infer<typeof civicEventRowSchema>;

export function makeCivicEventRow(overrides: Partial<CivicEventRow> = {}): CivicEventRow {
  return civicEventRowSchema.parse({
    id: "44444444-4444-4444-4444-444444444444",
    kind: "proposal.created",
    actor_id: "22222222-2222-2222-2222-222222222222",
    target_type: "proposal",
    target_id: "11111111-1111-1111-1111-111111111111",
    district_id: "33333333-3333-3333-3333-333333333333",
    payload: {},
    occurred_at: "2026-06-07T10:00:00Z",
    dedupe_key: null,
    ...overrides,
  });
}

// ---- Public profile (RPC output) --------------------------------------

export const publicProfileRpcSchema = z.object({
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
  top_districts: z
    .array(
      z.object({
        id: z.string().uuid(),
        slug: z.string(),
        name: z.string(),
        count: z.union([z.number(), z.string()]),
      }),
    )
    .nullable(),
});

export type PublicProfileRpc = z.infer<typeof publicProfileRpcSchema>;

export function makePublicProfileRpc(overrides: Partial<PublicProfileRpc> = {}): PublicProfileRpc {
  return publicProfileRpcSchema.parse({
    id: "22222222-2222-2222-2222-222222222222",
    username: "ana_cusco",
    full_name: "Ana Quispe",
    avatar_url: null,
    bio: "Vecina del Cusco",
    district: "cusco-cusco",
    region: "sierra",
    district_id: "33333333-3333-3333-3333-333333333333",
    district_slug: "cusco-cusco",
    joined_at: "2025-12-01T00:00:00Z",
    mission_count: 0,
    co_organized_count: 0,
    supported_proposal_count: 0,
    distinct_district_count: 0,
    top_districts: [],
    ...overrides,
  });
}

// ---- User notification row --------------------------------------------

export const userNotificationRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  notification_type: z.string(),
  title: z.string(),
  body: z.string(),
  payload: z.record(z.string(), z.unknown()),
  read_at: z.string().nullable(),
  created_at: z.string(),
});

export type UserNotificationRow = z.infer<typeof userNotificationRowSchema>;

export function makeUserNotificationRow(
  overrides: Partial<UserNotificationRow> = {},
): UserNotificationRow {
  return userNotificationRowSchema.parse({
    id: "55555555-5555-5555-5555-555555555555",
    user_id: "22222222-2222-2222-2222-222222222222",
    notification_type: "mission_joined",
    title: "Te uniste a la misión",
    body: "Bienvenida a la brigada",
    payload: { mission_id: "66666666-6666-6666-6666-666666666666" },
    read_at: null,
    created_at: "2026-06-07T10:00:00Z",
    ...overrides,
  });
}
