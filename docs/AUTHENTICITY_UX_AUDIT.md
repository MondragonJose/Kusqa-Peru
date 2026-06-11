# KUSQA — AUDITORÍA DE AUTENTICIDAD UX

**Propósito**: Detectar e identificar qué elementos se sienten falsos, artificiales o como placeholder. Criticar con brutalidad honesta.

**Fecha**: May 2026  
**Enfoque**: Percepción de autenticidad, credibilidad emocional, humanidad, confianza.

---

## SÍNTESIS EJECUTIVA

KUSQA **vive de la ficción**. Cada interacción te presencia datos inventados. No es un "MVP", es una **ilusión de comunidad**. La arquitectura está basada en:

- ✅ Storytelling poético
- ✅ Animaciones pulidas (Framer Motion)
- ❌ **Cero datos reales**
- ❌ **Métricas fabricadas**
- ❌ **Usuarios simulados**
- ❌ **Actividad fake en tiempo real**

**Impacto emocional**: Sientes que algo está _casi bien_, pero tu instinto dice "esto es una demo". Es el uncanny valley de aplicaciones sociales.

---

## ANÁLISIS DETALLADO POR ÁREA

---

## P0: LIVE ACTIVITY FEED — SIMULACIÓN OBVIA

### 🔴 Problema exacto

**Ubicación**: `src/features/map/components/CivicActivityFeed.tsx`

```tsx
const eventInterval = setInterval(() => {
  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const districtObj = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
  const actionObj = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];

  setEvents((prev) => [newEvent, ...prev.slice(0, 5)]);
}, 12000); // Cada 12 segundos — OBVIO QUE ES FAKE
```

**Lo que ves**:

- Cada 12 segundos **exactos** aparece un evento nuevo
- El nombre es elegido al azar de `["Sayri", "Mateo", "Sofía", "Carlos", "Renzo", ...]`
- El avatar es un emoji aleatorio sin correlación
- La acción es del pool `ACTIONS` (6 acciones posibles)
- El distrito es aleatorio de 7 opciones fijas

**Por qué se siente fake**:

1. **Ritmo mecánico**: Un evento cada 12s es demasiado predecible. La actividad real es caótica.
2. **Pool limitado**: Ves a "Sayri" con "🦊" una vez, luego "Mateo" con "🌊" — no hay consistencia.
3. **Avatar desconectado**: El emoji no guarda relación con la persona ni la acción.
4. **Varias acciones genéricas**: "se unió a Mural Colectivo", "subió fotos de impacto comunitario"... son plantillas.
5. **Sin contexto temporal real**: "Hace unos instantes" es repetitivo, ignora zonas horarias, no hay sincronización.

**Impacto emocional**:

- 🧠 Tu cerebro detecta que **ninguno de estos eventos es real**.
- 😤 Sientes que el producto te **subestima la inteligencia**.
- 🚩 Pierdes confianza en cualquier métrica que vea: "¿Esta actividad también es inventada?".
- 💔 No hay humanidad: los nombres no tienen historias, los avatares no tienen significado.

### Propuesta concreta

**Opción A: Desactivar hasta tener datos reales** (RECOMENDADO)

```tsx
// En producción sin datos reales: NO muestres simulación
export function CivicActivityFeed() {
  return null; // O mostrar estado vacío honesto
  // "Cuando la comunidad se mueva, sus historias aparecerán aquí"
}
```

**Opción B: Si DEBES mostrar algo** (Placeholder honesto)

```tsx
export function CivicActivityFeed() {
  return (
    <div className="glass-strong rounded-3xl p-6 border border-dashed border-border/40">
      <div className="text-center py-8">
        <div className="h-12 w-12 rounded-lg bg-secondary mx-auto mb-3 flex items-center justify-center">
          📡
        </div>
        <h3 className="font-semibold text-foreground mb-1">Esperando el primer movimiento</h3>
        <p className="text-sm text-muted-foreground">
          Cuando los primeros kusqas se unan a misiones, sus historias reales aparecerán aquí.
        </p>
        <p className="text-xs text-muted-foreground/60 mt-3">
          No simulamos actividad. Cuando es real, lo sabrás.
        </p>
      </div>
    </div>
  );
}
```

### Patch exacto

**Archivo**: `src/features/map/components/CivicActivityFeed.tsx`

Reemplaza el entire `useEffect` simulator con:

```tsx
useEffect(() => {
  // REALIDAD: Fetch desde Supabase de eventos reales
  // Por ahora, no simulamos
  return () => {};
}, []);
```

---

## P0: COMMUNITY PULSE — MÉTRICAS INVENTADAS

### 🔴 Problema exacto

**Ubicación**: `src/features/community/constants/districtActivity.ts`

```ts
export const MOCK_COMMUNITY_PULSE: CommunityPulseData = {
  totalActiveToday: 163, // ← INVENTADO
  activeDistrictsCount: 12, // ← INVENTADO
  recentImpactDescription: "5,490 horas de acción colectiva este mes en todo el Perú", // ← INVENTADO
  districts: DISTRICT_ACTIVITIES,
};
```

**Números específicos que gritan "FAKE"**:

- `163 activos hoy` — ¿De dónde? ¿Cuál es la fórmula?
- `12 distritos` — Listad en hardcode
- `5,490 horas` — Número muy preciso para ser falso
- `Barranco: 28 activos, energyScore 88` — Exacto, sin variabilidad
- `Urubamba: 34 activos, energyScore 94` — Otro número exacto

**Por qué se siente fake**:

