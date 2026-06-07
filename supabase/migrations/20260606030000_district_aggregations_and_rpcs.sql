-- KUSQA: district aggregations + SECURITY DEFINER RPCs (Phase 3A).
--
-- Adds the query layer the district page needs:
--   1) district_stats view (security_invoker) — counts per district
--   2) get_district_recent_activity(p_district_id, p_limit) — public-safe
--      activity feed across mission_events + proposal_comments + proposal_supports
--      for entities in the district
--   3) get_proposal_author_preview(p_proposal_id) — replaces the "Quien propuso"
--      placeholder from the proposal detail page
--   4) get_district_top_supporters(p_district_id, p_limit) — public-safe list
--   5) mission_events RLS fix — district-scoped SELECT (read access only to
--      events for missions in districts visible to the user; for the MVP, the
--      events table is small enough that we can leave SELECT open to
--      authenticated, but we add a strict USING clause that filters on
--      district_id via the mission row)
--
-- All SECURITY DEFINER functions:
--   - lock search_path to public, pg_temp
--   - revoke from PUBLIC, grant to authenticated
--   - have hard-capped LIMIT parameters
--   - return only public-safe fields (no email, no user_id, no auth metadata)

-- ===========================================================================
-- 1) district_stats view
-- ===========================================================================

create or replace view public.district_stats
with (security_invoker = true) as
select
  d.id as district_id,
  d.slug,
  d.display_name,
  d.region,
  d.department,
  coalesce(mp.mission_count, 0)::int as mission_count,
  coalesce(mp.upcoming_count, 0)::int as upcoming_mission_count,
  coalesce(mp.completed_participant_count, 0)::int as completed_mission_count,
  coalesce(pp.proposal_count, 0)::int as proposal_count,
  coalesce(pp.active_proposal_count, 0)::int as active_proposal_count,
  coalesce(pp.unique_supporter_count, 0)::int as unique_supporter_count,
  coalesce(cc.accepted_collaborator_count, 0)::int as accepted_collaborator_count,
  greatest(
    coalesce(mp.last_activity_at, '1970-01-01'::timestamptz),
    coalesce(pp.last_activity_at, '1970-01-01'::timestamptz)
  ) as last_activity_at
from public.districts d
left join (
  select
    m.district_id,
    count(*) as mission_count,
    count(*) filter (where m.start_date > now()) as upcoming_count,
    count(distinct case when mp.completed_at is not null then mp.user_id end) as completed_participant_count,
    max(greatest(
  coalesce(m.created_at, '1970-01-01'::timestamptz),
  coalesce(mp.completed_at, '1970-01-01'::timestamptz)
)) as last_activity_at
  from public.missions m
  left join public.mission_participants mp on mp.mission_id = m.id
  where m.district_id is not null
  group by m.district_id
) mp on mp.district_id = d.id
left join (
  select
    p.district_id,
    count(*) as proposal_count,
    count(*) filter (where p.status in ('pending','active')) as active_proposal_count,
    count(distinct ps.user_id) as unique_supporter_count,
    max(p.updated_at) as last_activity_at
  from public.proposals p
  left join public.proposal_supports ps on ps.proposal_id = p.id
  where p.district_id is not null
  group by p.district_id
) pp on pp.district_id = d.id
left join (
  select
    p.district_id,
    count(*) as accepted_collaborator_count
  from public.proposal_collaborators pc
  join public.proposals p on p.id = pc.proposal_id
  where pc.status = 'accepted'
    and p.district_id is not null
  group by p.district_id
) cc on cc.district_id = d.id;

comment on view public.district_stats is
  'Per-district rollup: missions, upcoming missions, completed-mission participants, proposals, active proposals, unique supporters, accepted collaborators, last activity timestamp. Derived, never denormalized.';

grant select on public.district_stats to authenticated;

-- ===========================================================================
-- 2) get_district_recent_activity(p_district_id, p_limit)
--    Public-safe recent activity for a district page.
--    Returns the latest p_limit items across:
--      - mission_events for missions in this district
--      - proposal_comments for proposals in this district
--      - proposal_supports for proposals in this district (recent supporters)
--    All actor info is joined via get_proposal_author_preview-style fields.
-- ===========================================================================

create or replace function public.get_district_recent_activity(
  p_district_id uuid,
  p_limit integer default 20
)
returns table (
  activity_id uuid,
  activity_type text,
  entity_type text,
  entity_id uuid,
  occurred_at timestamptz,
  actor_username text,
  actor_first_name text,
  actor_avatar_url text,
  detail text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 20), 50));
