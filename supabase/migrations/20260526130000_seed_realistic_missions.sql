-- KUSQA: realistic Peruvian community missions seed.
-- Phase 3 rewrite: matches the actual `missions` schema from 0000_baseline.sql.
--
-- Schema columns used (from 0000_baseline):
--   title, description, district, category, latitude, longitude,
--   organizer_id, start_date, end_date, current_progress, max_participants, xp_reward
--
-- Idempotency: wrapped in a `WHERE NOT EXISTS (SELECT 1 FROM missions WHERE title = ...)`
-- check per row. Re-running this migration does not create duplicates.
--
-- Realism: 12 missions across the 3 regions (costa/sierra/selva), 6 districts
-- (Miraflores, Barranco, Cusco Centro, Chinchero, Iquitos, Trujillo), with
-- small `max_participants` values that match the seed's intention without
-- fabricating participation counts. `current_progress` is left NULL — the
-- platform never claims civic work it didn't observe.

-- ===========================================================================
-- Costa — Lima Metropolitana
-- ===========================================================================

insert into public.missions (title, description, district, category, latitude, longitude, organizer_id, start_date, end_date, current_progress, max_participants, xp_reward)
select * from (values
  (
    'Reforestación del Parque Kennedy',
    'Plantaremos árboles nativos en el Parque Kennedy para mejorar la calidad del aire y crear sombras para la comunidad.',
    'Miraflores',
    'environment'::text,
    -12.122::double precision,
    -77.029::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-06-15'::timestamptz,
    '2025-06-15 13:00:00+00'::timestamptz,
    null,
    60,
    320
  ),
  (
    'Taller de Reciclaje Creativo en Barranco',
    'Enseñaremos a vecinos a transformar residuos plásticos en objetos útiles, promoviendo conciencia ambiental y creatividad local.',
    'Barranco',
    'environment'::text,
    -12.148::double precision,
    -77.021::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-06-20'::timestamptz,
    '2025-06-20 16:00:00+00'::timestamptz,
    null,
    50,
    320
  ),
  (
    'Clases de Lectura para Niños en SJL',
    'Voluntarios leerán cuentos a niños de San Juan de Lurigancho para fomentar el amor por los libros y la lectura.',
    'San Juan de Lurigancho',
    'education'::text,
    -11.98::double precision,
    -77.01::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-06-22'::timestamptz,
    '2025-06-22 10:00:00+00'::timestamptz,
    null,
    35,
    320
  ),
  (
    'Murales Comunitarios en Villa María del Triunfo',
    'Artistas locales y vecinos pintarán murales que cuenten la historia del distrito, embelleciendo espacios públicos.',
    'Villa María del Triunfo',
    'community'::text,
    -12.15::double precision,
    -76.95::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-06-25'::timestamptz,
    '2025-06-25 09:00:00+00'::timestamptz,
    null,
    52,
    320
  ),
  (
    'Jornada de Salud en Comas',
    'Médicos voluntarios ofrecerán chequeos gratuitos y charlas de prevención a familias que no tienen acceso regular a salud.',
    'Comas',
    'health'::text,
    -11.95::double precision,
    -77.05::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-07-01'::timestamptz,
    '2025-07-01 08:00:00+00'::timestamptz,
    null,
    85,
    320
  ),
  (
    'Limpieza de Playas en Magdalena',
    'Voluntarios limpiarán las playas de la Costa Verde, removiendo plásticos para proteger el ecosistema marino.',
    'Magdalena',
    'environment'::text,
    -12.08::double precision,
    -77.05::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-07-12'::timestamptz,
    '2025-07-12 07:00:00+00'::timestamptz,
    null,
    120,
    320
  )
) as v(title, description, district, category, latitude, longitude, organizer_id, start_date, end_date, current_progress, max_participants, xp_reward)
where not exists (
  select 1 from public.missions m where m.title = v.title
);

-- ===========================================================================
-- Sierra — Cusco + Puno
-- ===========================================================================

