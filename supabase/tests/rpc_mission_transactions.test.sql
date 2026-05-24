-- KUSQA RPC transaction test harness (run in Supabase SQL editor or psql)
-- Prerequisites: migrations through 20260525120100 applied; authenticated role simulation.

-- =============================================================================
-- Setup helpers (service role only)
-- =============================================================================
-- \set test_user_id 'YOUR-USER-UUID'
-- \set test_mission_id 'YOUR-MISSION-UUID'

-- =============================================================================
-- 1) Double join idempotency
-- =============================================================================
-- select public.join_mission_transaction(:'test_mission_id');
-- select public.join_mission_transaction(:'test_mission_id');
-- expect: second payload idempotent = true, same user_mission.id

-- =============================================================================
-- 2) Complete idempotency (no double XP)
-- =============================================================================
-- select experience_points from profiles where id = :'test_user_id';
-- select public.complete_mission_transaction(:'test_mission_id');
-- select public.complete_mission_transaction(:'test_mission_id');
-- select experience_points from profiles where id = :'test_user_id';
-- expect: XP unchanged on second complete

-- =============================================================================
-- 3) Join after complete must fail
-- =============================================================================
-- expect exception: MISSION_ALREADY_COMPLETED

-- =============================================================================
-- 4) Complete without join must fail
-- =============================================================================
-- delete from user_missions where user_id = :'test_user_id' and mission_id = :'test_mission_id';
-- select public.complete_mission_transaction(:'test_mission_id');
-- expect: USER_MISSION_NOT_FOUND

-- =============================================================================
-- 5) Audit trail
-- =============================================================================
-- select event_type, metadata, created_at
-- from mission_events
-- where actor_id = :'test_user_id' and mission_id = :'test_mission_id'
-- order by created_at desc;

-- =============================================================================
-- 6) Constraint invariants
-- =============================================================================
-- insert into user_missions (user_id, mission_id, status, xp_earned)
-- values (:'test_user_id', :'test_mission_id', 'in_progress', 10);
-- expect: constraint user_missions_in_progress_requires_pending_fields violation
