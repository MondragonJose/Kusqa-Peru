-- KUSQA RLS Policy Verification
-- Run as service role or via Supabase SQL editor
-- Lists all tables with RLS enabled and their active policies

-- 1. All tables with RLS
select
  n.nspname as schema_name,
  c.relname as table_name,
  case when c.relrowsecurity then 'ENABLED' else 'DISABLED' end as rls_status,
  case when c.relforcerowsecurity then 'FORCE' else 'no force' end as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname = 'public'
  and c.relrowsecurity = true
order by c.relname;

-- 2. All policies per table (for public schema)
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3. Tables with RLS enabled but ZERO policies (gapping)
with rls_tables as (
  select
    n.nspname as schema_name,
    c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind = 'r'
    and n.nspname = 'public'
    and c.relrowsecurity = true
)
select
  rls.table_name,
  'NO POLICIES' as warning
from rls_tables rls
left join pg_policies p
  on p.tablename = rls.table_name
  and p.schemaname = rls.schema_name
where p.policyname is null;

-- 4. Storage bucket RLS policies
select
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by tablename, policyname;

-- 5. Publication members (for realtime)
select * from pg_publication_tables
where pubname = 'supabase_realtime'
order by schemaname, tablename;
