-- Replicate SELECT RLS policies from proposal_comments → initiative_comments
-- and proposal_collaborators → initiative_stewards.
--
-- The collapse migration (20260617000000) created these tables but:
--   - initiative_comments has NO RLS at all
--   - initiative_stewards has a single blanket policy (all authenticated can see all)
--
-- This migration adds the equivalent granular policies from the original tables.
-- Only SELECT policies — no INSERT/UPDATE/DELETE here.

-- ── 1) initiative_comments ─────────────────────────────────────────────────

alter table public.initiative_comments enable row level security;

-- READ: authenticated users can see non-deleted comments
drop policy if exists "initiative_comments_select_visible" on public.initiative_comments;
create policy "initiative_comments_select_visible"
  on public.initiative_comments
  for select
  to authenticated
  using (deleted_at is null);

-- ── 2) initiative_stewards ─────────────────────────────────────────────────

-- Drop the existing blanket policy and replace with granular ones
drop policy if exists "initiative_stewards_select_policy" on public.initiative_stewards;

-- READ: any authenticated user can see accepted stewards (public coalition)
drop policy if exists "initiative_stewards_select_accepted" on public.initiative_stewards;
create policy "initiative_stewards_select_accepted"
  on public.initiative_stewards
  for select
  to authenticated
  using (status = 'accepted');

-- READ: invited users can see their own pending invitations
drop policy if exists "initiative_stewards_select_own_invite" on public.initiative_stewards;
create policy "initiative_stewards_select_own_invite"
  on public.initiative_stewards
  for select
  to authenticated
  using (auth.uid() = user_id);

-- READ: initiative owner can see all stewards of their initiative
drop policy if exists "initiative_stewards_select_owner" on public.initiative_stewards;
create policy "initiative_stewards_select_owner"
  on public.initiative_stewards
  for select
  to authenticated
  using (
    exists (
      select 1 from public.initiatives i
      where i.id = initiative_stewards.initiative_id
        and i.owner_id = auth.uid()
    )
  );
