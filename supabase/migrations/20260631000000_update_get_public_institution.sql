-- KUSQA Phase 3: add verified boolean to get_public_institution RPC.
--
-- PROBLEM:
--   PublicInstitution has no verification indicator. The front-end renders
--   InstitutionVerificationBadge hardcoded to false because the RPC excludes
--   verification_state. Verification is a social signal (Audit §5.6), not
--   private data — exposing a boolean projection is safe and necessary.
--
-- CHANGE:
--   Replace get_public_institution to include `verified` (boolean projection
--   of verification_state = 'verified') in the return table.
--
-- IDEMPOTENT: Yes (OR REPLACE).
-- REVERSIBLE:  Re-run without the verified column (previous migration version).
-- NO frozen files are altered.
-- ===========================================================================

set search_path = public;

create or replace function public.get_public_institution(p_slug text)
returns table (
  id              uuid,
  slug            text,
  name            text,
  description     text,
  kind            text,
  district_id     uuid,
  verified        boolean,
  email           text,
  phone           text,
  website         text,
  created_at      timestamptz
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return query
  select
    i.id,
    i.slug,
    i.name,
    i.description,
    i.kind,
    i.district_id,
    i.verification_state = 'verified',
    i.email,
    i.phone,
    i.website,
    i.created_at
  from public.institutions i
  where i.slug = p_slug;

  if not found then
    return;
  end if;
end;
$$;

comment on function public.get_public_institution is
  'Returns public-safe institution data by slug, including verified boolean '
  '(projected from verification_state). Grants unchanged: anon + authenticated can execute.';
