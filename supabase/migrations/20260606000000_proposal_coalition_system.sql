-- KUSQA — Proposal coalition system
--
-- Phase 2A: real coalition model for proposals.
-- Three additive, backward-compatible changes:
--   1) proposal_collaborators — explicit co-organization invitations
--   2) proposal_comments       — public civic discussion thread (1-level)
--   3) moderation target_type  — extend enum to include 'proposal'
--   4) proposal_support_stats  — aggregation view (no duplicated counters)

-- ===========================================================================
-- 1) proposal_collaborators
-- ===========================================================================

create table if not exists public.proposal_collaborators (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('co_author', 'ally')),
  invited_by uuid null references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  message text null check (char_length(message) <= 600),
  created_at timestamptz not null default now(),
  responded_at timestamptz null,

  constraint proposal_collaborators_unique unique (proposal_id, user_id),
  constraint proposal_collaborators_self_invite_blocked
    check (user_id <> invited_by or invited_by is null)
);

create index if not exists proposal_collaborators_proposal_idx
  on public.proposal_collaborators (proposal_id);
create index if not exists proposal_collaborators_user_idx
  on public.proposal_collaborators (user_id);
create index if not exists proposal_collaborators_status_idx
  on public.proposal_collaborators (status);

alter table public.proposal_collaborators enable row level security;

-- READ: any authenticated user can see accepted collaborators (public coalition)
drop policy if exists "proposal_collaborators_select_accepted" on public.proposal_collaborators;
create policy "proposal_collaborators_select_accepted"
  on public.proposal_collaborators
  for select
  to authenticated
  using (status = 'accepted');

-- READ: invited users can see their own pending invitations
drop policy if exists "proposal_collaborators_select_own_invite" on public.proposal_collaborators;
create policy "proposal_collaborators_select_own_invite"
  on public.proposal_collaborators
  for select
  to authenticated
  using (auth.uid() = user_id);

-- READ: proposal author can see all collaborators of their proposal
drop policy if exists "proposal_collaborators_select_author" on public.proposal_collaborators;
create policy "proposal_collaborators_select_author"
  on public.proposal_collaborators
  for select
  to authenticated
  using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_collaborators.proposal_id
        and p.user_id = auth.uid()
    )
  );

-- INSERT: only the proposal author can invite collaborators
drop policy if exists "proposal_collaborators_insert_author" on public.proposal_collaborators;
create policy "proposal_collaborators_insert_author"
  on public.proposal_collaborators
  for insert
  to authenticated
  with check (
    auth.uid() = invited_by
    and exists (
      select 1 from public.proposals p
      where p.id = proposal_collaborators.proposal_id
        and p.user_id = auth.uid()
    )
  );

-- UPDATE: only the invited user can respond to their own invitation
drop policy if exists "proposal_collaborators_update_invitee" on public.proposal_collaborators;
create policy "proposal_collaborators_update_invitee"
  on public.proposal_collaborators
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: only the proposal author can withdraw an invitation
drop policy if exists "proposal_collaborators_delete_author" on public.proposal_collaborators;
create policy "proposal_collaborators_delete_author"
  on public.proposal_collaborators
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.proposals p
      where p.id = proposal_collaborators.proposal_id
        and p.user_id = auth.uid()
    )
  );

comment on table public.proposal_collaborators is
  'Coalition: real co-organization invitations. Accepted collaborators are public; pending invitations are visible only to the invitee and the proposal author.';

-- ===========================================================================
-- 2) proposal_comments
-- ===========================================================================

create table if not exists public.proposal_comments (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid null references public.proposal_comments(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null
);

create index if not exists proposal_comments_proposal_idx
  on public.proposal_comments (proposal_id, created_at desc);
create index if not exists proposal_comments_parent_idx
  on public.proposal_comments (parent_comment_id);
create index if not exists proposal_comments_user_idx
  on public.proposal_comments (user_id);

alter table public.proposal_comments enable row level security;

-- READ: authenticated users can see non-deleted comments on any proposal
drop policy if exists "proposal_comments_select_visible" on public.proposal_comments;
create policy "proposal_comments_select_visible"
  on public.proposal_comments
  for select
  to authenticated
  using (deleted_at is null);

-- INSERT: any authenticated user can post a comment
drop policy if exists "proposal_comments_insert_authenticated" on public.proposal_comments;
create policy "proposal_comments_insert_authenticated"
  on public.proposal_comments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- UPDATE: users can edit their own non-deleted comments (within 24h, enforced at service layer)
drop policy if exists "proposal_comments_update_own" on public.proposal_comments;
create policy "proposal_comments_update_own"
  on public.proposal_comments
  for update
  to authenticated
  using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id);

-- Soft-delete only: users can mark their own comments as deleted
drop policy if exists "proposal_comments_soft_delete_own" on public.proposal_comments;
create policy "proposal_comments_soft_delete_own"
  on public.proposal_comments
  for update
  to authenticated
  using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id and deleted_at is not null);

-- updated_at trigger
create or replace function public.handle_updated_at_proposal_comments()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_handle_updated_at_proposal_comments on public.proposal_comments;
create trigger trg_handle_updated_at_proposal_comments
  before update on public.proposal_comments
  for each row
  execute function public.handle_updated_at_proposal_comments();

comment on table public.proposal_comments is
  'Public civic discussion on proposals. Threaded 1 level. Soft-deleted; users can edit/delete their own comments only.';

-- ===========================================================================
-- 3) Extend moderation_reports.target_type to include 'proposal'
-- ===========================================================================

-- Postgres does not support ALTER CHECK directly. Drop & re-add the constraint.
alter table public.moderation_reports
  drop constraint if exists moderation_reports_target_type_check;

alter table public.moderation_reports
  add constraint moderation_reports_target_type_check
  check (target_type in ('mission', 'evidence', 'user', 'activity', 'proposal'));

comment on column public.moderation_reports.target_type is
  'Trust & safety target. Extended to include proposal in Phase 2A.';

-- ===========================================================================
-- 4) proposal_support_stats — aggregation view (no counter columns)
-- ===========================================================================

create or replace view public.proposal_support_stats
with (security_invoker = true) as
select
  p.id as proposal_id,
  coalesce(s.cnt, 0)::int as support_count,
  coalesce(c.cnt, 0)::int as collaborator_count,
  coalesce(ca.cnt, 0)::int as accepted_collaborator_count
from public.proposals p
left join (
  select proposal_id, count(*) as cnt
  from public.proposal_supports
  group by proposal_id
) s on s.proposal_id = p.id
left join (
  select proposal_id, count(*) as cnt
  from public.proposal_collaborators
  group by proposal_id
) c on c.proposal_id = p.id
left join (
  select proposal_id, count(*) as cnt
  from public.proposal_collaborators
  where status = 'accepted'
  group by proposal_id
) ca on ca.proposal_id = p.id;

comment on view public.proposal_support_stats is
  'Aggregated support + collaborator counts per proposal. Derived, not denormalized.';
