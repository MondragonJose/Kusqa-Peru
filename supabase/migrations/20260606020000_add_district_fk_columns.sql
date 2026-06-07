-- KUSQA: add district_id FK columns (Phase 3A).
--
-- Backward-compatible: nullable FK columns to public.districts, plus a
-- backfill that resolves the existing `district` text via the slug.
--
-- If a row's `district` text doesn't match any districts.slug (typo, free text,
-- legacy import), district_id is left NULL and the text column remains the
-- source of truth for that row.

-- ---------------------------------------------------------------------------
-- 1) Helper: derive a slug from a district name.
--    Mirrors the rules used in the districts seed (lowercase, strip accents,
--    collapse whitespace to '-'). Idempotent.
-- ---------------------------------------------------------------------------

create or replace function public.kusqa_district_slugify(raw text)
returns text
language sql immutable
as $$
  select trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(unaccent(coalesce(raw, ''))),
        '[^a-z0-9]+', '-', 'g'
      ),
      '-+', '-', 'g'
    )
  )
$$;

comment on function public.kusqa_district_slugify(text) is
  'Convert a free-text district name to a district slug (NFD-normalize, lowercase, dash separators).';

-- ---------------------------------------------------------------------------
-- 2) proposals: add district_id, backfill, index
-- ---------------------------------------------------------------------------

alter table public.proposals
  add column if not exists district_id uuid null references public.districts(id) on delete set null;

create index if not exists proposals_district_id_idx
  on public.proposals (district_id)
  where district_id is not null;

-- Backfill: resolve district text → districts.id via slug match.
update public.proposals p
set district_id = d.id
from public.districts d
where p.district_id is null
  and d.slug = public.kusqa_district_slugify(p.district);

-- ---------------------------------------------------------------------------
-- 3) missions: add district_id, backfill, index
-- ---------------------------------------------------------------------------

alter table public.missions
  add column if not exists district_id uuid null references public.districts(id) on delete set null;

create index if not exists missions_district_id_idx
  on public.missions (district_id)
  where district_id is not null;

update public.missions m
set district_id = d.id
from public.districts d
where m.district_id is null
  and d.slug = public.kusqa_district_slugify(m.district);

-- ---------------------------------------------------------------------------
-- 4) profiles: add district_id (do not backfill — only update when user
--    explicitly edits their district in the profile flow; matches Phase 1.5
--    behavior of "Editar distrito" button on /app/perfil).
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists district_id uuid null references public.districts(id) on delete set null;

create index if not exists profiles_district_id_idx
  on public.profiles (district_id)
  where district_id is not null;

comment on column public.proposals.district_id is
  'FK to districts. Nullable: rows with free-text district that does not match a known slug keep district_id NULL and fall back to district text.';
comment on column public.missions.district_id is
  'FK to districts. Same nullable/backfill semantics as proposals.district_id.';
comment on column public.profiles.district_id is
  'FK to districts. Set when the user picks a known district in /app/perfil. NULL until then.';
