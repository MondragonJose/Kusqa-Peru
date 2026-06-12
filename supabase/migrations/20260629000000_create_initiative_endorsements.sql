-- KUSQA Phase 3: initiative_endorsements link table (audit Section 4.2 / 5.1).
--
-- PROBLEM:
--   Institutions exist (20260628000000) and initiatives exist
--   (20260617000000), but there is no link table connecting them.
--   Any relationship between an institution and an initiative (e.g.,
--   "this NGO supports this initiative", "this municipality originated
--   this initiative") is lost or represented as unstructured text.
--
-- CHANGE:
--   1. Create public.initiative_endorsements — the ONLY coupling
--      between institutions and the civic core.
--   2. FK to initiatives(id) ONLY — never to missions or proposals.
--   3. FK to institutions(id).
--   4. relation discriminator: supporter, collaborator, or origin.
--   5. RLS: authenticated SELECT; mutations are service_role only
--      (institution actor / service path).
--
-- IDEMPOTENT: Yes (IF NOT EXISTS / DROP IF EXISTS / OR REPLACE).
-- REVERSIBLE:  Drop the table and the migration file.
-- NO frozen files are altered.
-- NO columns added to initiatives.
-- owner_id is untouched.

-- ===========================================================================
-- 1) Create initiative_endorsements table
-- ===========================================================================

create table if not exists public.initiative_endorsements (
  id              uuid        primary key default gen_random_uuid(),
  initiative_id   uuid        not null references public.initiatives(id) on delete cascade,
  institution_id  uuid        not null references public.institutions(id) on delete cascade,
  relation        text        not null check (relation in ('supporter', 'collaborator', 'origin')),
  created_at      timestamptz not null default now(),
  unique (initiative_id, institution_id, relation)
);

-- ===========================================================================
-- 2) Indexes
-- ===========================================================================

create index if not exists initiative_endorsements_initiative_idx
  on public.initiative_endorsements (initiative_id);

create index if not exists initiative_endorsements_institution_idx
  on public.initiative_endorsements (institution_id);

create index if not exists initiative_endorsements_relation_idx
  on public.initiative_endorsements (relation);

-- ===========================================================================
-- 3) RLS — authenticated read; mutations via service_role only
-- ===========================================================================

alter table public.initiative_endorsements enable row level security;

-- SELECT: any authenticated user can read endorsements
drop policy if exists "initiative_endorsements_select_authenticated" on public.initiative_endorsements;
create policy "initiative_endorsements_select_authenticated"
  on public.initiative_endorsements for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies — mutations are service_role only
-- (institution actor / service path, never direct client-side DML).

-- ===========================================================================
-- 4) Documentation
-- ===========================================================================

comment on table public.initiative_endorsements is
  'Link table coupling institutions to initiatives. relation discriminator: '
  'supporter (institution backs the initiative), collaborator (institution '
  'co-organises), origin (institution originated the initiative). '
  'RLS: authenticated SELECT only. Mutations via service_role.';