1. **Precisión sospechosa**: Los números reales son caóticos. "163 activos" suena generado. "167 activos" sería más creíble.
2. **Sin fuente declarada**: No hay visible dónde vienen estos números.
3. **Constantes hardcoded**: Los `activeCount` y `energyScore` nunca cambian. El widget parece congelado.
4. **Métricas derivadas sin lógica clara**: `energyScore: 88` para Barranco — ¿Cómo se calcula? `(28 activos * missionCount / 2)?` No aparece la fórmula.
5. **Nombres de distritos genéricos**: Barranco, Urubamba, Iquitos, Trujillo... sí, existen, pero parece un cuestionario de geografía peruana.

**Impacto emocional**:

- 🎭 Sientes que mientes a usuarios cuando muestras estos números.
- 😒 Si un usuario vive en Barranco, ve "28 activos" y piensa "Yo no conozco 27 personas aquí en KUSQA".
- 📉 Primeras señales de que **el producto es una simulación, no un fenómeno real**.

### Propuesta concreta

**Opción A: Eliminar completamente**

```tsx
// No mostres nada hasta tener datos reales
export function CommunityPulse({ missions }: CommunityPulseProps) {
  if (!missions || missions.length === 0) {
    return <EmptyStateHonest />;
  }
  // Derivar SOLO de misiones reales
}
```

**Opción B: Mostrar lo que ES real**

```tsx
export function CommunityPulse({ missions }: CommunityPulseProps) {
  // Calcular métricas REALES solo desde `missions`
  const totalParticipants = missions.reduce((acc, m) => acc + m.participants, 0);
  const uniqueDistricts = new Set(missions.map((m) => m.district)).size;

  // Nunca mostres números hardcoded
  if (missions.length === 0) {
    return null; // No muestres fake pulse
  }

  return (
    <div className="...">
      <h3>Misiones activas ahora: {missions.length}</h3>
      <p>Conectando {uniqueDistricts} distritos</p>
      <p>{totalParticipants} personas en movimiento</p>
    </div>
  );
}
```

### Patch exacto

**Archivo**: `src/features/community/components/CommunityPulse.tsx` (línea 46-56)

Reemplaza:

```tsx
const totalActiveToday = hasMissions
  ? missions.reduce((acc, m) => acc + m.participants, 0)
  : MOCK_COMMUNITY_PULSE.totalActiveToday; // ← ELIMINA ESTA LÍNEA

const activeDistrictsCount = hasMissions
  ? new Set(missions.map((m) => m.district)).size
  : MOCK_COMMUNITY_PULSE.activeDistrictsCount; // ← ELIMINA ESTA LÍNEA

const recentImpactDescription = hasMissions
  ? `${missions.length} misión${missions.length !== 1 ? "es" : ""} activa${missions.length !== 1 ? "s" : ""} en ${activeDistrictsCount} distrito${activeDistrictsCount !== 1 ? "s" : ""} del Perú`
  : MOCK_COMMUNITY_PULSE.recentImpactDescription; // ← ELIMINA ESTA LÍNEA
```

Con:

```tsx
if (!hasMissions) {
  return null; // No mostres fake data
}

const totalActiveToday = missions.reduce((acc, m) => acc + m.participants, 0);
const activeDistrictsCount = new Set(missions.map((m) => m.district)).size;
const recentImpactDescription = `${missions.length} misión${missions.length !== 1 ? "es" : ""} en ${activeDistrictsCount} distrito${activeDistrictsCount !== 1 ? "s" : ""} con ${totalActiveToday} participantes`;
```

---

## P0: SAMPLE NOTIFICATIONS — NARRATIVA GENERADA ARTIFICIALMENTE

### 🔴 Problema exacto

**Ubicación**: `src/features/notifications/data/sampleNotifications.ts`

```ts
export const SAMPLE_NOTIFICATIONS: CivicNotification[] = [
  {
    id: "n1",
    type: "social",
    emoji: "🌱",
    title: "Tu brigada en Barranco comenzó movimiento esta noche", // ← Generado
    body: "Andrés y 28 personas más están activas en el mural colectivo · Sáb 14 jun", // ← Falso nombre
    timestamp: "hace 20 min",
    read: false,
    district: "Barranco, Lima",
    region: "costa",
    actorName: "Andrés Vega", // ← Nombre inventado, avatar genérico
  },
  {
    id: "n2",
    type: "presencia",
    emoji: "🔥",
    title: "Tu territorio está despierto", // ← Copy poético pero vacío
    body: "12 jóvenes dejan huella hoy en Barranco · 3 misiones en movimiento ahora mismo", // ← Metrics sin sentido
  },
  ...{
    id: "n12",
    type: "comunidad",
    emoji: "🌊",
    title: "La costa despertó esta mañana", // ← Narrativa épica artificial
    body: "Brigadas en Lima, Trujillo y Chiclayo iniciaron actividades simultáneas · el litoral respira", // ← Copy ChatGPT
  },
];
```

**Lo que grita "FAKE"**:

1. **Copy poético pero genérico**:
   - "Tu brigada en Barranco comenzó movimiento"
   - "el litoral respira"
   - "Tu territorio está despierto"

   Esto es **copy de Slack/Spotify/Duolingo** (apps que venden aspiración). No es comunicación real.

2. **Narrativa forzada**:
   - "Andrés y 28 personas más" — ¿Quién es Andrés? Un nombre aleatorio sin contexto.
   - "La sierra espera a sus guardianes" (n10) — Poético, pero suena **AI generado**.

3. **Métricas vagas**:
   - "500+ personas alcanzadas" (n7 del kusqa.ts)
   - "5 jóvenes nuevos se unieron" (n7 de sampleNotifications)
   - Los números cambian sin patrón. Algunos con "+", algunos exactos.

