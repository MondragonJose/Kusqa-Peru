-- Seed para hacer la plataforma más viva
-- Crea perfiles adicionales, participaciones en misiones, actividad reciente
-- Ejecutar en Supabase SQL Editor

-- 1. Crear perfiles de usuarios adicionales (6 perfiles realistas)
INSERT INTO profiles (id, email, username, full_name, avatar_url, experience_points, level, bio, location, created_at) VALUES
-- Usuario principal (actualiza si ya existe)
(
  gen_random_uuid(),
  'demo@kusqa.pe',
  'kusqa_hero',
  'María Quispe',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=maria',
  1250,
  5,
  'Apasionada por el medio ambiente y la educación comunitaria. Siempre buscando formas de ayudar.',
  'Lima, Perú',
  NOW()
),
-- Perfiles adicionales
(
  gen_random_uuid(),
  'carlos.mendoza@gmail.com',
  'carlos_voluntario',
  'Carlos Mendoza',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=carlos',
  890,
  4,
  'Ingeniero ambiental comprometido con la conservación de la selva.',
  'Iquitos, Perú',
  NOW()
),
(
  gen_random_uuid(),
  'sofia.huaman@outlook.com',
  'sofia_arte',
  'Sofía Huamán',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=sofia',
  650,
  3,
  'Artista visual y educadora. Creo murales comunitarios y talleres de arte.',
  'Cusco, Perú',
  NOW()
),
(
  gen_random_uuid(),
  'juan.perez@yahoo.com',
  'juan_tech',
  'Juan Pérez',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=juan',
  420,
  2,
  'Desarrollador de software que enseña programación a jóvenes.',
  'Lima, Perú',
  NOW()
),
(
  gen_random_uuid(),
  'ana.rodriguez@gmail.com',
  'ana_salud',
  'Ana Rodríguez',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=ana',
  780,
  4,
  'Médica voluntaria en campañas de salud comunitaria.',
  'Trujillo, Perú',
  NOW()
),
(
  gen_random_uuid(),
  'miguel.choque@hotmail.com',
  'miguel_naturaleza',
  'Miguel Choque',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=miguel',
  340,
  2,
  'Guardaparques y guía de turismo sostenible en la sierra.',
  'Puno, Perú',
  NOW()
),
(
  gen_random_uuid(),
  'laura.sanchez@gmail.com',
  'laura_educacion',
  'Laura Sánchez',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=laura',
  560,
  3,
  'Profesora de primaria apasionada por la lectura infantil.',
  'San Juan de Lurigancho, Perú',
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 2. Crear participaciones en misiones (user_missions)
-- Usaremos los IDs de las misiones existentes y los nuevos perfiles
WITH user_ids AS (
  SELECT id, username FROM profiles WHERE username IN ('kusqa_hero', 'carlos_voluntario', 'sofia_arte', 'juan_tech', 'ana_salud', 'miguel_naturaleza', 'laura_educacion')
),
mission_ids AS (
  SELECT id, title FROM missions WHERE title IN (
    'Reforestación del Parque Kennedy',
    'Taller de Reciclaje Creativo en Barranco',
    'Clases de Lectura para Niños en SJL',
    'Murales Comunitarios en Villa María',
    'Jornada de Salud en Comas',
    'Taller de Programación para Jóvenes',
    'Limpieza de Playas en Costa Verde',
    'Restauración de Caminos Inca',
    'Huertos Escolares en Chinchero',
    'Taller de Tejido Ancestral',
    'Campaña de Vacunación en Puno',
    'Reforestación en Iquitos',
    'Restauración del Centro Histórico'
  )
)
INSERT INTO user_missions (user_id, mission_id, status, completed_at, xp_earned, created_at)
SELECT
  u.id,
  m.id,
  CASE 
    WHEN m.title IN ('Reforestación del Parque Kennedy', 'Clases de Lectura para Niños en SJL', 'Jornada de Salud en Comas', 'Limpieza de Playas en Costa Verde', 'Restauración de Caminos Inca', 'Huertos Escolares en Chinchero', 'Campaña de Vacunación en Puno', 'Reforestación en Iquitos')
    THEN 'completed'
    ELSE 'in_progress'
  END,
  CASE 
    WHEN m.title IN ('Reforestación del Parque Kennedy', 'Clases de Lectura para Niños en SJL', 'Jornada de Salud en Comas', 'Limpieza de Playas en Costa Verde', 'Restauración de Caminos Inca', 'Huertos Escolares en Chinchero', 'Campaña de Vacunación en Puno', 'Reforestación en Iquitos')
    THEN NOW() - INTERVAL '1 day' * (RANDOM() * 30 + 1)::int
    ELSE NULL
  END,
  CASE 
    WHEN m.title IN ('Reforestación del Parque Kennedy', 'Clases de Lectura para Niños en SJL', 'Jornada de Salud en Comas', 'Limpieza de Playas en Costa Verde', 'Restauración de Caminos Inca', 'Huertos Escolares en Chinchero', 'Campaña de Vacunación en Puno', 'Reforestación en Iquitos')
    THEN (SELECT xp FROM missions WHERE id = m.id)
    ELSE NULL
  END,
  NOW() - INTERVAL '1 day' * (RANDOM() * 60 + 1)::int
FROM user_ids u
CROSS JOIN mission_ids m
WHERE 
  (u.username = 'kusqa_hero' AND m.title IN ('Reforestación del Parque Kennedy', 'Taller de Reciclaje Creativo en Barranco', 'Clases de Lectura para Niños en SJL', 'Limpieza de Playas en Costa Verde'))
  OR (u.username = 'carlos_voluntario' AND m.title IN ('Reforestación en Iquitos', 'Reforestación del Parque Kennedy'))
  OR (u.username = 'sofia_arte' AND m.title IN ('Murales Comunitarios en Villa María', 'Restauración del Centro Histórico', 'Taller de Tejido Ancestral'))
  OR (u.username = 'juan_tech' AND m.title IN ('Taller de Programación para Jóvenes'))
  OR (u.username = 'ana_salud' AND m.title IN ('Jornada de Salud en Comas', 'Campaña de Vacunación en Puno'))
  OR (u.username = 'miguel_naturaleza' AND m.title IN ('Restauración de Caminos Inca', 'Huertos Escolares en Chinchero'))
  OR (u.username = 'laura_educacion' AND m.title IN ('Clases de Lectura para Niños en SJL'))
ON CONFLICT (user_id, mission_id) DO NOTHING;

-- 3. Crear actividad reciente (activity_log)
INSERT INTO activity_log (user_id, action_type, target_type, target_id, metadata, created_at)
SELECT 
  um.user_id,
  CASE 
    WHEN um.status = 'completed' THEN 'mission_completed'
    ELSE 'mission_joined'
  END,
  'mission',
  um.mission_id,
  jsonb_build_object(
    'mission_title', (SELECT title FROM missions WHERE id = um.mission_id),
    'xp_earned', um.xp_earned,
    'district', (SELECT district FROM missions WHERE id = um.mission_id)
  ),
  CASE 
    WHEN um.status = 'completed' THEN um.completed_at
    ELSE um.created_at
  END
FROM user_missions um
ORDER BY um.created_at DESC
LIMIT 50;

-- 4. Crear notificaciones para el usuario principal
WITH main_user AS (
  SELECT id FROM profiles WHERE username = 'kusqa_hero' LIMIT 1
)
INSERT INTO notifications (user_id, type, title, message, metadata, is_read, created_at)
SELECT 
  mu.id,
  'mission_nearby',
  '¡Nueva misión cerca de ti!',
  'Hay una nueva misión de medio ambiente en Miraflores que podría interesarte.',
  jsonb_build_object('mission_id', (SELECT id FROM missions WHERE title = 'Reforestación del Parque Kennedy' LIMIT 1)),
  false,
  NOW() - INTERVAL '2 hours'
FROM main_user mu
UNION ALL
SELECT 
  mu.id,
  'xp_earned',
  '¡Ganaste 150 XP!',
  'Completaste la misión "Reforestación del Parque Kennedy" y ganaste 150 puntos de experiencia.',
  jsonb_build_object('xp', 150, 'mission_id', (SELECT id FROM missions WHERE title = 'Reforestación del Parque Kennedy' LIMIT 1)),
  false,
  NOW() - INTERVAL '1 day'
FROM main_user mu
UNION ALL
SELECT 
  mu.id,
  'level_up',
  '¡Subiste al nivel 5!',
  'Felicidades por alcanzar el nivel 5. Sigue así para desbloquear más misiones.',
  jsonb_build_object('new_level', 5, 'xp_required', 1000),
  false,
  NOW() - INTERVAL '3 days'
FROM main_user mu
UNION ALL
SELECT 
  mu.id,
  'new_follower',
  'Sofía Huamán te siguió',
  'Sofía Huamán, una artista de Cusco, ahora te sigue en KUSQA.',
  jsonb_build_object('follower_id', (SELECT id FROM profiles WHERE username = 'sofia_arte' LIMIT 1), 'follower_name', 'Sofía Huamán'),
  false,
  NOW() - INTERVAL '5 hours'
FROM main_user mu;

-- 5. Actualizar participantes en misiones para reflejar actividad real
UPDATE missions 
SET participants = (
  SELECT COUNT(*) 
  FROM user_missions 
  WHERE user_missions.mission_id = missions.id
),
spots_left = GREATEST(0, spots_left - (
  SELECT COUNT(*) 
  FROM user_missions 
  WHERE user_missions.mission_id = missions.id AND user_missions.status = 'in_progress'
))
WHERE id IN (SELECT DISTINCT mission_id FROM user_missions);

-- 6. Crear propuestas adicionales para simular actividad comunitaria
WITH user_ids AS (
  SELECT id FROM profiles WHERE username IN ('sofia_arte', 'juan_tech', 'ana_salud')
)
INSERT INTO proposals (user_id, title, description, district, region, category, xp, difficulty, date, participants, spots_left, distance_km, impact, coords, emoji, status, created_at)
SELECT
  u.id,
  CASE u.id
    WHEN (SELECT id FROM profiles WHERE username = 'sofia_arte' LIMIT 1) THEN 'Mural del Rímac'
    WHEN (SELECT id FROM profiles WHERE username = 'juan_tech' LIMIT 1) THEN 'Hackathon Comunitario'
    ELSE 'Clínica Móvil en Villa El Salvador'
  END,
  CASE u.id
    WHEN (SELECT id FROM profiles WHERE username = 'sofia_arte' LIMIT 1) THEN 'Pintaremos un mural histórico en el Rímac para recuperar la identidad cultural del distrito.'
    WHEN (SELECT id FROM profiles WHERE username = 'juan_tech' LIMIT 1) THEN 'Hackathon de 48 horas para desarrollar soluciones tecnológicas para problemas locales.'
    ELSE 'Llevaremos atención médica básica a zonas vulnerables de Villa El Salvador.'
  END,
  CASE u.id
    WHEN (SELECT id FROM profiles WHERE username = 'sofia_arte' LIMIT 1) THEN 'Rímac'
    WHEN (SELECT id FROM profiles WHERE username = 'juan_tech' LIMIT 1) THEN 'San Borja'
    ELSE 'Villa El Salvador'
  END,
  'costa',
  CASE u.id
    WHEN (SELECT id FROM profiles WHERE username = 'sofia_arte' LIMIT 1) THEN 'Arte & cultura'
    WHEN (SELECT id FROM profiles WHERE username = 'juan_tech' LIMIT 1) THEN 'Tecnología'
    ELSE 'Salud'
  END,
  120,
  'Andina',
  CASE u.id
    WHEN (SELECT id FROM profiles WHERE username = 'sofia_arte' LIMIT 1) THEN '2025-08-10'
    WHEN (SELECT id FROM profiles WHERE username = 'juan_tech' LIMIT 1) THEN '2025-08-15'
    ELSE '2025-08-20'
  END,
  25,
  15,
  0,
  CASE u.id
    WHEN (SELECT id FROM profiles WHERE username = 'sofia_arte' LIMIT 1) THEN 'Recuperación cultural'
    WHEN (SELECT id FROM profiles WHERE username = 'juan_tech' LIMIT 1) THEN 'Innovación local'
    ELSE 'Acceso a salud'
  END,
  CASE u.id
    WHEN (SELECT id FROM profiles WHERE username = 'sofia_arte' LIMIT 1) THEN '{"lat": -12.03, "lng": -77.00}'
    WHEN (SELECT id FROM profiles WHERE username = 'juan_tech' LIMIT 1) THEN '{"lat": -12.10, "lng": -76.98}'
    ELSE '{"lat": -12.20, "lng": -76.95}'
  END,
  CASE u.id
    WHEN (SELECT id FROM profiles WHERE username = 'sofia_arte' LIMIT 1) THEN '🎨'
    WHEN (SELECT id FROM profiles WHERE username = 'juan_tech' LIMIT 1) THEN '💻'
    ELSE '🏥'
  END,
  'proposed',
  NOW()
FROM user_ids u;
