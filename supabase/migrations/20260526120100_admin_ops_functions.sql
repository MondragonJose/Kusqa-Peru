-- KUSQA admin ops (service-role / SQL editor only — NOT exposed to anon client)

create or replace function public.admin_inspect_mission_events(
  p_user_id uuid default null,
  p_limit integer default 100
)
returns setof public.mission_events
language sql
security definer
set search_path = public
as $$
  select *
  from public.mission_events me
  where p_user_id is null or me.actor_id = p_user_id
  order by me.created_at desc
  limit greatest(p_limit, 1);
$$;

revoke all on function public.admin_inspect_mission_events(uuid, integer) from public;
grant execute on function public.admin_inspect_mission_events(uuid, integer) to service_role;

comment on function public.admin_inspect_mission_events is
  'Ops: inspect mission_events for debugging. Use service_role only.';