4. **Emojis sin intención**:
   - 🌱 para "Tu brigada comenzó movimiento" — ¿Por qué? ¿Crecimiento? Pero no es growth, es actividad.
   - 🔥 para "Tu territorio está despierto" — Sí, significa energía, pero es genérico.

5. **Timestamps falsos**:
   - "hace 20 min", "hace 45 min", "hace 2h" — Nunca se actualizan en tiempo real.
   - No hay contexto de cuándo fue el último evento real.

**Impacto emocional**:

- 🤖 **Sientes que un bot escribió esto**. Es texto pulido pero sin alma.
- 😒 Si compartiera KUSQA con amigos, este copy me haría ver mal: "¿Este es un juego de marketing?"
- 💀 **Mata la credibilidad**. Un usuario abre notificaciones y siente publicidad disfrazada.
- 🎪 **Startup vibes**: "Let's make activism feel like Spotify Wrapped!"

### Propuesta concreta

**Opción A: Desactivar notificaciones fake**

```tsx
export const SAMPLE_NOTIFICATIONS: CivicNotification[] = [];
// No muestres notificaciones hasta que tengas eventos reales
```

**Opción B: Notificaciones VERDADERAS** (si hay datos reales)

```ts
// Genera solo desde participantes reales
export async function generateRealNotifications(userId: string): Promise<CivicNotification[]> {
  const userMissions = await getUserMissions(userId);
  const notifications: CivicNotification[] = [];

  // Notificación: Misión en tu distrito
  const myDistrict = await getUserDistrict(userId);
  const nearbyMissions = await getMissionsByDistrict(myDistrict);

  if (nearbyMissions.length > 0) {
    notifications.push({
      id: "n-nearby",
      type: "misión",
      emoji: "📍",
      title: `Misión en ${myDistrict}`,
      body: `${nearbyMissions[0].title} · ${nearbyMissions[0].spotsLeft} cupos disponibles`,
      // Sin números ficticios, solo datos reales
    });
  }

  return notifications;
}
```

**Opción C: Copy HONESTO si debes mostrar samples**

```ts
export const SAMPLE_NOTIFICATIONS: CivicNotification[] = [
  {
    id: "n-sample-1",
    type: "misión",
    emoji: "📍",
    title: "Mural colectivo en Barranco",
    body: "Este es un ejemplo. Cuando participantes reales se unan, verás sus historias aquí.",
    timestamp: "–",
    read: true,
  },
];
```

### Patch exacto

**Archivo**: `src/features/notifications/data/sampleNotifications.ts`

Reemplaza TODO con:

```ts
import type { CivicNotification } from "../types";

/**
 * En producción, las notificaciones deben derivar de:
 * 1. Participantes reales en misiones
 * 2. Badgess desbloqueados por el usuario
 * 3. Eventos en el distrito del usuario
 *
 * NO generamos notificaciones ficticias.
 */

export const SAMPLE_NOTIFICATIONS: CivicNotification[] = [];
// Vacío hasta que tengamos datos reales
```

---

## P1: BADGES — NARRATIVA GENÉRICA SIN VERIFICACIÓN

### 🟡 Problema exacto

**Ubicación**: `src/features/badges/components/BadgeCard.tsx` + `src/constants/gamification.ts`

```ts
export const BADGES: Badge[] = [
  {
    id: "1",
    name: "Primer paso",
    emoji: "🌅",
    region: "todas",
    earned: true,
    description: "Tu primera misión completada",
  },
  {
    id: "2",
    name: "Vecino activo",
    emoji: "🏘️",
    region: "costa",
    earned: true,
    description: "5 misiones en tu distrito",
  },
  {
    id: "3",
    name: "Sembrador",
    emoji: "🌱",
    region: "sierra",
    earned: true,
    description: "Plantaste tu primer árbol",
  },
  {
    id: "4",
    name: "Pez del Itaya",
    emoji: "🐟",
    region: "selva",
    earned: false,
    description: "Misión en la Amazonía",
  },
  {
    id: "5",
    name: "Mentor",
    emoji: "🎓",
    region: "todas",
    earned: true,
    description: "Enseñaste a 10 personas",
  },
  // ...
];
```

**Lo que grita "FAKE"**:

1. **Sin verificación de condiciones**:
   - Badge "Mentor" — dice `earned: true`
   - Pero ¿cómo verificas que "enseñó a 10 personas"? No hay mécanismo de evidencia.
   - El usuario podría tener el badge sin haber hecho nada.

2. **Narrativa simple pero vacía**:
   - "Enseñaste a 10 personas" — ¿Cuáles 10? ¿Nombres? ¿Contexto?
   - "Plantaste tu primer árbol" — Suena bonito, pero es placeholder text.
   - Sin historias reales, sin verificación, sin _momento_ específico.

3. **Emojis sin personalidad**:
   - 🌅 "Primer paso" — ¿Por qué amanecer?
   - 🏘️ "Vecino activo" — OK, es literal, pero sin alma.
   - 📣 "Voz del barrio" — ¿Es este un liderazgo verificado o aspiracional?

4. **"Earned" es bool falso**:

   ```tsx
   earned: true,  // ← ¿Verificado cómo?
   earnedAt: undefined,  // ← Sin timestamp
   ```

   El badge podría ser mentira. No hay prueba.

5. **Narrativas de "todas" las regiones**:
   - "Líder Kusqa" — ¿Quién lo decide? ¿El sistema solo? ¿La comunidad?
   - Los badges nacionales se sienten genéricos.

**Impacto emocional**:

- 🎪 **Sientes que los badges son participation trophies**.
- 😒 Si tuvieras 5 misiones y NO tuvieras "Vecino activo", sospecharías el sistema.
- 💔 Sin historias reales, los badges son emojis vacíos.
- 🚩 ¿Si los badges son fake, qué más es fake?

