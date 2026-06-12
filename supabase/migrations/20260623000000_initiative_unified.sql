-- KUSQA: Create unified initiative_comments + initiative_stewards tables.
--
-- The frontend queries these tables with initiative_id + initiative_type
-- discriminators and expects FK names for PostgREST embed:
--   profiles!initiative_comments_user_id_fkey(...)
--   profiles!initiative_stewards_user_id_fkey(...)
--
-- This migration is idempotent (IF NOT EXISTS) so it can run regardless
-- of whether prior collapse migrations were applied.

-- ===========================================================================
-- 1) initiative_comments — threaded civic discussion (initiative-agnostic)
-- ===========================================================================

create table if not exists public.initiative_comments (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null,
  initiative_type text not null default 'proposal'
    check (initiative_type in ('proposal', 'mission')),
  user_id uuid not null,
  parent_comment_id uuid null,
  content text not null check (char_length(content) between 1 and 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

-- FK: user_id -> profiles(id) with canonical name for PostgREST embed
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'initiative_comments_user_id_fkey'
      and conrelid = 'public.initiative_comments'::regclass
  ) then
    alter table public.initiative_comments
      add constraint initiative_comments_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

-- Self-FK: parent_comment_id -> initiative_comments(id)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'initiative_comments_parent_fkey'
      and conrelid = 'public.initiative_comments'::regclass
  ) then
    alter table public.initiative_comments
      add constraint initiative_comments_parent_fkey
      foreign key (parent_comment_id) references public.initiative_comments(id)
      on delete set null;
  end if;
end $$;

-- Indexes
create index if not exists initiative_comments_initiative_idx
  on public.initiative_comments (initiative_id, created_at desc);
create index if not exists initiative_comments_parent_idx
  on public.initiative_comments (parent_comment_id);
create index if not exists initiative_comments_user_idx
  on public.initiative_comments (user_id);

-- RLS
alter table public.initiative_comments enable row level security;

-- READ: authenticated users can see non-deleted comments
drop policy if exists "initiative_comments_select_visible" on public.initiative_comments;
create policy "initiative_comments_select_visible"
  on public.initiative_comments for select to authenticated
  using (deleted_at is null);

-- INSERT: any authenticated user can post a comment
drop policy if exists "initiative_comments_insert_authenticated" on public.initiative_comments;
create policy "initiative_comments_insert_authenticated"
  on public.initiative_comments for insert to authenticated
  with check (auth.uid() = user_id);

-- UPDATE: users can edit their own non-deleted comments
drop policy if exists "initiative_comments_update_own" on public.initiative_comments;
create policy "initiative_comments_update_own"
  on public.initiative_comments for update to authenticated
  using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id);

-- Soft-delete: users can mark their own comments as deleted
drop policy if exists "initiative_comments_soft_delete_own" on public.initiative_comments;
create policy "initiative_comments_soft_delete_own"
  on public.initiative_comments for update to authenticated
  using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id and deleted_at is not null);

-- updated_at trigger
create or replace function public.handle_updated_at_initiative_comments()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_handle_updated_at_initiative_comments
  on public.initiative_comments;
create trigger trg_handle_updated_at_initiative_comments
  before update on public.initiative_comments
  for each row execute function public.handle_updated_at_initiative_comments();

comment on table public.initiative_comments is
  'Unified civic discussion thread for proposals and missions.';

-- ===========================================================================
-- 2) initiative_stewards — coalition invitations (initiative-agnostic)
-- ===========================================================================

create table if not exists public.initiative_stewards (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null,
  initiative_type text not null default 'proposal'
    check (initiative_type in ('proposal', 'mission')),
  user_id uuid not null,
  role text not null default 'ally'
    check (role in ('co_steward', 'ally')),
  invited_by uuid null,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  message text null check (message is null or char_length(message) <= 600),
  created_at timestamptz not null default now(),
  responded_at timestamptz null,
  constraint initiative_stewards_unique
    unique (initiative_id, initiative_type, user_id)
);

