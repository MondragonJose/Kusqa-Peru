-- ===========================================================================
-- Down migration: Revert collapse of proposals + missions
-- ===========================================================================

-- ── 0) Drop views that reference initiatives ─────────────────────────────

drop view if exists public.initiative_stats;

-- ── 1) Drop new tables ──────────────────────────────────────────────────

drop table if exists public.initiative_stewards cascade;
drop table if exists public.initiative_participants cascade;
drop table if exists public.initiative_supports cascade;
drop table if exists public.initiatives cascade;

-- ── 2) Drop new types ───────────────────────────────────────────────────

drop type if exists public.initiative_role cascade;
drop type if exists public.initiative_status cascade;
drop type if exists public.initiative_kind cascade;

-- ── 3) Drop trigger function ────────────────────────────────────────────

drop function if exists public.trg_handle_updated_at_initiatives cascade;

-- ── 4) Restore old tables from backup (guarded) ─────────────────────────

do $$
begin
  -- proposals
  if to_regclass('public._backup_proposals') is not null then
    drop table if exists public.proposals cascade;
    create table public.proposals (like public._backup_proposals including all);
    insert into public.proposals select * from public._backup_proposals;
  else
    raise notice 'Skipping restore: public._backup_proposals does not exist.';
  end if;

  -- missions
  if to_regclass('public._backup_missions') is not null then
    drop table if exists public.missions cascade;
    create table public.missions (like public._backup_missions including all);
    insert into public.missions select * from public._backup_missions;
  else
    raise notice 'Skipping restore: public._backup_missions does not exist.';
  end if;

  -- proposal_supports
  if to_regclass('public._backup_proposal_supports') is not null then
    drop table if exists public.proposal_supports cascade;
    create table public.proposal_supports (like public._backup_proposal_supports including all);
    insert into public.proposal_supports select * from public._backup_proposal_supports;
  else
    raise notice 'Skipping restore: public._backup_proposal_supports does not exist.';
  end if;

  -- mission_participants
  if to_regclass('public._backup_mission_participants') is not null then
    drop table if exists public.mission_participants cascade;
    create table public.mission_participants (like public._backup_mission_participants including all);
    insert into public.mission_participants select * from public._backup_mission_participants;
  else
    raise notice 'Skipping restore: public._backup_mission_participants does not exist.';
  end if;

  -- user_missions
  if to_regclass('public._backup_user_missions') is not null then
    drop table if exists public.user_missions cascade;
    create table public.user_missions (like public._backup_user_missions including all);
    insert into public.user_missions select * from public._backup_user_missions;
  else
    raise notice 'Skipping restore: public._backup_user_missions does not exist.';
  end if;

  -- proposal_collaborators
  if to_regclass('public._backup_proposal_collaborators') is not null then
    drop table if exists public.proposal_collaborators cascade;
    create table public.proposal_collaborators (like public._backup_proposal_collaborators including all);
    insert into public.proposal_collaborators select * from public._backup_proposal_collaborators;
  else
    raise notice 'Skipping restore: public._backup_proposal_collaborators does not exist.';
  end if;

  -- proposal_comments
  if to_regclass('public._backup_proposal_comments') is not null then
    drop table if exists public.proposal_comments cascade;
    create table public.proposal_comments (like public._backup_proposal_comments including all);
    insert into public.proposal_comments select * from public._backup_proposal_comments;
  else
    raise notice 'Skipping restore: public._backup_proposal_comments does not exist.';
  end if;

  -- proposal_lifecycle_events
  if to_regclass('public._backup_proposal_lifecycle_events') is not null then
    drop table if exists public.proposal_lifecycle_events cascade;
    create table public.proposal_lifecycle_events (like public._backup_proposal_lifecycle_events including all);
    insert into public.proposal_lifecycle_events select * from public._backup_proposal_lifecycle_events;
  else
    raise notice 'Skipping restore: public._backup_proposal_lifecycle_events does not exist.';
  end if;
end $$;

-- ── 5) Cleanup backup tables ────────────────────────────────────────────

drop table if exists public._backup_proposals cascade;
drop table if exists public._backup_missions cascade;
drop table if exists public._backup_proposal_supports cascade;
drop table if exists public._backup_mission_participants cascade;
drop table if exists public._backup_user_missions cascade;
drop table if exists public._backup_proposal_collaborators cascade;
drop table if exists public._backup_proposal_comments cascade;
drop table if exists public._backup_proposal_lifecycle_events cascade;