### Propuesta concreta

**Opción A: Mostrar SOLO badges verificados**

```tsx
export type CivicBadge = {
  id: string;
  name: string;
  emoji: string;
  rarity: BadgeRarity;
  category: BadgeCategory;
  region: Region | "nacional";
  narrative: string;
  unlockCondition: string;
  earned: boolean;
  earnedAt?: string;

  // NUEVO: Evidencia verificable
  verifiedBy?: "system" | "community" | "evidence";
  verificationNote?: string; // e.g. "3 misiones en Barranco registradas"
  verificationDate?: string;
};
```

**Opción B: No mostres badges hasta tener datos**

```tsx
export function BadgeGrid({ badges }: { badges: CivicBadge[] }) {
  const verified = badges.filter((b) => b.earned && b.verifiedBy);

  if (verified.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Tus primeras insignias aparecerán cuando completes misiones verificadas.
        </p>
      </div>
    );
  }

  return <BadgeGrid badges={verified} />;
}
```

**Opción C: Mostrar narrativas REALES**

```tsx
const CIVIC_BADGE_NARRATIVE: Record<BadgeCategory, string> = {
  territorial: "Conecta a personas dentro de tu territorio específico",
  social: "Trae humanidad y apoyo mutuo a las misiones",
  liderazgo: "Inspira a otros a actuar en su comunidad",
  ambiental: "Contribuye a ecosistemas verificables",
  cultural: "Preserva y documenta tradiciones locales",
  fundacional: "Sienta bases para movimiento comunitario duradero",
};

export function BadgeCard({ badge, index = 0, showNarrative = true }: BadgeCardProps) {
  return (
    <motion.div className="...">
      {/* Mostrar narrativa del propósito cívico, no solo gamificación */}
      {showNarrative && (
        <p className="text-xs text-muted-foreground mt-2">
          {CIVIC_BADGE_NARRATIVE[badge.category]}
        </p>
      )}
    </motion.div>
  );
}
```

### Patch exacto

**Archivo**: `src/features/badges/types/index.ts` (línea 30)

Agrega:

```ts
export type CivicBadge = {
  // ... existing fields

  // NUEVO
  verifiedBy?: "system" | "community" | "evidence";
  verificationNote?: string;
  verificationDate?: string;
};
```

**Archivo**: `src/features/badges/components/BadgeCard.tsx` (línea 50)

Agrega después de `{badge.earned && (...)}`:

```tsx
{
  badge.earned && badge.verificationNote && (
    <div className="text-[9px] text-muted-foreground/60 mt-1 italic">
      ✓ {badge.verificationNote}
    </div>
  );
}
```

---

## P1: XP REWARDS — NÚMEROS SIN PROPÓSITO

### 🟡 Problema exacto

**Ubicación**: `src/data/kusqa.ts`

```ts
export const MISSIONS: Mission[] = [
  {
    id: "barranco-mural",
    title: "Mural colectivo en Barranco",
    xp: 320, // ← ¿De dónde?
    participants: 28,
    spotsLeft: 12,
    impact: "24m² de mural · 6 cuadras renovadas", // ← ¿Verificado?
    difficulty: "Suave",
    // ...
  },
  {
    id: "cusco-reforesta",
    title: "Reforestación en el valle sagrado",
    xp: 540, // ← ¿Por qué más XP?
    participants: 64,
    spotsLeft: 4,
    impact: "500 árboles · 1.2 ha restauradas",
    difficulty: "Andina",
  },
];
```

**Lo que grita "FAKE"**:

1. **XP arbitrario**:
   - Mural: 320 XP
   - Reforestación: 540 XP
   - Limpieza río: 680 XP

   ¿Por qué exactamente estos números? ¿Hay una fórmula o fue "se ve bien"?

2. **Correlación confusa con dificultad**:
   - "Suave" = 100-400 XP (según `XP_BY_DIFFICULTY` en `gamification.ts`)
   - Pero algunos "Suave" dan 220, otros 380.
   - ¿Basado en duración? ¿Riesgo? ¿Impacto? No está claro.

3. **Impact claims sin verificación**:
   - "24m² de mural · 6 cuadras renovadas" — ¿Medido cómo?
   - "500 árboles" — ¿Contados después? ¿O estimación?
   - "60 escolares formados" — ¿Test de conocimiento? ¿Solo asistencia?

4. **Inconsistencia de progreso**:

   ```ts
   { level: 1, name: "Caminante", from: 0, to: 500 },          // 500 XP
   { level: 2, name: "Vecino", from: 500, to: 1500 },          // +1000 XP
   { level: 3, name: "Sembrador", from: 1500, to: 3500 },      // +2000 XP
   ```

   Los requerimientos se duplican cada vez. ¿Por qué? ¿Es exponencial o justo "parece balanceado"?

5. **El usuario nunca ve la fórmula**:
   - Si hago una misión de 320 XP, ¿cómo eso se suma a mis 2,304 XP totales?
   - ¿Hay bonus? ¿Streak? ¿Dificultad resuelta vs intentada?

**Impacto emocional**:

- 🎮 **Se siente como videojuego, no activismo**.
- 😒 Los números parecen sacados de una gacha game.
- 🚩 Si los XP son arbitrarios, ¿qué está basado en datos reales?
- 💔 No siento el impacto real. Siento que acumulo puntos en un juego.

### Propuesta concreta

**Opción A: Conecta XP a impacto real**