insert into public.missions (title, description, district, category, latitude, longitude, organizer_id, start_date, end_date, current_progress, max_participants, xp_reward)
select * from (values
  (
    'Restauración de Caminos Inca',
    'Trabajaremos con comunidades locales para restaurar tramos del Camino Inca cerca de Cusco, preservando patrimonio cultural.',
    'Cusco Centro',
    'education'::text,
    -13.522::double precision,
    -71.967::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-06-18'::timestamptz,
    '2025-06-18 08:00:00+00'::timestamptz,
    null,
    45,
    320
  ),
  (
    'Huertos Escolares en Chinchero',
    'Crearemos huertos escolares para enseñar a niños agricultura sostenible y nutrición, usando técnicas ancestrales.',
    'Chinchero',
    'education'::text,
    -13.391::double precision,
    -72.049::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-06-28'::timestamptz,
    '2025-06-28 09:00:00+00'::timestamptz,
    null,
    40,
    320
  ),
  (
    'Taller de Tejido Ancestral en Urubamba',
    'Maestras tejedoras enseñarán técnicas tradicionales a jóvenes, preservando el patrimonio cultural textil.',
    'Urubamba',
    'community'::text,
    -13.303::double precision,
    -72.116::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-07-05'::timestamptz,
    '2025-07-05 10:00:00+00'::timestamptz,
    null,
    30,
    320
  ),
  (
    'Campaña de Vacunación en Puno',
    'Voluntarios apoyarán una campaña de vacunación en comunidades rurales, asegurando acceso a inmunizaciones.',
    'Puno Ciudad',
    'health'::text,
    -15.84::double precision,
    -70.02::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-07-10'::timestamptz,
    '2025-07-10 08:00:00+00'::timestamptz,
    null,
    65,
    320
  )
) as v(title, description, district, category, latitude, longitude, organizer_id, start_date, end_date, current_progress, max_participants, xp_reward)
where not exists (
  select 1 from public.missions m where m.title = v.title
);

-- ===========================================================================
-- Selva — Loreto
-- ===========================================================================

insert into public.missions (title, description, district, category, latitude, longitude, organizer_id, start_date, end_date, current_progress, max_participants, xp_reward)
select * from (values
  (
    'Reforestación en Iquitos',
    'Plantaremos árboles nativos en áreas deforestadas alrededor de Iquitos, ayudando a recuperar la selva.',
    'Iquitos',
    'environment'::text,
    -3.74::double precision,
    -73.25::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-06-30'::timestamptz,
    '2025-06-30 07:00:00+00'::timestamptz,
    null,
    45,
    320
  ),
  (
    'Apoyo a Escuelas Rurales en Iquitos',
    'Llevaremos libros y materiales escolares a escuelas rurales de la selva, mejorando el acceso a educación.',
    'Iquitos',
    'education'::text,
    -3.76::double precision,
    -73.27::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-07-22'::timestamptz,
    '2025-07-22 09:00:00+00'::timestamptz,
    null,
    65,
    320
  )
) as v(title, description, district, category, latitude, longitude, organizer_id, start_date, end_date, current_progress, max_participants, xp_reward)
where not exists (
  select 1 from public.missions m where m.title = v.title
);

-- ===========================================================================
-- Costa — La Libertad
-- ===========================================================================

insert into public.missions (title, description, district, category, latitude, longitude, organizer_id, start_date, end_date, current_progress, max_participants, xp_reward)
select * from (values
  (
    'Restauración del Centro Histórico de Trujillo',
    'Voluntarios ayudarán en la restauración y limpieza del centro histórico, preservando arquitectura colonial.',
    'Trujillo',
    'community'::text,
    -8.115::double precision,
    -79.029::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-07-25'::timestamptz,
    '2025-07-25 09:00:00+00'::timestamptz,
    null,
    75,
    320
  ),
  (
    'Clases de Inglés para Niños en Trujillo',
    'Voluntarios enseñarán inglés básico a niños, abriendo oportunidades educativas y profesionales.',
    'Trujillo',
    'education'::text,
    -8.12::double precision,
    -79.03::double precision,
    (select id from public.profiles order by created_at asc nulls last limit 1),
    '2025-08-01'::timestamptz,
    '2025-08-01 10:00:00+00'::timestamptz,
    null,
    45,
    320
  )
) as v(title, description, district, category, latitude, longitude, organizer_id, start_date, end_date, current_progress, max_participants, xp_reward)
where not exists (
  select 1 from public.missions m where m.title = v.title
);

comment on table public.missions is
  'Civic missions. Seeded with 14 realistic missions across Lima, Cusco, Puno, Iquitos, Trujillo. Re-runs are idempotent (WHERE NOT EXISTS guard per title).';