-- FK: user_id -> profiles(id) with canonical name for PostgREST embed
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'initiative_stewards_user_id_fkey'
      and conrelid = 'public.initiative_stewards'::regclass
  ) then
    alter table public.initiative_stewards
      add constraint initiative_stewards_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete cascade;
  end if;
end $$;

-- FK: invited_by -> profiles(id)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'initiative_stewards_invited_by_fkey'
      and conrelid = 'public.initiative_stewards'::regclass
  ) then
    alter table public.initiative_stewards
      add constraint initiative_stewards_invited_by_fkey
      foreign key (invited_by) references public.profiles(id) on delete set null;
  end if;
end $$;

-- Indexes
create index if not exists initiative_stewards_initiative_idx
  on public.initiative_stewards (initiative_id);
create index if not exists initiative_stewards_user_idx
  on public.initiative_stewards (user_id);
create index if not exists initiative_stewards_status_idx
  on public.initiative_stewards (status);

-- RLS
alter table public.initiative_stewards enable row level security;

-- READ: any authenticated user can see accepted stewards (public coalition)
drop policy if exists "initiative_stewards_select_accepted" on public.initiative_stewards;
create policy "initiative_stewards_select_accepted"
  on public.initiative_stewards for select to authenticated
  using (status = 'accepted');

-- READ: invited users can see their own pending invitations
drop policy if exists "initiative_stewards_select_own_invite" on public.initiative_stewards;
create policy "initiative_stewards_select_own_invite"
  on public.initiative_stewards for select to authenticated
  using (auth.uid() = user_id);

-- READ: initiative owner can see all stewards of their initiative
drop policy if exists "initiative_stewards_select_owner" on public.initiative_stewards;
create policy "initiative_stewards_select_owner"
  on public.initiative_stewards for select to authenticated
  using (
    exists (
      select 1 from public.proposals p
      where p.id = initiative_stewards.initiative_id
        and p.user_id = auth.uid()
    )
  );

-- INSERT: only the initiative owner can invite stewards
drop policy if exists "initiative_stewards_insert_owner" on public.initiative_stewards;
create policy "initiative_stewards_insert_owner"
  on public.initiative_stewards for insert to authenticated
  with check (
    auth.uid() = invited_by
    and exists (
      select 1 from public.proposals p
      where p.id = initiative_stewards.initiative_id
        and p.user_id = auth.uid()
    )
  );

-- UPDATE: only the invited user can respond to their own invitation
drop policy if exists "initiative_stewards_update_invitee" on public.initiative_stewards;
create policy "initiative_stewards_update_invitee"
  on public.initiative_stewards for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: only the initiative owner can withdraw an invitation
drop policy if exists "initiative_stewards_delete_owner" on public.initiative_stewards;
create policy "initiative_stewards_delete_owner"
  on public.initiative_stewards for delete to authenticated
  using (
    exists (
      select 1 from public.proposals p
      where p.id = initiative_stewards.initiative_id
        and p.user_id = auth.uid()
    )
  );

comment on table public.initiative_stewards is
  'Unified coalition invitations for proposals and missions.';

-- ===========================================================================
-- 3) Migrate existing data from legacy proposal_* tables
-- ===========================================================================

insert into public.initiative_comments
  (id, initiative_id, initiative_type, user_id, parent_comment_id, content,
   created_at, updated_at, deleted_at)
select
  id,
  initiative_id,
  'proposal',
  user_id,
  parent_comment_id,
  content,
  created_at,
  updated_at,
  deleted_at
from public.proposal_comments
on conflict (id) do nothing;

insert into public.initiative_stewards
  (id, initiative_id, initiative_type, user_id, role, invited_by, status,
   message, created_at, responded_at)
select
  id, proposal_id, 'proposal', user_id,
  case
    when role = 'co_author' then 'co_steward'::initiative_role
    else role::initiative_role
  end,
  invited_by, status, message, created_at, responded_at
from public.proposal_collaborators
on conflict (id) do nothing;

-- ===========================================================================
-- 4) Notify PostgREST to reload schema cache
-- ===========================================================================

notify pgrst, 'reload schema';