```ts
export type Mission = {
  // ... existing

  // REEMPLAZAR arbitrario XP con datos verificables
  impactMetric: {
    label: string; // e.g. "Metros cuadrados pintados"
    expectedValue: number; // e.g. 24
    unit: string; // e.g. "m²"
    verificationMethod: "photos" | "gps" | "count" | "report";
  };
};

// XP se calcula DESPUÉS, basado en impacto real verificado
function calculateXpFromImpact(impact: ImpactMetric): number {
  return Math.round(impact.expectedValue * IMPACT_TO_XP_RATIO[impact.unit]);
}
```

**Opción B: Muestra la fórmula transparente**

```tsx
export function MissionCard({ mission }: MissionCardProps) {
  return (
    <div>
      <h3>{mission.title}</h3>

      {/* Mostrar por qué XP es X */}
      <div className="text-xs text-muted-foreground bg-secondary/30 rounded p-2 mt-3">
        <p className="font-semibold mb-1">Cómo se calcula el impacto:</p>
        <ul className="space-y-0.5">
          <li>
            • {mission.impactMetric.expectedValue} {mission.impactMetric.unit}
          </li>
          <li>• Verificado por: {mission.impactMetric.verificationMethod}</li>
          <li>• Suma a tu impacto territorial real</li>
        </ul>
        <p className="mt-2 italic">No es puntos de juego. Es medida de acción real.</p>
      </div>
    </div>
  );
}
```

**Opción C: Elimina XP, muestra solo impacto**

```ts
export type Mission = {
  title: string;
  description: string;

  // ELIMINA: xp: number;

  // REEMPLAZA CON:
  impactClaim: {
    what: string; // "24 metros cuadrados de mural"
    where: string; // "6 cuadras en Barranco"
    verified: boolean; // Después de completar
    verificationDate?: string;
  };
};
```

### Patch exacto

**Archivo**: `src/types/domain.ts` (si existe) o `src/types/index.ts`

Agrega:

```ts
export type ImpactMetric = {
  label: string;
  expectedValue: number;
  unit: string;
  verificationMethod: "photos" | "gps" | "count" | "community_report";
};

export type Mission = {
  // ... existing fields
  // Mantén xp por ahora pero agrega:
  impactMetric: ImpactMetric;
};
```

**Archivo**: `src/data/kusqa.ts` (línea 8)

Actualiza misiones:

```ts
{
  id: "barranco-mural",
  title: "Mural colectivo en Barranco",
  xp: 320,
  // Nuevo:
  impactMetric: {
    label: "Metros cuadrados de mural",
    expectedValue: 24,
    unit: "m²",
    verificationMethod: "photos",
  },
  // ... rest
}
```

---

## P1: DISTRICT LEADERBOARD — COMPETENCIA SIN PROPÓSITO

### 🟡 Problema exacto

**Ubicación**: `src/features/community/components/DistrictLeaderboard.tsx`

El componente no existe explícitamente en el codebase listado, pero está referenciado. Sin embargo, el concepto está en:

- `src/features/community/constants/districtActivity.ts` — Ranking por `activeCount` y `energyScore`

```ts
const DISTRICT_ACTIVITIES = [
  { id: "cusco-valle", name: "Urubamba (Valle Sagrado)", activeCount: 34, energyScore: 94 }, // #1
  { id: "sjl", name: "San Juan de Lurigancho", activeCount: 45, energyScore: 92 }, // #2
  { id: "barranco", name: "Barranco", activeCount: 28, energyScore: 88 }, // #3
  // ...
];
```

**Lo que grita "FAKE"**:

1. **Ranking sin contexto**:
   - ¿San Juan de Lurigancho está "ganando" a Urubamba?
   - ¿Por qué importa?
   - ¿Ganamos qué? ¿Dinero? ¿Validación?

2. **"Energy Score" es un número mágico**:
   - 94 en Urubamba, 92 en SJL...
   - ¿De dónde? Si lees el código: `energyScore: Math.min(100, dm.length * 25)`
   - Entonces es solo `num_missions * 25` capped a 100.
   - **Eso NO mide energía comunitaria. Mide cantidad de misiones.**

3. **Sin comparación real**:
   - ¿Urubamba realmente es más activo que SJL?
   - Urubamba: 34 activos en 5 misiones = 6.8 por misión
   - SJL: 45 activos en 6 misiones = 7.5 por misión
   - **SJL es más eficiente, pero Urubamba "gana".**

4. **Gamification tóxica**:
   - Mostrar rankings incentiva competencia, no cooperación.
   - Los distritos pobres con menos acceso tendrán lower scores.
   - Esto refuerza inequidad comunitaria.

**Impacto emocional**:

- 🏆 Si eres de un distrito "bajo ranking", te sientes no valorizado.
- 🤝 KUSQA debería ser sobre comunidad, no competencia.
- 🎪 Los rankings se sienten como gamificación superficial.
- 💀 Esto mata la sensación de movimiento colectivo realmente unido.

### Propuesta concreta

**Opción A: Elimina leaderboard**

```tsx
// Simplemente no muestres ranking
export function CommunityPulse() {
  // Mostrar distritos activos, SIN ranking
  // "Distritos con movimiento ahora" en lugar de "Distritos ganadores"
}
```

**Opción B: Mostrar cooperación en lugar de competencia**

```ts
export interface DistrictActivity {
  // ... existing

  // En lugar de "energyScore" que compite:
  cooperativeMetric: {
    missionsConnected: number; // Cuántas misiones conectan con otros distritos
    supportingOtherDistricts: number; // "Reforestación en Cusco" apoyada por Lima
    crossDistrictCollaborations: number;
  };
}
```

**Opción C: Mostrar tendencias, no rankings**

