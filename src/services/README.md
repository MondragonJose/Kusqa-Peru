# Services Layer - Supabase Integration

## Arquitectura

```
┌─────────────────────────────────────────┐
│      React Components (routes/)         │
│   app.index.tsx, app.mapa.tsx, etc.    │
└─────────────────┬───────────────────────┘
                  │ importan & llaman
┌─────────────────▼───────────────────────┐
│      Services (services/*)              │
│  getMissions(), getUserMissions(), etc. │
└─────────────────┬───────────────────────┘
                  │ usan
┌─────────────────▼───────────────────────┐
│  Supabase Client (lib/supabase.ts)      │
│      + Env Validation (lib/env.ts)      │
└─────────────────┬───────────────────────┘
                  │ accesa
┌─────────────────▼───────────────────────┐
│   Supabase Backend (BD en cloud)        │
│  missions, profiles, mission_participants│
└─────────────────────────────────────────┘
```

## Cómo Funciona

### 1. Flujo de Datos

```typescript
// En un componente (app.index.tsx):
const missions = await getMissions();  // ← Service function

// Service (services/missions.ts):
export async function getMissions() {
  const { data, error } = await supabase
    .from("missions")
    .select("*");              // ← Query a BD
  
  return data.map(transformMissionRow);  // ← Transform a tipos de dominio
}
```

### 2. Transformación de Datos

Las funciones `transformMissionRow()` mapean datos crudos de Supabase → tipos de dominio:

```typescript
// Raw desde BD (MissionRow):
{
  id: "123",
  title: "Limpiar parque",
  region: "costa",
  // ... etc
}

// Transformado a tipo de dominio (Mission):
{
  id: "123",
  title: "Limpiar parque",
  region: "costa",  // ← Validado
  organizer: { /* ... */ },
  // ... etc
}
```

## Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `src/lib/supabase.ts` | Cliente inicializado de Supabase |
| `src/lib/env.ts` | Validación de env vars con Zod |
| `src/services/missions.ts` | Lógica de negocio: getMissions, createMission, etc. |
| `src/types/supabase.ts` | Tipos raw (MissionRow, ProfileRow, etc.) |
| `src/types/domain.ts` | Tipos de dominio (Mission, Profile, etc.) |
| `src/utils/debug-supabase.ts` | Herramienta para testing de conexión |

## Debugging

### Test de Conexión

Importa en un componente temporalmente:

```typescript
import { debugSupabase } from "@/utils/debug-supabase";

useEffect(() => {
  debugSupabase();  // Ejecuta todos los tests
}, []);
```

Output esperado:

```
🔍 SUPABASE DEBUG REPORT
==================================================
✅ SUCCESS Connection
   Supabase client initialized

✅ SUCCESS Read Missions
   Retrieved 15 missions

✅ SUCCESS Read Profiles
   Retrieved 3 profiles

==================================================
✅ ALL TESTS PASSED
```

### Inspeccionar Tabla

```typescript
import { inspectTable } from "@/utils/debug-supabase";

inspectTable("missions");  // Muestra estructura de tabla
```

## Próximos Pasos

### Phase 3a - Completar Services
- [ ] Refactorizar `services/users.ts` para usar Supabase
- [ ] Refactorizar `services/notifications.ts`
- [ ] Refactorizar `services/gamification.ts`
- [ ] Agregar manejo de errores consistente

### Phase 3b - Autenticación
- [ ] Implementar `services/auth.ts` (login, signup, logout)
- [ ] Configurar RLS (Row Level Security) en BD
- [ ] Integrar con Redux/Context para auth state

### Phase 4 - React Query
- [ ] Envolver services en React Query hooks
- [ ] Caching automático
- [ ] Refetch automático
- [ ] Error/loading states

### Phase 5 - Real-time
- [ ] Supabase Realtime para misiones en vivo
- [ ] WebSockets para notificaciones
- [ ] Actualización automática de UI

## Manejo de Errores

Todos los services siguen patrón consistente:

```typescript
export async function getMissions(): Promise<Mission[]> {
  try {
    console.log("[services/missions] Fetching...");
    
    const { data, error } = await supabase
      .from("missions")
      .select("*");
    
    if (error) {
      console.error("[services/missions] Supabase error:", error);
      throw new Error(`Failed to fetch missions: ${error.message}`);
    }
    
    return data.map(transformMissionRow);
  } catch (error) {
    console.error("[services/missions] Exception:", error);
    throw error;  // Propagar al componente
  }
}
```

**En componentes:**

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  (async () => {
    try {
      setLoading(true);
      const missions = await getMissions();
      setMissions(missions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  })();
}, []);

if (loading) return <div>Cargando...</div>;
if (error) return <div>Error: {error}</div>;
return <div>{/* render missions */}</div>;
```

## Variables de Entorno

### Requeridas

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
```

### Validación

Se validan automáticamente en `src/lib/env.ts` usando Zod.

Si faltan, la app tira error antes de renderizar.

## Testing

Cada service puede ser testeado en aislamiento usando Vitest:

```typescript
// services/missions.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getMissions } from './missions';

describe('getMissions', () => {
  it('should return array of missions', async () => {
    const missions = await getMissions();
    expect(Array.isArray(missions)).toBe(true);
  });
});
```

## Próxima Revisión

Después de verificar que:
1. ✅ Conexión a Supabase funciona (usar `debugSupabase()`)
2. ✅ `getMissions()` retorna datos reales
3. ✅ Build compila sin errores
4. ✅ App funciona igual pero con datos reales

Pasar a:
- Refactorizar otros services
- Implementar auth
- Configurar React Query
