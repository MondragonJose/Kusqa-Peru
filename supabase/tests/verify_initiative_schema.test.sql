-- KUSQA: Verify initiative_stewards + initiative_comments schema
--
-- Run against a live Supabase project AFTER applying migration
-- 20260622000000_complete_initiative_schema.sql.
--
-- Usage (psql):
--   psql -d "$SUPABASE_DB_URL" -f supabase/tests/verify_initiative_schema.test.sql
--
-- Or paste into Supabase SQL editor.

begin;
select plan(12);

-- ── 1) Tables exist ────────────────────────────────────────────────────────
select has_table('public', 'initiative_stewards', 'initiative_stewards exists');
select has_table('public', 'initiative_comments', 'initiative_comments exists');

-- ── 2) Columns on initiative_stewards ──────────────────────────────────────
select has_column('public', 'initiative_stewards', 'initiative_type', 'initiative_stewards has initiative_type');
select col_not_null('public', 'initiative_stewards', 'initiative_type', 'initiative_type is NOT NULL');
select col_has_default('public', 'initiative_stewards', 'initiative_type', 'initiative_type has default');
select col_default_is('public', 'initiative_stewards', 'initiative_type', '''proposal''', 'initiative_type defaults to proposal');

-- ── 3) Check constraints ──────────────────────────────────────────────────
select col_has_check('public', 'initiative_stewards', 'initiative_type', 'initiative_type has CHECK');
select col_has_check('public', 'initiative_comments', 'content', 'content has CHECK (1-1200)');
select col_has_check('public', 'initiative_comments', 'initiative_type', 'initiative_type has CHECK');

-- ── 4) Foreign keys exist with correct names ───────────────────────────────
select has_fk('public', 'initiative_stewards', 'initiative_stewards has FKs');
select has_fk('public', 'initiative_comments', 'initiative_comments has FKs');

-- ── 5) FK named initiative_stewards_user_id_fkey ───────────────────────────
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'initiative_stewards_user_id_fkey'
      and conrelid = 'public.initiative_stewards'::regclass
  ),
  'FK initiative_stewards_user_id_fkey exists'
);

-- ── 6) FK named initiative_comments_user_id_fkey ───────────────────────────
select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'initiative_comments_user_id_fkey'
      and conrelid = 'public.initiative_comments'::regclass
  ),
  'FK initiative_comments_user_id_fkey exists'
);

-- ── 7) Indexes on initiative_comments ──────────────────────────────────────
select indexes_are('public', 'initiative_comments', array[
  'initiative_comments_pkey',
  'initiative_comments_initiative_idx',
  'initiative_comments_parent_idx',
  'initiative_comments_user_idx'
], 'initiative_comments has correct indexes');

-- ── 8) RLS enabled ─────────────────────────────────────────────────────────
select is(
  (select relrowsecurity from pg_class where relname = 'initiative_stewards'),
  true,
  'initiative_stewards has RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where relname = 'initiative_comments'),
  true,
  'initiative_comments has RLS enabled'
);

-- ── 9) RLS policies exist for initiative_stewards ──────────────────────────
select ok(
  exists (
    select 1 from pg_policies
    where tablename = 'initiative_stewards'
      and policyname = 'initiative_stewards_insert_owner'
  ),
  'initiative_stewards has INSERT policy'
);
select ok(
  exists (
    select 1 from pg_policies
    where tablename = 'initiative_stewards'
      and policyname = 'initiative_stewards_update_invitee'
  ),
  'initiative_stewards has UPDATE policy'
);
select ok(
  exists (
    select 1 from pg_policies
    where tablename = 'initiative_stewards'
      and policyname = 'initiative_stewards_delete_owner'
  ),
  'initiative_stewards has DELETE policy'
);

-- ── 10) RLS policies exist for initiative_comments ─────────────────────────
select ok(
  exists (
    select 1 from pg_policies
    where tablename = 'initiative_comments'
      and policyname = 'initiative_comments_insert_authenticated'
  ),
  'initiative_comments has INSERT policy'
);
select ok(
  exists (
    select 1 from pg_policies
    where tablename = 'initiative_comments'
      and policyname = 'initiative_comments_update_own'
  ),
  'initiative_comments has UPDATE policy'
);
select ok(
  exists (
    select 1 from pg_policies
    where tablename = 'initiative_comments'
      and policyname = 'initiative_comments_soft_delete_own'
  ),
  'initiative_comments has soft-delete policy'
);

-- ── 11) updated_at trigger on initiative_comments ──────────────────────────
select ok(
  exists (
    select 1 from information_schema.triggers
    where event_object_table = 'initiative_comments'
      and trigger_name = 'trg_handle_updated_at_initiative_comments'
  ),
  'initiative_comments has updated_at trigger'
);

-- ── 12) Verify PostgREST embed paths resolve (quoted identifiers) ──────────
-- These queries check that the FK relationships exist for PostgREST embeds.
-- If they fail, PostgREST will return PGRST200/PGRST205 errors.
select ok(
  exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_name = 'initiative_stewards'
      and kcu.column_name = 'user_id'
      and kcu.referenced_table_name = 'profiles'
  ),
  'initiative_stewards.user_id REFERENCES profiles (PostgREST embed path OK)'
);
select ok(
  exists (
    select 1
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_name = 'initiative_comments'
      and kcu.column_name = 'user_id'
      and kcu.referenced_table_name = 'profiles'
  ),
  'initiative_comments.user_id REFERENCES profiles (PostgREST embed path OK)'
);

rollback;