```tsx
export function CommunityPulse() {
  return (
    <div>
      <h3>Movimientos recientes</h3>

      {/* En lugar de ranking, mostrar narrativa temporal */}
      <div className="space-y-2">
        <p>
          🌱 <strong>Sierra</strong> completó 1,200 árboles replantados esta semana
        </p>
        <p>
          🎨 <strong>Lima</strong> conectó 5 brigadas de arte comunitario
        </p>
        <p>
          🛶 <strong>Amazonia</strong> documentó 10kg de microplásticos retirados
        </p>
      </div>

      <p className="text-xs text-muted-foreground mt-4 italic">
        No hay competencia. Cada territorio tiene su propio ritmo.
      </p>
    </div>
  );
}
```

### Patch exacto

**Archivo**: `src/features/community/components/CommunityPulse.tsx` (línea 154)

Reemplaza:

```tsx
// Sort districts by energyScore/activeCount to show the most active ones first
const sortedDistricts = [...districts]
  .sort((a, b) => b.energyScore - a.energyScore) // ← RANKING NOCIVO
  .slice(0, limit);
```

Con:

```tsx
// Mostrar distritos sin ranking competitivo
const sortedDistricts = [...districts]
  .filter((d) => d.activeCount > 0) // Solo con actividad real
  .slice(0, limit); // Primer N, no "los ganadores"
```

---

## P1: CIVIC TRUST BADGE — ASPIRACIONAL PERO SIN VERIFICACIÓN

### 🟡 Problema exacto

**Ubicación**: `src/features/community/components/CivicTrustBadge.tsx`

```ts
export type CivicTrustStatus =
  | "semilla"      // Seed
  | "explorador"   // Explorer
  | "guardian"     // Guardian
  | "tejedor"      // Weaver
  | "lider";       // Leader

const TRUST_META: Record<CivicTrustStatus, { ... }> = {
  semilla: {
    label: "Semilla comunitaria",
    description: "Primeros pasos verificados en tu territorio",
    // ...
  },
  lider: {
    label: "Líder de impacto",
    description: "Liderazgo comunitario reconocido",
  },
};
```

**Función**: `deriveCivicTrust`

```tsx
const trustStatus = deriveCivicTrust({
  missionsDone: user.missionsDone || 0,
  // ... otros params
});
```

**Lo que grita "FAKE"**:

1. **"Reconocido" ¿por quién?**:
   - "Liderazgo comunitario reconocido" — reconocido por el algoritmo o la comunidad?
   - Si es comunidad, ¿dónde está la votación? ¿El feedback?
   - Si es el algoritmo, es certificación falsa.

2. **Narrativas genéricas**:
   - "Semilla comunitaria" — Bonito, pero vacío.
   - "Tejedor comunitario" — Suena lírico, pero ¿qué significa conectar?
   - Sin ejemplos específicos: "Conectaste X proyecto con Y grupo en Z barrio".

3. **Sin sistema de desbloqueo transparente**:
   - ¿Cómo pasar de "Semilla" a "Explorador"?
   - ¿Es automático (X misiones)? ¿Votación? ¿Aplicación?

4. **Colores bonitos pero vacíos**:
   - Emerald para semilla, Sky para explorador, Purple para guardian...
   - Se ve bien, pero no significa nada sin definición clara.

**Impacto emocional**:

- 🎭 **Te sientes como un personaje de RPG, no un activista real**.
- 😒 Si vieras a alguien con "Líder de impacto", no sabrías qué hizo realmente.
- 💔 Las narrativas poéticas esconden falta de sistema real.
- 🚩 "Reconocido" pero sin verificación real.

### Propuesta concreta

**Opción A: Elimina Trust Badges hasta tener sistema de verificación**

```tsx
export function CivicTrustBadge() {
  return null; // O mostrar estado vacío honesto
}
```

**Opción B: Mostrar SOLO lo que el usuario hizo, sin etiqueta**

```tsx
export function CivicProfileSummary({ user }: { user: User }) {
  return (
    <div className="space-y-2 text-sm">
      <p>✓ {user.missionsDone} misiones completadas</p>
      <p>
        ✓ Activo en {user.activeRegions.length} región{user.activeRegions.length !== 1 ? "es" : ""}
      </p>
      <p>✓ Desde {new Date(user.joinedAt).toLocaleDateString("es-PE")}</p>

      {/* Sin etiqueta de "Tejedor" — son hechos, no títulos */}
    </div>
  );
}
```

**Opción C: Mostrar sistemas reales de reconocimiento**

```ts
export interface CivicRecognition {
  type: "peer_nomination" | "community_vote" | "impact_verified";
  from?: string; // Quién nominó
  reason: string; // Por qué exactamente
  date: string;
  canVote?: boolean; // Si el usuario puede confirmar
}

export interface User {
  // ... existing
  recognitions: CivicRecognition[];
}
```

### Patch exacto

**Archivo**: `src/features/community/components/CivicTrustBadge.tsx` (línea 1)

Reemplaza toda la función `deriveCivicTrust` con:

```ts
/**
 * DEPRECATED: Civic Trust Badges sin verificación comunitaria real.
 *
 * Por ahora, mostrar solo historial de acciones verificadas.
 * Cuando implementemos votación comunitaria, reacticar este sistema.
 */
export function deriveCivicTrust(profile: any) {
  return null; // No usemos etiquetas sin verificación
}
```

---

## P1: EMPTY STATES — PLACEHOLDERS GENÉRICOS

### 🟡 Problema exacto

**Ubicación**: Varios componentes (AppShell, Dashboard, etc.)

**Lo que probablemente ves**:

- Cargando... (spinner)
- "No hay misiones aún" (genérico)
- "Completa tu perfil" (instrucción vacía)

