-- KUSQA: vitality seed (Phase 3 rewrite).
--
-- This file seeds a small, *believable* vitality layer on top of 0000_baseline.
-- Phase 3 changes:
--   - Sections 1-2 (profiles + mission_participants): retained, with idempotency
--     guards added (ON CONFLICT for profiles.email + user_missions(user_id, mission_id)).
--   - Section 3 (activity_log): REMOVED. The `activity_log` table does not exist
--     in any committed migration and is not referenced by application code.
--   - Section 4 (notifications → user_notifications): rewritten to target the
--     real `user_notifications` table with the correct shape.
--   - Section 5 (missions.participants/spots_left): REMOVED. Those columns do
--     not exist in the real missions schema (current_progress is the only
--     progress column).
--   - Section 6 (proposals): rewritten for the actual proposals schema
--     (summary, why, location_label, team_size, images, proposed_date).
--     Uses WHERE NOT EXISTS per title for idempotency. 3 proposals, small team
--     sizes, no fake engagement numbers.

-- ===========================================================================
-- 1) Profiles (idempotent on email)
-- ===========================================================================

insert into public.profiles (id, email, username, full_name, avatar_url, experience_points, level, bio, location, created_at)
select * from (values
  (
    gen_random_uuid()::text::uuid,
    'demo@kusqa.pe'::text,
    'kusqa_hero'::text,
    'María Quispe'::text,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=maria'::text,
    1250,
    5,
    'Apasionada por el medio ambiente y la educación comunitaria.'::text,
    'Miraflores, Lima'::text,
    NOW()
  ),
  (
    gen_random_uuid()::text::uuid,
    'carlos.mendoza@gmail.com'::text,
    'carlos_voluntario'::text,
    'Carlos Mendoza'::text,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos'::text,
    890,
    4,
    'Ingeniero ambiental comprometido con la conservación de la selva.'::text,
    'Iquitos, Loreto'::text,
    NOW()
  ),
  (
    gen_random_uuid()::text::uuid,
    'sofia.huaman@outlook.com'::text,
    'sofia_arte'::text,
    'Sofía Huamán'::text,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=sofia'::text,
    650,
    3,
    'Artista visual y educadora. Pinto murales comunitarios.'::text,
    'Cusco Centro, Cusco'::text,
    NOW()
  ),
  (
    gen_random_uuid()::text::uuid,
    'juan.perez@yahoo.com'::text,
    'juan_tech'::text,
    'Juan Pérez'::text,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=juan'::text,
    420,
    2,
    'Desarrollador que enseña programación a jóvenes.'::text,
    'San Borja, Lima'::text,
    NOW()
  ),
  (
    gen_random_uuid()::text::uuid,
    'ana.rodriguez@gmail.com'::text,
    'ana_salud'::text,
    'Ana Rodríguez'::text,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=ana'::text,
    780,
    4,
    'Médica voluntaria en campañas de salud comunitaria.'::text,
    'Trujillo, La Libertad'::text,
    NOW()
  ),
  (
    gen_random_uuid()::text::uuid,
    'miguel.choque@hotmail.com'::text,
    'miguel_naturaleza'::text,
    'Miguel Choque'::text,
    'https://api.dicebear.com/7.x/avataaars/svg?seed=miguel'::text,
    340,
    2,
    'Guardaparques y guía de turismo sostenible en la sierra.'::text,
    'Puno Ciudad, Puno'::text,
    NOW()
  )
) as v(id, email, username, full_name, avatar_url, experience_points, level, bio, location, created_at)
on conflict (email) do nothing;

-- ===========================================================================
-- 2) mission_participants (idempotent on user_id+mission_id)
-- ===========================================================================

with user_ids as (
  select id, username from public.profiles
  where username in ('kusqa_hero','carlos_voluntario','sofia_arte','juan_tech','ana_salud','miguel_naturaleza')
),
mission_ids as (
  select id, title from public.missions
  where title in (
    'Reforestación del Parque Kennedy',
    'Taller de Reciclaje Creativo en Barranco',
    'Clases de Lectura para Niños en SJL',
    'Murales Comunitarios en Villa María del Triunfo',
    'Jornada de Salud en Comas',
    'Limpieza de Playas en Magdalena',
    'Restauración de Caminos Inca',
    'Huertos Escolares en Chinchero',
    'Campaña de Vacunación en Puno',
    'Reforestación en Iquitos',
    'Restauración del Centro Histórico de Trujillo'
  )
)
insert into public.mission_participants (user_id, mission_id, xp_earned, completed_at, created_at)
select
  u.id,
  m.id,
  case
    when m.title in (
      'Reforestación del Parque Kennedy',
      'Clases de Lectura para Niños en SJL',
      'Jornada de Salud en Comas',
      'Limpieza de Playas en Magdalena',
      'Restauración de Caminos Inca',
      'Huertos Escolares en Chinchero',
      'Campaña de Vacunación en Puno',
      'Reforestación en Iquitos'
    ) then 320
    else null
  end,
  case
    when m.title in (
      'Reforestación del Parque Kennedy',
      'Clases de Lectura para Niños en SJL',
      'Jornada de Salud en Comas',
      'Limpieza de Playas en Magdalena',
      'Restauración de Caminos Inca',
      'Huertos Escolares en Chinchero',
      'Campaña de Vacunación en Puno',
      'Reforestación en Iquitos'
    ) then NOW() - interval '14 days'
    else null
  end,
  NOW() - interval '21 days'
