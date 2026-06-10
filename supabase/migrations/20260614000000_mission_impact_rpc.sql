-- Phase 0 (follow-up): Mission impact derivation from verified evidence.
--
-- RPC:
--   1) get_mission_impact_preview — factual outcome derived from real
--      verified evidence, never hardcoded text.

create or replace function public.get_mission_impact_preview(p_mission_id uuid)
returns table (
  evidence_count bigint,
  latest_caption text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with verified as (
    select caption
    from public.mission_evidence
    where mission_id = p_mission_id
      and moderation_status = 'approved'
    order by created_at desc
  )
  select
    (select count(*)::bigint from verified),
    (select caption from verified limit 1);
$$;

revoke all on function public.get_mission_impact_preview(uuid) from public;
grant execute on function public.get_mission_impact_preview(uuid) to authenticated;

comment on function public.get_mission_impact_preview(uuid) is
  'Returns factual outcome data from verified evidence for a mission. Returns 1 row with count and latest caption.';