**Lo que se siente fake**:

1. **Mensajes corporativos**:
   - "Cargando..." — Demasiado técnico para UX.
   - "No hay datos disponibles" — Habla como banco, no comunidad.

2. **Sin orientación humana**:
   - "Completa tu perfil" — ¿Qué falta? ¿Por qué importa?
   - Sin pasos claros, solo orden.

3. **Sin contexto emocional**:
   - Los empty states deberían ser invitaciones, no errores.

**Impacto emocional**:

- 😒 Sientes que el producto no te invita, te ordena.
- 💀 Empty states matan momentum.

### Propuesta concreta

Reemplaza empty states genéricos con:

```tsx
export function EmptyMissions() {
  return (
    <div className="text-center py-12">
      <div className="h-16 w-16 rounded-lg bg-secondary mx-auto mb-4 flex items-center justify-center text-2xl">
        🗺️
      </div>
      <h3 className="font-semibold text-foreground mb-1">Tu primer movimiento espera</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Cuando explores misiones en tu barrio, sus historias aparecerán aquí.
      </p>
      <button className="...">Explorar misiones cerca</button>
    </div>
  );
}
```

---

## P2: STORYTELLING COPY — POÉTICO PERO HUECO

### 🟠 Problema exacto

**Ubicación**: Múltiples lugares (`kusqa.ts`, `sampleNotifications.ts`, componentes)

**Copy poético que grita AI/Marketing**:

- "El litoral respira"
- "La sierra espera a sus guardianes"
- "Tu territorio está despierto"
- "Trae ropa que puedas manchar y muchas ganas de crear"

**Lo que se siente fake**:

1. **Demasiado liter, poco especifico**: No hay detalles que demuestren conocimiento real del territorio
2. **Copy compartido**: Podría ser cualquier app de "impacto social"
3. **Emociones forzadas**: "La sierra espera" es presión emocional artificial

**Impacto emocional**:

- 🤖 Sientes que marketers escribieron esto
- 😒 No confías en el producto si te vende aspiración en lugar de realidad

### Propuesta concreta

**Reemplaza copy poético con hechos reales**:

```ts
{
  id: "barranco-mural",
  title: "Mural colectivo en Barranco",
  description: "Pintaremos un mural en la fachada de la Casa Alianza. Necesitamos 12-15 personas para 6 horas de trabajo. Trae ropa vieja.",  // ← Real, específico

  // Reemplaza storytelling con datos:
  location: {
    address: "Casa Alianza, Av. Grau 1050, Barranco",
    coordinates: { lat: -12.1492, lng: -77.0222 },
    accessibility: "Acceso a nivel de calle",
  },

  impact: {
    what: "1 fachada de 24m² renovada",
    howMeasured: "Foto antes/después + permiso municipal",
  },
}
```

---

## P2: AVATAR SYSTEM — EMOJIS SIN PERSONALIDAD

### 🟠 Problema exacto

**Ubicación**: `src/services/userRepository.ts` + `src/features/map/components/CivicActivityFeed.tsx`

```ts
// En CivicActivityFeed
const AVATARS = ["🦊", "🦦", "🦉", "🦙", "🎨", "🌿", "🌊", "🛶", "💻", "⛰️", "🍲"];

// En userRepository
return {
  // ... user data
  avatar: "🦙", // ← Hardcoded llama para TODOS
};
```

**Lo que grita "FAKE"**:

1. **Emojis genéricos sin elección**:
   - Los usuarios no eligieron su avatar
   - No hay conexión personal

2. **Sin correlación con identidad**:
   - Un usuario que hace reforestación tiene 🦙 (llama)
   - ¿Por qué? ¿Porque es Andes? Pero también existe en Selva y Costa.

3. **Random en activity feed**:
   - Ves a "Sayri" con 🦊 una vez, 🦉 otra vez
   - Sin consistencia = sin identidad real

**Impacto emocional**:

- 🤖 Te sientes como un número, no una persona
- 😒 Los avatares no tienen significado

### Propuesta concreta

**Opción A: Dejar que usuarios suban fotos reales**

```tsx
export type UserProfile = {
  avatar: {
    type: "photo" | "initial" | "generated";
    value: string; // URL o inicia
  };
};
```

**Opción B: Usar iniciales + color**

```tsx
export function UserAvatar({ user }: { user: User }) {
  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const colorHash = hashColor(user.id);

  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
      style={{ backgroundColor: colorHash }}
    >
      {initials}
    </div>
  );
}
```

---

## P2: TIMESTAMPS — "HACE X MIN" SIN CONTEXTO

### 🟠 Problema exacto

**Ubicación**: Múltiples componentes que usan `formatRelativeDate`

```ts
timestamp: "hace 20 min",
timestamp: "hace 5 min",
timestamp: "Hace unos instantes",
```

**Lo que grita "FAKE"**:

1. **Nunca se actualiza en real time**: "Hace 20 min" será falso después de 5 minutos
2. **Sin contexto de zona horaria**: ¿A qué hora del Perú?
3. **Sin contexto de fecha**: Si fue "hace 3 días", ¿fue martes o viernes?

**Impacto emocional**:

- 😒 Los timestamps falsos destruyen sensación de "en vivo"

### Propuesta concreta

```tsx
function formatTimestamp(date: Date, userTZ?: string): string {
  // En lugar de "hace 20 min", mostrar:
  // "Sáb 14 jun · 9:34 AM" (si es hoy)
  // "Jueves, 12 de junio" (si es pasada semana)

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) {
    // Hoy: mostrar hora
    return date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  } else if (daysDiff === 1) {
    return "Ayer";
  } else if (daysDiff < 7) {
    return `Hace ${daysDiff} días`;
  } else {
    return date.toLocaleDateString("es-PE", { weekday: "short", month: "short", day: "numeric" });
  }
}
```

