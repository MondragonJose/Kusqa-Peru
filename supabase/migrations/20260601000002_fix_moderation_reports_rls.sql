-- KUSQA Security Hardening: fix moderation_reports RLS
--
-- moderation_reports has RLS enabled since 20260526120000 but ZERO
-- active policies. Every authenticated user could read all reports.
--
-- This migration enforces scoped access:
--   - Users can INSERT reports as themselves (reporter_id must match)
--   - Users can SELECT only their own reports
--   - UPDATE/DELETE are intentionally omitted (moderator role to be
--     implemented in Phase 2 — for now, admins manage via Supabase dashboard)

-- INSERT: users can only create reports as themselves
drop policy if exists "moderation_reports_insert_own" on public.moderation_reports;
create policy "moderation_reports_insert_own"
  on public.moderation_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- SELECT: users can only read their own reports
drop policy if exists "moderation_reports_select_own" on public.moderation_reports;
create policy "moderation_reports_select_own"
  on public.moderation_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

comment on table public.moderation_reports is 'User reports; RLS enforces per-user scope — users see only their own reports.';
