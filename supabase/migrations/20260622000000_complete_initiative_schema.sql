-- KUSQA: Complete initiative_stewards + initiative_comments schema.
--
-- Additive, backward-compatible fixes so both tables match what the
-- application code (proposalCollaboratorRepository, initiativeCommentRepository)
-- already assumes exists.
--
-- Gaps filled:
--   1) initiative_stewards — add initiative_type discriminator
--   2) initiative_comments — add CHECK constraints, indexes, updated_at trigger
--   3) RLS — add INSERT/UPDATE/DELETE policies mirroring proposal_* equivalents
--   4) Notify PostgREST to reload schema cache

-- ===========================================================================
-- 1) initiative_stewards — add initiative_type discriminator
-- ===========================================================================
-- The app code inserts into initiative_stewards without setting
-- initiative_type (it always creates proposal stewards).  Default to
-- 'proposal' so existing code continues to work unchanged.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'initiative_stewards'
      and column_name = 'initiative_type'
  ) then
    alter table public.initiative_stewards
      add column initiative_type text not null default 'proposal'
      check (initiative_type in ('proposal', 'mission'));
  end if;
end $$;

comment on column public.initiative_stewards.initiative_type is
  'Discriminator: proposal or mission. Defaults to proposal for backward compatibility.';

-- ===========================================================================
-- 2) initiative_comments — CHECK constraints, indexes, trigger
-- ===========================================================================

-- 2a) content CHECK (mirrors proposal_comments)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'initiative_comments_content_check'
      and conrelid = 'public.initiative_comments'::regclass
  ) then
    alter table public.initiative_comments
      add constraint initiative_comments_content_check
      check (char_length(content) between 1 and 1200);
  end if;
end $$;

-- 2b) initiative_type CHECK (data integrity)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'initiative_comments_initiative_type_check'
      and conrelid = 'public.initiative_comments'::regclass
  ) then
    alter table public.initiative_comments
      add constraint initiative_comments_initiative_type_check
      check (initiative_type in ('proposal', 'mission'));
  end if;
end $$;

-- 2c) Indexes
create index if not exists initiative_comments_initiative_idx
  on public.initiative_comments (initiative_id, created_at desc);

create index if not exists initiative_comments_parent_idx
  on public.initiative_comments (parent_comment_id);

create index if not exists initiative_comments_user_idx
  on public.initiative_comments (user_id);

-- 2d) updated_at trigger (mirrors proposal_comments)
create or replace function public.handle_updated_at_initiative_comments()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_handle_updated_at_initiative_comments on public.initiative_comments;
create trigger trg_handle_updated_at_initiative_comments
  before update on public.initiative_comments
  for each row
  execute function public.handle_updated_at_initiative_comments();

-- ===========================================================================
-- 3) RLS — INSERT / UPDATE / DELETE policies
-- ===========================================================================

-- ── 3a) initiative_stewards ────────────────────────────────────────────────

-- INSERT: only the initiative owner can invite stewards
drop policy if exists "initiative_stewards_insert_owner" on public.initiative_stewards;
create policy "initiative_stewards_insert_owner"
  on public.initiative_stewards
  for insert
  to authenticated
  with check (
    auth.uid() = invited_by
    and exists (
      select 1 from public.initiatives i
      where i.id = initiative_stewards.initiative_id
        and i.owner_id = auth.uid()
    )
  );

-- UPDATE: only the invited user can respond to their own invitation
drop policy if exists "initiative_stewards_update_invitee" on public.initiative_stewards;
create policy "initiative_stewards_update_invitee"
  on public.initiative_stewards
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- DELETE: only the initiative owner can withdraw an invitation
drop policy if exists "initiative_stewards_delete_owner" on public.initiative_stewards;
create policy "initiative_stewards_delete_owner"
  on public.initiative_stewards
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.initiatives i
      where i.id = initiative_stewards.initiative_id
        and i.owner_id = auth.uid()
    )
  );

-- ── 3b) initiative_comments ────────────────────────────────────────────────

-- INSERT: any authenticated user, post as themselves
drop policy if exists "initiative_comments_insert_authenticated" on public.initiative_comments;
create policy "initiative_comments_insert_authenticated"
  on public.initiative_comments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- UPDATE: own non-deleted comments
drop policy if exists "initiative_comments_update_own" on public.initiative_comments;
create policy "initiative_comments_update_own"
  on public.initiative_comments
  for update
  to authenticated
  using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id);

-- Soft-delete: own comments only (update deleted_at)
drop policy if exists "initiative_comments_soft_delete_own" on public.initiative_comments;
create policy "initiative_comments_soft_delete_own"
  on public.initiative_comments
  for update
  to authenticated
  using (auth.uid() = user_id and deleted_at is null)
  with check (auth.uid() = user_id and deleted_at is not null);

-- ===========================================================================
-- 4) Notify PostgREST to reload schema cache
-- ===========================================================================

notify pgrst, 'reload schema';
