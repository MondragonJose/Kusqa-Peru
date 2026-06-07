-- KUSQA Phase 4A: get_public_profile SECURITY DEFINER RPC
--
-- Why an RPC, not a public view
--   profiles is own-only RLS (see 20260601000000_fix_profiles_rls.sql).
--   A public profile-of-others route cannot read profiles directly. We
--   keep the strict RLS and expose a single audited entry point that
--   returns only the public-safe projection. This avoids:
--     - leaking email / auth metadata,
--     - expanding the RLS surface (least-privilege),
--     - duplicating the public-profile contract in two places (view +
--       frontend code).
--
-- The projection includes derived counters (mission_count,
-- co_organized_count, distinct_district_count) so the public profile
-- can render the trust badge without N+1 round-trips.
--
-- Idempotent: CREATE OR REPLACE.

set search_path = public;

create or replace function public.get_public_profile(p_user_id uuid)
returns table (
  id              uuid,
  username        text,
  full_name       text,
  avatar_url      text,
  bio             text,
  district        text,
  region          text,
  district_id     uuid,
  district_slug   text,
  joined_at       timestamptz,
  mission_count              int,
  co_organized_count         int,
  supported_proposal_count   int,
  distinct_district_count    int,
  top_districts              jsonb
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_profile_id        uuid;
  v_username          text;
  v_full_name         text;
  v_avatar_url        text;
  v_bio               text;
  v_district          text;
  v_region            text;
  v_district_id       uuid;
  v_joined_at         timestamptz;
  v_district_slug     text;
  v_mission_count     int;
  v_co_organized      int;
  v_supported_count   int;
  v_distinct_districts int;
  v_top_districts     jsonb;
begin
  -- Single profile read; returns null if the user does not exist.
  select
    p.id, p.username, p.full_name, p.avatar_url, p.bio,
    p.district, p.region, p.district_id, p.created_at
  into
    v_profile_id, v_username, v_full_name, v_avatar_url, v_bio,
    v_district, v_region, v_district_id, v_joined_at
  from public.profiles p
  where p.id = p_user_id;

  if v_profile_id is null then
    return;
  end if;

  -- District slug (optional)
  select d.slug into v_district_slug
  from public.districts d
  where d.id = v_district_id;

  -- Mission count (completed user_missions)
  select count(distinct um.mission_id)::int into v_mission_count
  from public.user_missions um
  where um.user_id = v_profile_id and um.status = 'completed';

  -- Co-organized proposals (accepted collaborators)
  select count(distinct pc.proposal_id)::int into v_co_organized
  from public.proposal_collaborators pc
  where pc.user_id = v_profile_id and pc.status = 'accepted';

  -- Supported proposals
  select count(distinct ps.proposal_id)::int into v_supported_count
  from public.proposal_supports ps
  where ps.user_id = v_profile_id;

  -- Distinct districts the user has completed missions in
  select count(distinct m.district_id)::int into v_distinct_districts
  from public.user_missions um
  join public.missions m on m.id = um.mission_id
  where um.user_id = v_profile_id
    and um.status = 'completed'
    and m.district_id is not null;

  -- Top 3 districts by participation
  select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  into v_top_districts
  from (
    select d.id, d.slug, d.display_name, count(um.id) as mission_count
    from public.user_missions um
    join public.missions m on m.id = um.mission_id
    join public.districts d on d.id = m.district_id
    where um.user_id = v_profile_id
    group by d.id, d.slug, d.display_name
    order by count(um.id) desc, d.display_name asc
    limit 3
  ) t;

  return query
  select
    v_profile_id,
    v_username,
    coalesce(v_full_name, v_username),
    v_avatar_url,
    v_bio,
    v_district,
    v_region,
    v_district_id,
    v_district_slug,
    v_joined_at,
    v_mission_count,
    v_co_organized,
    v_supported_count,
    v_distinct_districts,
    v_top_districts;
end;
$$;

revoke all on function public.get_public_profile(uuid) from public;
grant execute on function public.get_public_profile(uuid) to anon, authenticated;
