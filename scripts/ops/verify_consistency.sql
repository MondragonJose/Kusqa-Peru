-- KUSQA operational consistency verification (run as service role / SQL editor)
-- Detects orphan evidence, XP/progress drift, duplicate participations.

-- Duplicate user_missions (should be zero)
select user_id, mission_id, count(*) as cnt
from public.user_missions
group by user_id, mission_id
having count(*) > 1;

-- Completed missions missing XP
select id, user_id, mission_id, status, xp_earned, completed_at
from public.user_missions
where status = 'completed' and (xp_earned is null or completed_at is null);

-- Evidence rows without storage object (manual check in Storage UI)
select id, storage_path, created_at
from public.mission_evidence
order by created_at desc
limit 50;

-- Recent mission_events audit trail
select event_type, actor_id, mission_id, metadata, created_at
from public.mission_events
order by created_at desc
limit 100;

-- Pending moderation queue
select target_type, target_id, reason_code, created_at
from public.moderation_reports
where status = 'pending'
order by created_at asc;