---

## P2: PROGRESSION SYSTEM — NARRATIVAS GENÉRICAS

### 🟠 Problema exacto

**Ubicación**: `src/features/progression/components/StageCard.tsx`

```ts
export const LEVELS: Level[] = [
  { level: 1, name: "Caminante", from: 0, to: 500, region: "costa" },
  { level: 2, name: "Vecino", name2: "del litoral", from: 500, to: 1500, region: "costa" },
  { level: 3, name: "Sembrador", from: 1500, to: 3500, region: "sierra" },
  // ...
];
```

**Lo que grita "FAKE"**:

1. **Sin historias verificables**:
   - ¿Qué hizo un "Caminante" para serlo?
   - ¿Y un "Sembrador"? ¿Literalmente plantó árboles, o es solo XP?

2. **Nombres territoriales sin correlación**:
   - "Vecino del litoral" — suena bonito, pero es genérico
   - Si cumplo 1500 XP en una misión de código en Lima, ¿soy "Vecino"? ¿Qué tiene que ver?

3. **Narrativas del componente demasiado genéricas**:

   ```ts
   narrative: "Recorres las primeras rutas del territorio";
   ```

   Sin detalles específicos de qué ruta, dónde, con quién.

**Impacto emocional**:

- 🎮 Sientes que juegas un RPG, no que impactas comunidad real

### Propuesta concreta

**Reemplaza con narrativas de impacto real**:

```ts
export const LEVELS: Level[] = [
  {
    level: 1,
    name: "Primer contacto",
    description: "Completaste tu primera misión verificada",
    narrative: "Tu primer acto de impacto comunitario fue registrado. Eres parte del movimiento.",
    from: 0,
    to: 500,
    // Nuevo:
    relatedMissions: ["barranco-mural", "miraflores-mayores"],
  },
  {
    level: 2,
    name: "Tejedor local",
    description: "Participaste en 5 misiones, conectando personas en tu territorio",
    narrative: "Has demostrado compromiso sostenido con tu barrio. La comunidad te reconoce.",
    from: 500,
    to: 1500,
    relatedMissions: ["..."], // Específico por usuario
  },
];
```

---

## SÍNTESIS DE PATCHES RECOMENDADOS

### ORDEN DE PRIORIDAD PARA ARREGLAR

#### **IMMEDIATE (P0)**

1. **Desactivar CivicActivityFeed** (`src/features/map/components/CivicActivityFeed.tsx`)
   - La simulación es demasiado obvia
   - Reemplazar con empty state honesto

2. **Desactivar MOCK_COMMUNITY_PULSE fallback** (`src/features/community/components/CommunityPulse.tsx`)
   - Las métricas inventadas destruyen credibilidad
   - Solo mostrar datos derivados de misiones reales

3. **Desactivar SAMPLE_NOTIFICATIONS** (`src/features/notifications/data/sampleNotifications.ts`)
   - El copy poético sin datos reales es fake
   - Hacer array vacío o eliminar

#### **HIGH (P1)**

4. **Badges**: Agrega campo `verifiedBy` para mostrar solo badges con evidencia

5. **Community Leaderboard**: Eliminar ranking, mostrar solo "Distritos con movimiento"

6. **Civic Trust Badges**: Desactivar hasta tener sistema real de votación comunitaria

#### **MEDIUM (P2)**

7. **Copy poético**: Reemplazar con hechos específicos y verificables

8. **Avatars**: Cambiar de emoji random a iniciales + color

9. **Timestamps**: Cambiar "hace X min" a formato fecha real

10. **Progression narrative**: Conectar con acciones reales, no genérico

---

## RECOMENDACIÓN FINAL

**KUSQA vive en la ficción porque aún no tiene datos reales.**

La solución no es "hacer la ficción más creíble". Es:

1. **Ser honesto sobre el status**
   - La app es un prototipo de concepto
   - La comunidad no existe aún
   - Mostrar un CTA claro: "Sé uno de los primeros en crear movimiento"

2. **Esconder lo fake, mostrar lo real**
   - Si hay 2 misiones reales de Supabase, muéstralas
   - Si no hay participantes reales, no simules usuarios
   - El vacío es mejor que la mentira

3. **Construir desde lo real hacia adelante**
   - Cuando un usuario real se une, su actividad es real
   - Sus badges son verificados
   - Su impacto es medible

**El incanny valley de KUSQA es que se siente como un producto vivo, pero la vida es simulada.**

**Fix**: Para de simular. Espera. Construye.

---

## CHECKLIST DE IMPLEMENTACIÓN

```
IMMEDIATE (Próximos 2 días):
- [ ] Eliminar `CivicActivityFeed` simulación
- [ ] Eliminar `SAMPLE_NOTIFICATIONS` fallback
- [ ] Eliminar `MOCK_COMMUNITY_PULSE.totalActiveToday` | `.activeDistrictsCount` | `.recentImpactDescription`
- [ ] Agregar `verificationNote` a Badges

HIGH (Próximos 5 días):
- [ ] Remover leaderboard ranking
- [ ] Desactivar deriveCivicTrust
- [ ] Actualizar copy con hechos específicos

MEDIUM (Próximos 2 semanas):
- [ ] Cambiar avatar system
- [ ] Actualizar timestamp formatting
- [ ] Revisar todas las narrativas vs. datos reales
```

---

**Auditoría completada**: May 2026

**Crítico**: Esto no es feedback visual genérico. Son problemas de integridad de datos que destruyen confianza.
