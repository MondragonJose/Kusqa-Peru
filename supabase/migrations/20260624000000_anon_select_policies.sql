-- Allow anonymous (unauthenticated) SELECT on public civic tables so the
-- landing page, map, and initiative detail routes work for non-logged-in
-- visitors. Only the read path is opened; INSERT/UPDATE/DELETE remain
-- restricted to authenticated users via existing policies.
--
-- Layer 1: critical tables without which the feed and map are empty.

-- ─────────────────────────────────────────────────────────────────────────────
-- missions
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "missions_select_anon" on public.missions;
create policy "missions_select_anon"
  on public.missions for select
  to anon
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- proposals
-- ─────────────────────────────────────────────────────────────────────────────
drop policy if exists "proposals_select_anon" on public.proposals;
create policy "proposals_select_anon"
  on public.proposals for select
  to anon
  using (true);