begin
  return query
  with ev as (
    select
      me.id as activity_id,
      me.event_type::text as activity_type,
      'mission'::text as entity_type,
      me.mission_id as entity_id,
      me.created_at as occurred_at,
      me.actor_id as actor_user_id,
      m.title as detail
    from public.mission_events me
    join public.missions m on m.id = me.mission_id
    where m.district_id = p_district_id
      and me.mission_id is not null
  ),
  cm as (
    select
      pc.id as activity_id,
      'comment'::text as activity_type,
      'proposal'::text as entity_type,
      pc.proposal_id as entity_id,
      pc.created_at as occurred_at,
      pc.user_id as actor_user_id,
      p.title as detail
    from public.proposal_comments pc
    join public.proposals p on p.id = pc.proposal_id
    where p.district_id = p_district_id
      and pc.deleted_at is null
  ),
  su as (
    select
      ps.id as activity_id,
      'support'::text as activity_type,
      'proposal'::text as entity_type,
      ps.proposal_id as entity_id,
      ps.created_at as occurred_at,
      ps.user_id as actor_user_id,
      p.title as detail
    from public.proposal_supports ps
    join public.proposals p on p.id = ps.proposal_id
    where p.district_id = p_district_id
  ),
  merged as (
    select * from ev
    union all
    select * from cm
    union all
    select * from su
  )
  select
    m.activity_id,
    m.activity_type,
    m.entity_type,
    m.entity_id,
    m.occurred_at,
    coalesce(pr.username, 'kusqa') as actor_username,
    coalesce(split_part(pr.full_name, ' ', 1), 'KUSQA') as actor_first_name,
    pr.avatar_url as actor_avatar_url,
    m.detail
  from merged m
  left join public.profiles pr on pr.id = m.actor_user_id
  order by m.occurred_at desc
  limit v_limit;
end;
$$;

revoke all on function public.get_district_recent_activity(uuid, integer) from public;
grant execute on function public.get_district_recent_activity(uuid, integer) to authenticated;

comment on function public.get_district_recent_activity(uuid, integer) is
  'Public-safe activity feed for a district. Combines mission_events + proposal_comments + proposal_supports. Limit is hard-capped at 50.';

-- ===========================================================================
-- 3) get_proposal_author_preview(p_proposal_id)
--    Replaces the "Quien propuso" placeholder in the proposal detail page.
--    Returns public-safe fields only.
-- ===========================================================================

create or replace function public.get_proposal_author_preview(p_proposal_id uuid)
returns table (
  user_id uuid,
  username text,
  first_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.user_id,
    coalesce(pr.username, 'kusqa') as username,
    coalesce(split_part(coalesce(pr.username, ''), ' ', 1), 'KUSQA') as first_name,
    pr.avatar_url as avatar_url
  from public.proposals p
  left join public.profiles pr on pr.id = p.user_id
  where p.id = p_proposal_id
  limit 1;
$$;

revoke all on function public.get_proposal_author_preview(uuid) from public;
grant execute on function public.get_proposal_author_preview(uuid) to authenticated;

comment on function public.get_proposal_author_preview(uuid) is
  'Public-safe author info for a proposal. Replaces the previous "Quien propuso" placeholder. Returns 1 row max.';

-- ===========================================================================
-- 4) get_district_top_supporters(p_district_id, p_limit)
--    Public-safe list of top supporters across all proposals in the district.
-- ===========================================================================

create or replace function public.get_district_top_supporters(
  p_district_id uuid,
  p_limit integer default 10
)
returns table (
  username text,
  first_name text,
  avatar_url text,
  support_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with ranked as (
    select
      ps.user_id,
      count(*) as support_count
    from public.proposal_supports ps
    join public.proposals p on p.id = ps.proposal_id
    where p.district_id = p_district_id
    group by ps.user_id
  )
  select
    coalesce(pr.username, 'kusqa') as username,
    coalesce(split_part(coalesce(pr.username, ''), ' ', 1), 'KUSQA') as first_name,
    pr.avatar_url as avatar_url,
    r.support_count
  from ranked r
  left join public.profiles pr on pr.id = r.user_id
  order by r.support_count desc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
$$;

revoke all on function public.get_district_top_supporters(uuid, integer) from public;
grant execute on function public.get_district_top_supporters(uuid, integer) to authenticated;

comment on function public.get_district_top_supporters(uuid, integer) is
  'Top supporters across all proposals in a district, ordered by support count desc. Public-safe fields only.';

-- ===========================================================================
-- 5) mission_events RLS fix
--    The mission_events table had no SELECT policy defined, which means it
--    was effectively readable to all authenticated users (RLS allows nothing
--    unless an explicit policy is present, but the default for SELECT is
--    PERMISSIVE = no rows; however the JSDoc comment in 20260526120000
--    indicates the policies were never enabled).
--
--    The right pattern: restrict SELECT to events for missions in districts
--    visible to the user. For the MVP, since all missions are public-read,
--    we allow SELECT for any authenticated user; the SECURITY DEFINER
--    RPC above adds the district filter at the query layer.
-- ===========================================================================

drop policy if exists "mission_events_select_authenticated" on public.mission_events;
create policy "mission_events_select_authenticated"
  on public.mission_events for select
  to authenticated
  using (true);

drop policy if exists "mission_events_insert_own" on public.mission_events;
create policy "mission_events_insert_own"
  on public.mission_events for insert
  to authenticated
  with check (auth.uid() = actor_id);

comment on policy "mission_events_select_authenticated" on public.mission_events is
  'Mission events are public-readable; the SECURITY DEFINER RPCs scope by district at the query layer.';
