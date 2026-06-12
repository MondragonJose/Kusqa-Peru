-- Allow anonymous (unauthenticated) SELECT on initiative_comments so the
-- conversation thread on proposal detail is readable without a session.
-- INSERT/UPDATE/DELETE remain restricted to authenticated users.

drop policy if exists "initiative_comments_select_anon" on public.initiative_comments;
create policy "initiative_comments_select_anon"
  on public.initiative_comments for select
  to anon
  using (deleted_at is null);

-- Also open initiative_stewards for anonymous read (accepted stewards only,
-- matching the existing authenticated policy).
drop policy if exists "initiative_stewards_select_anon" on public.initiative_stewards;
create policy "initiative_stewards_select_anon"
  on public.initiative_stewards for select
  to anon
  using (status = 'accepted');
