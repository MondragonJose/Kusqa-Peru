-- KUSQA: Rename FK constraints to canonical naming for PostgREST embed hints.
--
-- PostgREST's `table!constraint_name(columns)` embed syntax requires known
-- foreign key names. The auto-generated name for inline `references` is
-- `{table}_{column}_fkey`, which PostgREST resolves reliably.
--
-- initiative_stewards.user_id was created inline (line 275 of
-- collapse_into_initiatives.sql), so its FK already is
-- `initiative_stewards_user_id_fkey` — nothing to do.
--
-- initiative_comments.user_id FK was added separately in
-- 20260618000000_initiative_comments_user_fk.sql with a non-standard name
-- `initiative_comments_user_fk`. Rename it to the canonical form.

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'initiative_comments_user_fk'
      and conrelid = 'public.initiative_comments'::regclass
  ) and not exists (
    select 1 from pg_constraint
    where conname = 'initiative_comments_user_id_fkey'
      and conrelid = 'public.initiative_comments'::regclass
  ) then
    alter table public.initiative_comments
      rename constraint initiative_comments_user_fk to initiative_comments_user_id_fkey;
  end if;
end $$;
