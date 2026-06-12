-- KUSQA Phase 3: institutions table (audit Section 4.1).
--
-- PROBLEM:
--   No institution entity exists today. Initiatives have no territorial
--   organization, school, NGO, or municipal collective as a first-class
--   actor. Every reference to an institution is a raw text string or a
--   comment with no FK, making organization-scoped features (endorsements,
--   institutional partnerships, school-tied initiatives) impossible to
--   implement without ad-hoc string matching.
--
-- CHANGE:
--   1. Create public.institutions table with slug-based identity.
--   2. FK to districts ONLY — no initiative/mission/proposal coupling.
--   3. RLS enabled with default-deny for all direct table access.
--   4. SECURITY DEFINER RPC get_public_institution(slug) as the sole
--      public-safe read surface.
--   5. verification_state is NEVER exposed through the RPC.
--
-- IDEMPOTENT: Yes (IF NOT EXISTS / DROP IF EXISTS / OR REPLACE).
-- REVERSIBLE:  Drop the table, function, and the migration file.
-- NO frozen files are altered.

-- ===========================================================================
-- 1) Create institutions table
-- ===========================================================================

create table if not exists public.institutions (
  id                 uuid        primary key default gen_random_uuid(),
  slug               text        not null,
  name               text        not null,
  description        text,
  kind               text        not null check (kind in ('municipality', 'ngo', 'school', 'collective')),
  district_id        uuid        not null references public.districts(id) on delete restrict,
  verification_state text        not null default 'unverified' check (verification_state in ('unverified', 'verified')),
  email              text,
  phone              text,
  website            text,
  created_at         timestamptz not null default now()
);

-- Slug is the public URL-safe identifier
create unique index if not exists institutions_slug_uidx on public.institutions (slug);
create index if not exists institutions_district_id_idx on public.institutions (district_id);
create index if not exists institutions_kind_idx on public.institutions (kind);

-- ===========================================================================
-- 2) RLS — default-deny for direct table access
-- ===========================================================================

alter table public.institutions enable row level security;

-- No SELECT policy for anon or authenticated — public read is exclusively
-- through the SECURITY DEFINER RPC get_public_institution(slug).
-- No INSERT/UPDATE/DELETE policies — mutations are service_role only.

-- ===========================================================================
-- 3) SECURITY DEFINER RPC — get_public_institution
-- ===========================================================================
--
-- Returns the public-safe projection of a single institution by slug.
-- verification_state is deliberately excluded.
-- Pattern: mirrors get_public_profile (src/migrations/20260607020000).

create or replace function public.get_public_institution(p_slug text)
returns table (
  id              uuid,
  slug            text,
  name            text,
  description     text,
  kind            text,
  district_id     uuid,
  email           text,
  phone           text,
  website         text,
  created_at      timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return query
  select
    i.id,
    i.slug,
    i.name,
    i.description,
    i.kind,
    i.district_id,
    i.email,
    i.phone,
    i.website,
    i.created_at
  from public.institutions i
  where i.slug = p_slug;

  if not found then
    return;
  end if;
end;
$$;

-- ===========================================================================
-- 4) Grants — only the RPC surface is accessible to anon/authenticated
-- ===========================================================================

revoke all on table public.institutions from anon, authenticated;

revoke all on function public.get_public_institution(text) from public;
grant execute on function public.get_public_institution(text) to anon, authenticated;

-- ===========================================================================
-- 5) Documentation
-- ===========================================================================

comment on table public.institutions is
  'Institutional actors (municipality, NGO, school, collective). '
  'Direct table access is RLS-default-deny. Public read is via get_public_institution RPC only. '
  'verification_state is never exposed outside of service_role.';
