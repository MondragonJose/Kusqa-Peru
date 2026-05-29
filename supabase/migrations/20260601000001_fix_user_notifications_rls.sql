-- KUSQA Security Hardening: fix user_notifications RLS
--
-- user_notifications has RLS enabled since 20260526120000, but the
-- SELECT and UPDATE policies were only written as SQL comments (lines 220-223
-- in that file). As a result, ZERO active policies existed — every
-- authenticated user could read all notifications.
--
-- This migration creates explicit, active policies that enforce
-- per-user notification isolation.

-- SELECT: users can only read their own notifications
drop policy if exists "user_notifications_select_own" on public.user_notifications;
create policy "user_notifications_select_own"
  on public.user_notifications
  for select
  to authenticated
  using (auth.uid() = user_id);

-- UPDATE: users can mark their own notifications as read
drop policy if exists "user_notifications_update_own" on public.user_notifications;
create policy "user_notifications_update_own"
  on public.user_notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.user_notifications is 'In-app notifications; RLS enforces per-user isolation.';
