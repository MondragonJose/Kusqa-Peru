-- KUSQA Phase A: authoritative XP + audit logging in RPCs
-- Replaces complete_mission_transaction(uuid, integer) with mission-derived XP only.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.resolve_mission_xp_reward(p_mission_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select m.xp_reward
  from public.missions m
  where m.id = p_mission_id;
$$;

create or replace function public.append_mission_event(
  p_actor_id uuid,
  p_mission_id uuid,
  p_event_type text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mission_events (actor_id, mission_id, event_type, metadata)
  values (p_actor_id, p_mission_id, p_event_type, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

revoke all on function public.resolve_mission_xp_reward(uuid) from public;
revoke all on function public.append_mission_event(uuid, uuid, text, jsonb) from public;
grant execute on function public.resolve_mission_xp_reward(uuid) to authenticated;
grant execute on function public.append_mission_event(uuid, uuid, text, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- join_mission_transaction (audit events)
-- ---------------------------------------------------------------------------
create or replace function public.join_mission_transaction(p_mission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_row public.user_missions%rowtype;
  v_idempotent boolean := false;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_mission_id is null then
    raise exception 'INVALID_MISSION_ID' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.missions m where m.id = p_mission_id) then
    raise exception 'MISSION_NOT_FOUND' using errcode = 'P0001';
  end if;

  select *
  into v_row
  from public.user_missions um
  where um.user_id = v_user_id
    and um.mission_id = p_mission_id
  for update;

  if found then
    if v_row.status = 'completed' then
      raise exception 'MISSION_ALREADY_COMPLETED' using errcode = 'P0001';
    end if;

    v_idempotent := true;
    perform public.append_mission_event(
      v_user_id,
      p_mission_id,
      'join_idempotent',
      jsonb_build_object('user_mission_id', v_row.id)
    );
  else
    begin
      insert into public.user_missions (user_id, mission_id, status)
      values (v_user_id, p_mission_id, 'in_progress')
      returning * into v_row;
    exception
      when unique_violation then
        select *
        into v_row
        from public.user_missions um
        where um.user_id = v_user_id
          and um.mission_id = p_mission_id;

        if v_row.status = 'completed' then
          raise exception 'MISSION_ALREADY_COMPLETED' using errcode = 'P0001';
        end if;

        v_idempotent := true;
        perform public.append_mission_event(
          v_user_id,
          p_mission_id,
          'join_idempotent',
          jsonb_build_object('user_mission_id', v_row.id, 'race', 'unique_violation')
        );
    end;

    if not v_idempotent then
      perform public.append_mission_event(
        v_user_id,
        p_mission_id,
        'join',
        jsonb_build_object('user_mission_id', v_row.id)
      );
    end if;
  end if;

  return jsonb_build_object(
    'user_mission', to_jsonb(v_row),
    'idempotent', v_idempotent
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_mission_transaction — XP from missions.xp_reward only
-- ---------------------------------------------------------------------------
drop function if exists public.complete_mission_transaction(uuid, integer);

create or replace function public.complete_mission_transaction(p_mission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_row public.user_missions%rowtype;
  v_progress public.user_progress%rowtype;
  v_profile_xp integer;
  v_xp_reward integer;
  v_idempotent boolean := false;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  if p_mission_id is null then
    raise exception 'INVALID_MISSION_ID' using errcode = 'P0001';
  end if;

  select public.resolve_mission_xp_reward(p_mission_id) into v_xp_reward;
  if v_xp_reward is null then
    raise exception 'MISSION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_xp_reward < 0 then
    raise exception 'INVALID_XP' using errcode = 'P0001';
  end if;

  select *
  into v_row
  from public.user_missions um
  where um.user_id = v_user_id
    and um.mission_id = p_mission_id
  for update;

  if not found then
    raise exception 'USER_MISSION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_row.status = 'completed' then
    v_idempotent := true;

    if v_row.completed_at is null or v_row.xp_earned is null then
      raise exception 'COMPLETED_AT_IMMUTABLE' using errcode = 'P0001';
    end if;

    perform public.append_mission_event(
      v_user_id,
      p_mission_id,
      'complete_idempotent',
      jsonb_build_object(
        'user_mission_id', v_row.id,
        'xp_granted', v_row.xp_earned
      )
    );
  elsif v_row.status <> 'in_progress' then
    raise exception 'INVALID_MISSION_STATE' using errcode = 'P0001';
  else
    update public.user_missions
    set
      status = 'completed',
      completed_at = now(),
      xp_earned = v_xp_reward
    where id = v_row.id
    returning * into v_row;

    update public.profiles
    set experience_points = coalesce(experience_points, 0) + v_xp_reward
    where id = v_user_id;

    update public.user_progress
    set
      community_points = community_points + v_xp_reward,
      total_missions_completed = total_missions_completed + 1,
      last_activity_at = now()
    where user_id = v_user_id;

    if not found then
      insert into public.user_progress (
        user_id,
        community_points,
        total_missions_completed,
        last_activity_at
      )
      values (v_user_id, v_xp_reward, 1, now())
      returning * into v_progress;
    else
      select * into v_progress from public.user_progress where user_id = v_user_id;
    end if;

    perform public.append_mission_event(
      v_user_id,
      p_mission_id,
      'complete',
      jsonb_build_object('user_mission_id', v_row.id, 'xp_granted', v_xp_reward)
    );

    perform public.append_mission_event(
      v_user_id,
      p_mission_id,
      'xp_granted',
      jsonb_build_object('amount', v_xp_reward, 'source', 'missions.xp_reward')
    );
  end if;

  if v_progress is null then
    select * into v_progress from public.user_progress where user_id = v_user_id;
  end if;

  select coalesce(experience_points, 0)
  into v_profile_xp
  from public.profiles
  where id = v_user_id;

  return jsonb_build_object(
    'user_mission', to_jsonb(v_row),
    'user_progress', to_jsonb(v_progress),
    'profile_xp', v_profile_xp,
    'xp_granted', coalesce(v_row.xp_earned, v_xp_reward),
    'idempotent', v_idempotent
  );
end;
$$;

revoke all on function public.join_mission_transaction(uuid) from public;
revoke all on function public.complete_mission_transaction(uuid) from public;

grant execute on function public.join_mission_transaction(uuid) to authenticated;
grant execute on function public.complete_mission_transaction(uuid) to authenticated;
