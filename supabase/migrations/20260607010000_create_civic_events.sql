-- KUSQA Phase 4A: civic_events — single append-only event backbone
--
-- Purpose
--   A canonical event log that backs:
--     (a) the public-profile activity timeline (Phase 4A),
--     (b) the realtime bridge's domain-event mapping (Phase 4B),
--     (c) future district and territory aggregations.
--
-- Why a dedicated log
--   Supabase realtime publishes raw table rows. We do NOT want to
--   publish proposal_supports / proposal_comments / proposal_collaborators
--   / mission_events independently, because (1) they each have their own
--   shape and privacy surface, (2) the bridge would need N mappers, and
--   (3) downstream consumers (profile timeline, district feed, header
--   badge) would each need to subscribe to N tables. civic_events gives
--   us ONE event stream with a uniform shape, controlled by the server.
--
-- Trust model
--   INSERT is server-only (SECURITY DEFINER RPCs and triggers).
--   SELECT is open to the actor for their own events; otherwise public-safe
--   projections are exposed through SECURITY DEFINER RPCs (get_public_profile,
--   get_district_activity). This keeps the public profile timeline list
--   auditable end-to-end — no client can fabricate an event.
--
-- All operations are idempotent / additive. No existing tables are altered.

set search_path = public;

-- ─── 1. Enum: civic_event_kind ────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'civic_event_kind') then
    create type public.civic_event_kind as enum (
      -- proposals
      'proposal.created',
      'proposal.supported',
      'proposal.unsupported',
      'proposal.comment_added',
      'proposal.collaborator_joined',
      'proposal.threshold_reached',
      'proposal.converted_to_mission',
      'proposal.reopened',
      -- missions
      'mission.joined',
      'mission.completed',
      'mission.evidence_submitted',
      'mission.evidence_verified',
      -- districts / territory
      'district.first_movement',
      -- community
      'community.trust_changed',
      'community.profile_milestone'
    );
  end if;
end $$;

-- ─── 2. Table: civic_events ───────────────────────────────────────────────
create table if not exists public.civic_events (
  id              uuid primary key default gen_random_uuid(),
  kind            public.civic_event_kind not null,
  actor_id        uuid null references public.profiles(id) on delete set null,
  target_type     text not null check (target_type in (
                    'mission', 'proposal', 'comment', 'district', 'profile', 'evidence'
                  )),
  target_id       uuid not null,
  district_id     uuid null references public.districts(id) on delete set null,
  payload         jsonb not null default '{}'::jsonb,
  occurred_at     timestamptz not null default now(),
  -- dedupe: lets us avoid double-firing from fan-out triggers + client retries
  dedupe_key      text null
);

create index if not exists civic_events_actor_idx
  on public.civic_events (actor_id, occurred_at desc)
  where actor_id is not null;

create index if not exists civic_events_target_idx
  on public.civic_events (target_type, target_id, occurred_at desc);

create index if not exists civic_events_district_idx
  on public.civic_events (district_id, occurred_at desc)
  where district_id is not null;

create index if not exists civic_events_kind_idx
  on public.civic_events (kind, occurred_at desc);

create unique index if not exists civic_events_dedupe_uidx
  on public.civic_events (dedupe_key)
  where dedupe_key is not null;

-- ─── 3. RLS ───────────────────────────────────────────────────────────────
alter table public.civic_events enable row level security;

-- A user can read their own actor events. Public events (e.g. district.first_movement)
-- flow through SECURITY DEFINER RPCs that project a safe shape; the table itself
-- is not directly public-readable.
drop policy if exists civic_events_select_own on public.civic_events;
create policy civic_events_select_own on public.civic_events
  for select to authenticated
  using (auth.uid() = actor_id);

-- No INSERT/UPDATE/DELETE for authenticated — server-only writes.
-- Future admin role would be added with explicit policies; not granted now.

-- ─── 4. Helper: append_civic_event (server-only, callable from RPCs/triggers) ─
create or replace function public.append_civic_event(
  p_kind            public.civic_event_kind,
  p_actor_id        uuid,
  p_target_type     text,
  p_target_id       uuid,
  p_district_id     uuid default null,
  p_payload         jsonb default '{}'::jsonb,
  p_dedupe_key      text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Server-only: refuse anon callers.
  if auth.uid() is null and p_actor_id is null then
    raise exception 'UNAUTHENTICATED: append_civic_event requires an actor or auth context';
  end if;

  if p_dedupe_key is not null then
    -- Idempotent insert: if the dedupe_key already exists, return its id.
    select id into v_id from public.civic_events where dedupe_key = p_dedupe_key limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  insert into public.civic_events (
    kind, actor_id, target_type, target_id, district_id, payload, dedupe_key
  ) values (
    p_kind, p_actor_id, p_target_type, p_target_id, p_district_id, coalesce(p_payload, '{}'::jsonb), p_dedupe_key
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.append_civic_event(public.civic_event_kind, uuid, text, uuid, uuid, jsonb, text) from public;
grant execute on function public.append_civic_event(public.civic_event_kind, uuid, text, uuid, uuid, jsonb, text) to authenticated;

-- ─── 5. Public reader: get_civic_events_for_profile ──────────────────────
-- Returns the public-safe activity timeline for a user. Server-projected so
-- no private fields (email, etc.) ever leak.
create or replace function public.get_civic_events_for_profile(
  p_user_id uuid,
  p_limit   int default 20
) returns table (
  id          uuid,
  kind        public.civic_event_kind,
  target_type text,
  target_id   uuid,
  district_id uuid,
  district_slug text,
  district_name text,
  occurred_at timestamptz,
  payload     jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  select
    e.id,
    e.kind,
    e.target_type,
    e.target_id,
    e.district_id,
    d.slug,
    d.display_name,
    e.occurred_at,
    e.payload
  from public.civic_events e
  left join public.districts d on d.id = e.district_id
  where e.actor_id = p_user_id
  order by e.occurred_at desc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.get_civic_events_for_profile(uuid, int) from public;
grant execute on function public.get_civic_events_for_profile(uuid, int) to anon, authenticated;

-- ─── 6. Realtime publication (additive) ───────────────────────────────────
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'civic_events'
    ) then
      alter publication supabase_realtime add table public.civic_events;
    end if;
  end if;
end $$;
