-- KUSQA Phase B: operational readiness (evidence, notifications, moderation, storage, realtime)
-- Risk: enable realtime only after tables exist; storage policies require authenticated role.

-- ---------------------------------------------------------------------------
-- 1) mission_evidence
-- ---------------------------------------------------------------------------
create table if not exists public.mission_evidence (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  byte_size integer not null check (byte_size > 0 and byte_size <= 10485760),
  width_px integer null,
  height_px integer null,
  caption text null,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected', 'flagged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mission_evidence_user_mission_path_unique unique (user_id, mission_id, storage_path)
);

create index if not exists mission_evidence_mission_created_idx
  on public.mission_evidence (mission_id, created_at desc);

create index if not exists mission_evidence_user_created_idx
  on public.mission_evidence (user_id, created_at desc);

create index if not exists mission_evidence_moderation_idx
  on public.mission_evidence (moderation_status, created_at desc)
  where moderation_status in ('pending', 'flagged');

alter table public.mission_evidence enable row level security;

-- ---------------------------------------------------------------------------
-- 2) user_notifications (in-app; push-ready payload)
-- ---------------------------------------------------------------------------
create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text null,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint user_notifications_type_valid check (
    notification_type in (
      'mission_joined',
      'mission_completed',
      'xp_granted',
      'evidence_received',
      'moderation_update',
      'community_pulse'
    )
  )
);

create unique index if not exists user_notifications_dedupe_uidx
  on public.user_notifications (user_id, dedupe_key)
  where dedupe_key is not null;

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id, created_at desc)
  where read_at is null;

alter table public.user_notifications enable row level security;

-- ---------------------------------------------------------------------------
-- 3) moderation_reports (trust & safety primitives)
-- ---------------------------------------------------------------------------
create table if not exists public.moderation_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('mission', 'evidence', 'user', 'activity')),
  target_id uuid not null,
  reason_code text not null,
  description text null,
  status text not null default 'pending'
    check (status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz null
);

create index if not exists moderation_reports_status_created_idx
  on public.moderation_reports (status, created_at desc);

create index if not exists moderation_reports_target_idx
  on public.moderation_reports (target_type, target_id);

alter table public.moderation_reports enable row level security;

-- ---------------------------------------------------------------------------
-- 4) Storage bucket + policies (mission-evidence, private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'mission-evidence',
  'mission-evidence',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: {user_id}/{mission_id}/{evidence_id}.{ext}
create policy "mission_evidence_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'mission-evidence'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "mission_evidence_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'mission-evidence'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "mission_evidence_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'mission-evidence'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- 5) Realtime publication (postgres_changes)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.user_missions;
alter publication supabase_realtime add table public.user_progress;
alter publication supabase_realtime add table public.mission_events;
alter publication supabase_realtime add table public.user_notifications;
alter publication supabase_realtime add table public.mission_evidence;

-- missions catalog changes (new missions on map)
do $$
begin
  alter publication supabase_realtime add table public.missions;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 6) Notification fan-out on mission_events (DB-side, idempotent)
-- ---------------------------------------------------------------------------
create or replace function public.fanout_mission_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_title text;
  v_body text;
  v_dedupe text;
begin
  case new.event_type
    when 'join' then
      v_type := 'mission_joined';
      v_title := 'Te uniste a una misión';
      v_body := 'Tu participación quedó registrada.';
    when 'complete', 'complete_idempotent' then
      v_type := 'mission_completed';
      v_title := 'Misión completada';
      v_body := 'Tu impacto cívico fue registrado.';
    when 'xp_granted' then
      v_type := 'xp_granted';
      v_title := 'XP otorgado';
      v_body := 'Recibiste puntos por tu misión.';
    else
      return new;
  end case;

  v_dedupe := new.event_type || ':' || coalesce(new.mission_id::text, '') || ':' || new.id::text;

  if not exists (
    select 1
    from public.user_notifications un
    where un.user_id = new.actor_id
      and un.dedupe_key = v_dedupe
  ) then
    insert into public.user_notifications (
      user_id, notification_type, title, body, payload, dedupe_key
    )
    values (
      new.actor_id,
      v_type,
      v_title,
      v_body,
      jsonb_build_object(
        'mission_id', new.mission_id,
        'event_id', new.id,
        'metadata', new.metadata
      ),
      v_dedupe
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_fanout_mission_notification on public.mission_events;
create trigger trg_fanout_mission_notification
  after insert on public.mission_events
  for each row execute function public.fanout_mission_notification();

-- ---------------------------------------------------------------------------
-- 7) RLS examples (enable per environment)
-- ---------------------------------------------------------------------------
-- create policy "user_notifications_select_own" on public.user_notifications
--   for select using (auth.uid() = user_id);
-- create policy "mission_evidence_select_own" on public.mission_evidence
--   for select using (auth.uid() = user_id);

comment on table public.mission_evidence is 'Civic mission evidence uploads (images); storage_path maps to mission-evidence bucket.';
comment on table public.user_notifications is 'In-app notifications; dedupe_key prevents duplicate fan-out.';
