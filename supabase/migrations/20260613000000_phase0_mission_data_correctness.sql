-- Phase 0: Mission data correctness.
-- Replaces hardcoded/fallback values in mapRowToMission with real data.
--
-- RPCs:
--   1) get_mission_organizer_preview — public-safe organizer info for a mission
--      (mirrors get_proposal_author_preview pattern)

-- ===========================================================================
-- 1) get_mission_organizer_preview(p_mission_id)
--   Replaces the "Comunidad KUSQA" placeholder in mission detail.
--   Returns public-safe fields only.
-- ===========================================================================

create or replace function public.get_mission_organizer_preview(p_mission_id uuid)
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
    m.created_by as user_id, -- 🔥 Cambiado de organizer_id a created_by
    coalesce(pr.username, 'kusqa') as username,
    coalesce(split_part(coalesce(pr.username, ''), ' ', 1), 'KUSQA') as first_name,
    pr.avatar_url as avatar_url
  from public.missions m
  left join public.profiles pr on pr.id = m.created_by -- 🔥 Cambiado de organizer_id a created_by
  where m.id = p_mission_id
  limit 1;
$$;

revoke all on function public.get_mission_organizer_preview(uuid) from public;
grant execute on function public.get_mission_organizer_preview(uuid) to authenticated;

comment on function public.get_mission_organizer_preview(uuid) is
  'Public-safe organizer info for a mission. Replaces the previous "Comunidad KUSQA" placeholder. Returns 1 row max.';