from user_ids u
cross join mission_ids m
where
  (u.username = 'kusqa_hero'       and m.title in ('Reforestación del Parque Kennedy', 'Taller de Reciclaje Creativo en Barranco', 'Clases de Lectura para Niños en SJL', 'Limpieza de Playas en Magdalena'))
  or (u.username = 'carlos_voluntario' and m.title in ('Reforestación en Iquitos', 'Reforestación del Parque Kennedy'))
  or (u.username = 'sofia_arte'     and m.title in ('Murales Comunitarios en Villa María del Triunfo', 'Restauración del Centro Histórico de Trujillo'))
  or (u.username = 'juan_tech'      and m.title in ('Restauración de Caminos Inca'))
  or (u.username = 'ana_salud'      and m.title in ('Jornada de Salud en Comas', 'Campaña de Vacunación en Puno'))
  or (u.username = 'miguel_naturaleza' and m.title in ('Reforestación en Iquitos', 'Restauración de Caminos Inca'))
on conflict (user_id, mission_id) do nothing;

-- ===========================================================================
-- 3) user_notifications (small batch, idempotent on (user_id, type, target_id))
-- ===========================================================================

do $$
declare
  v_hero uuid;
  v_sofia uuid;
  v_mission_pk uuid;
  v_mission_clases uuid;
  v_mission_reforest uuid;
begin
  select id into v_hero from public.profiles where username = 'kusqa_hero' limit 1;
  select id into v_sofia from public.profiles where username = 'sofia_arte' limit 1;
  select id into v_mission_pk from public.missions where title = 'Reforestación del Parque Kennedy' limit 1;
  select id into v_mission_clases from public.missions where title = 'Clases de Lectura para Niños en SJL' limit 1;
  select id into v_mission_reforest from public.missions where title = 'Reforestación en Iquitos' limit 1;

  if v_hero is not null then
    insert into public.user_notifications (user_id, type, title, message, target_id, metadata, read_at, created_at)
    values
      (v_hero, 'mission_nearby', 'Nueva misión cerca de ti', 'Hay una nueva misión de medio ambiente en Miraflores.', v_mission_pk, jsonb_build_object('mission_id', v_mission_pk), null, NOW() - interval '2 hours'),
      (v_hero, 'xp_earned', 'Ganaste 320 XP', 'Completaste la misión "Reforestación del Parque Kennedy".', v_mission_pk, jsonb_build_object('xp', 320, 'mission_id', v_mission_pk), null, NOW() - interval '14 days'),
      (v_hero, 'mission_invitation', 'Te invitaron a una misión', 'Sofía Huamán te invitó a "Clases de Lectura para Niños en SJL".', v_mission_clases, jsonb_build_object('mission_id', v_mission_clases, 'inviter_id', v_sofia), null, NOW() - interval '5 days')
    on conflict do nothing;
  end if;
end $$;

-- ===========================================================================
-- 4) Proposals (3 entries, real schema, idempotent on title)
-- ===========================================================================

with authors as (
  select id, username from public.profiles
  where username in ('sofia_arte', 'juan_tech', 'ana_salud')
)
insert into public.proposals (
  user_id, title, description, summary, why, district, region, category,
  team_size, images, status, latitude, longitude, location_label, proposed_date
)
select
  a.id,
  v.title,
  v.description,
  v.summary,
  v.why,
  v.district,
  v.region,
  v.category,
  v.team_size,
  v.images,
  v.status,
  v.latitude,
  v.longitude,
  v.location_label,
  v.proposed_date
from authors a
join (values
  (
    'sofia_arte'::text,
    'Mural del Rímac'::text,
    'Pintaremos un mural histórico en el Rímac para recuperar la identidad cultural del distrito y embellecer una plaza olvidada.'::text,
    'Mural que recupere la memoria del Rímac en una plaza pública.'::text,
    'El Rímac ha perdido sus plazas como punto de encuentro. Un mural comunitario puede ser el primer gesto para recuperarlas.'::text,
    'Rímac'::text,
    'costa'::text,
    'Arte & cultura'::text,
    5,
    '{}'::text[],
    'pending'::text,
    -12.03::numeric,
    -77.00::numeric,
    'Plaza de Armas del Rímac'::text,
    '2025-08-10'::timestamptz
  ),
  (
    'juan_tech'::text,
    'Hackathon Comunitario en San Borja'::text,
    'Hackathon de 48 horas para desarrollar soluciones tecnológicas a problemas locales del distrito, abierto a jóvenes mayores de 15 años.'::text,
    '48 horas para construir soluciones digitales a problemas del distrito.'::text,
    'Los jóvenes de San Borja tienen acceso limitado a espacios de creación tecnológica. Un hackathon abierto cambia eso.'::text,
    'San Borja'::text,
    'costa'::text,
    'Tecnología'::text,
    6,
    '{}'::text[],
    'pending'::text,
    -12.10::numeric,
    -76.98::numeric,
    'Centro Cultural de San Borja'::text,
    '2025-08-15'::timestamptz
  ),
  (
    'ana_salud'::text,
    'Clínica Móvil en Villa El Salvador'::text,
    'Llevaremos atención médica básica a una zona de Villa El Salvador donde el centro de salud más cercano queda a más de 40 minutos a pie.'::text,
    'Atención médica básica donde el centro de salud queda lejos.'::text,
    'Las familias de los asentamientos altos de VES postergan chequeos básicos por distancia. Una clínica móvil mensual cambia eso.'::text,
    'Villa El Salvador'::text,
    'costa'::text,
    'Salud'::text,
    4,
    '{}'::text[],
    'pending'::text,
    -12.20::numeric,
    -76.95::numeric,
    'AA.HH. Las Lomas de VES'::text,
    '2025-08-20'::timestamptz
  )
) as v(username, title, description, summary, why, district, region, category, team_size, images, status, latitude, longitude, location_label, proposed_date)
  on a.username = v.username
where not exists (
  select 1 from public.proposals p where p.title = v.title
);
