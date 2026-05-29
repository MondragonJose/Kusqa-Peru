-- KUSQA Event Log — durable append-only domain event persistence.
--
-- Every KusqaDomainEvent emitted at runtime is mirrored here.
-- This table is an eventual-consistency mirror, NOT a dependency:
-- the app works correctly even if this table is empty.
--
-- Fields:
--   id           uuid (PK, auto-generated)
--   type         KusqaDomainEvent discriminator (e.g. "EvidenceSubmitted")
--   actor_id     uuid — the user who performed the action
--   entity_id    text nullable — generic entity reference (evidenceId or missionId)
--   mission_id   uuid nullable — for mission-scoped queries
--   evidence_id  uuid nullable — for evidence-scoped queries
--   payload      jsonb — full KusqaDomainEvent as-is (for replay reconstruction)
--   created_at   timestamptz — from event.timestamp (not DB clock)

create table if not exists public.event_log (
  id          uuid        primary key default gen_random_uuid(),
  type        text        not null,
  actor_id    uuid        not null references auth.users(id),
  entity_id   text,
  mission_id  uuid,
  evidence_id uuid,
  payload     jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null
);

-- Index for entity-scoped query (the most common replay path)
create index if not exists event_log_entity_id_idx on public.event_log (entity_id);
-- Index for mission-scoped queries
create index if not exists event_log_mission_id_idx on public.event_log (mission_id);
-- Index for time-ordered scans
create index if not exists event_log_created_at_idx on public.event_log (created_at asc);
-- Index for actor-scoped queries (hydration)
create index if not exists event_log_actor_id_created_at_idx on public.event_log (actor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS: append-only, actor-scoped
-- ---------------------------------------------------------------------------
alter table public.event_log enable row level security;

-- INSERT: authenticated users can log their own actions
create policy "event_log_insert_own"
  on public.event_log
  for insert
  to authenticated
  with check (auth.uid() = actor_id);

-- SELECT: users can only read events where they are the actor
create policy "event_log_select_own"
  on public.event_log
  for select
  to authenticated
  using (auth.uid() = actor_id);

comment on table public.event_log is 'Append-only domain event log for system observability and replay. Mirrors in-memory eventRegistry.';
comment on column public.event_log.payload is 'Full KusqaDomainEvent as JSONB — used for replayEntityState reconstruction.';
