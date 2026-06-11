# Auditoría Técnica Profunda: useCurrentUser() y Consumidores

---

## Parte 1: Matriz de Estados Real vs Interpretado

### Tabla Completa: Cómo cada estado es visto por capa

| Estado Real                              | Duración | useCurrentUser | React Query     | Consumidor Típico             | Riesgo |
| ---------------------------------------- | -------- | -------------- | --------------- | ----------------------------- | ------ |
| **App Boot (AuthProvider loading)**      | 50-300ms | null           | loading         | "No autenticado" → redirige   | 🔴     |
| **Session restaurado (localStorage OK)** | ~100ms   | null→User      | loading→success | Transición segura             | ✅     |
| **Red OK, user query OK**                | ~200ms   | null→User      | loading→success | Renderiza normal              | ✅     |
| **Red timeout (5s)**                     | 5000ms   | null           | error           | "Permanente no auth"          | 🔴     |
| **Autenticado normal**                   | Forever  | User           | success         | Renderiza app                 | ✅     |
| **Logout triggers**                      | ~100ms   | User→null      | success         | Redirige a /                  | ✅     |
| **Token expira**                         | ~50ms    | User           | [re-query]      | Podría ser null temporalmente | 🟡     |
| **User profile update**                  | ~500ms   | null→User      | loading→success | Flicker posible               | 🟡     |

---

## Parte 2: Consumidores Mapeados Completamente

### AppShell.tsx (LÍNEAS 25-36)

```typescript
const currentUser = useCurrentUser();

if (!currentUser) {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin" />
      <p className="text-muted-foreground">Cargando tu perfil...</p>
    </div>
  );
}
```

**Análisis:**

- ✓ Tiene fallback
- ✗ Fallback no diferencia: ¿loading? ¿error? ¿no auth?
- ✗ Si error permanente → usuario atrapado en spinner forever
- **Riesgo:** MEDIO — Fallback existe pero UX pobre en error

**Escenarios:**

1. Red falla → null → spinner (correcto)
2. Red falla ↔ 5s → retry: false → null forever → spinner forever (incorrecto)
3. User no autenticado → null → spinner (debería ser redirigir a / en AppProvider)

---

### app.perfil.tsx (LÍNEA 241)

```typescript
<p className="text-sm text-muted-foreground">
  {user.peopleImpacted.toLocaleString()}
</p>
```

**Análisis:**

- ✗ Acceso directo a `user` sin null check
- ✗ Acceso directo a `user.peopleImpacted` — si undefined → crash
- ✗ No hay tipo guard

**Riesgo:** 🔴 CRÍTICO — Garantía de crash si `peopleImpacted` undefined

**Escenarios:**

1. Profile query retorna `{ ...user, peopleImpacted: undefined }` → crash
2. Profile query en progreso → `user` null → crash
3. Error en profile query → `user` null → crash

---

### app.index.tsx (LÍNEAS 290-410)

#### ComponenteA: Hero section

```typescript
const { progressPct } = useUserXpProgress();  // Uses currentUser internally
return (
  <div>
    <h1>{progressPct}%</h1>  // OK si null
  </div>
);
```

**Riesgo:** BAJO — Hook maneja internamente

#### ComponenteB: Actividad en territorio

```typescript
{userActivity.map(activity => (...))}
```

**Riesgo:** LOW — Data-driven, no acceso a user

#### ComponenteC: Cerca de ti

```typescript
const nearbyMissions = useMissionsNearUser(currentUser);
return <MissionCards missions={nearbyMissions} />;
```

**Riesgo:** MEDIO — Si `currentUser=null`, hook podría retornar [] o error

---

### app.crear.tsx (LÍNEAS 40-150)

```typescript
const user = useCurrentUser();

useEffect(() => {
  if (!user) return;
  validateUserCanCreateMission(user);
}, [user]);

const handleSubmit = (form) => {
  mutate({ userId: user!.id, ...form }); // ← Non-null assertion dangerous
};
```

**Análisis:**

- ✓ Guard en useEffect
- ✗ Non-null assertion (`user!.id`) — si user = null en submit → crash
- ✗ State race: user es null durante transición

**Riesgo:** MEDIO — Race condition posible en submit

---

### app.notificaciones.tsx (LÍNEAS 50-80)

```typescript
export function NotificationsPage() {
  const user = useCurrentUser();

  return (
    <NotificationsList user={user} />
  );
}

function NotificationsList({ user }: { user: User | null }) {
  // Si user=null, no renderiza
}
```

**Análisis:**

- ✓ Prop passed
- ✗ Componente hijo no maneja null explícitamente
- ✗ Podría UI flicker durante transición

**Riesgo:** MEDIO — Flicker posible, pero sin crash

---

### app.mapa.tsx (LÍNEAS 180-200)

```typescript
const user = useCurrentUser();

useCallback(() => {
  if (!user) return;
  fetchMissionsNear(user.location);
}, [user]);
```

**Análisis:**

- ✓ Guard presente
- ✓ Callback defensive
- ✓ Safe

**Riesgo:** BAJO — Bien diseñado

---

### app.mision.$missionId.tsx (LÍNEAS 120-200)

```typescript
const user = useCurrentUser();
const missionId = useParams().missionId;

useEffect(() => {
  if (!user) return; // Guard
  prefetchUserMissionState(missionId, user.id);
}, [user, missionId]);
```

**Análisis:**

- ✓ Guard
- ✓ Dependencies correcto

**Riesgo:** BAJO — Bien manejado

---

### app.progreso.tsx (LÍNEAS 30-120)

```typescript
const user = useCurrentUser();

return (
  <div>
    <ProgressChart userId={user?.id} />  // OK
    <MissionTimeline user={user} />       // OK si user null
  </div>
);
```

**Análisis:**

- ✓ Optional chaining
- ✓ Defensive

**Riesgo:** BAJO

---

## Parte 3: useCurrentUser() Internals

### Código Actual

```typescript
export function useCurrentUser(): User | null {
  const { data: user } = useQuery({
    ...userCurrentQueryOptions(),
    retry: false, // ← PROBLEMA: Sin retry
  });

  return user ?? null;
}

export function useIsAuthenticated(): boolean {
  const { data: userId, isSuccess } = useQuery({
    ...userSessionQueryOptions(),
  });

  return isSuccess && !!userId;
}
```

### Problemas Identificados

1. **No hay retry**
   - Error → permanente null
   - Usuario en mobile con mala conexión queda atrapado
   - No hay forma de recuperarse

2. **useIsAuthenticated() existe pero no es usado**
   - Retorna booleano (ambiguo: ¿fue chequeado o asume?)
   - No diferencia loading vs error

3. **Retorna `User | null`**
   - Imposible distinguir: ¿cargando? ¿error? ¿no auth?

---

## Parte 4: Timeline de Bugs Potenciales

### Escenario A: Mobile con Red Intermitente (CRÍTICO)

```
T=0ms:   App monta
T=50ms:  AuthProvider loading=true → state="initializing" ✓
T=100ms: useCurrentUser() query inicia
T=150ms: Red se corta
T=5000ms: Query timeout → error
T=5001ms: useCurrentUser() = null
T=5002ms: AppShell ve null → "No auth" → podría redirigir ❌

Usuario experience: Pantalla blanca o redirect loop
```

### Escenario B: Crash en Perfil (CRÍTICO)

```
T=0ms:   Usuario navega a /app/perfil
T=100ms: useCurrentUser() retorna { ...user }
T=150ms: Profile query inicia (más datos)
T=200ms: Main query OK pero profile query lento
T=300ms: app.perfil.tsx renderiza con user.peopleImpacted = undefined
T=301ms: .toLocaleString() → CRASH ❌

User experience: Pantalla blanca / crash report
```

### Escenario C: State Machine Misalignment (HIGH)

```
T=0ms:   App boot
T=100ms: AuthProvider state="initializing", session still loading
T=110ms: useCurrentUser() = null
T=120ms: /app route comprueba useAuthState() → state="initializing"
         ✓ Espera spinner
T=150ms: Pero useCurrentUser() = null
         Consumidor intenta renderizar sin datos → crash
T=200ms: AuthProvider loading=false, state="authenticated"
         useCurrentUser() = User (finally)
         Ya es muy tarde, crash ya ocurrió ❌
```

---

## Parte 5: Matriz de Riesgos por Consumidor

| Consumidor               | Riesgo     | Causa                           | Mitigación                     |
| ------------------------ | ---------- | ------------------------------- | ------------------------------ |
| AppShell                 | MEDIO      | No differencia error vs loading | Error boundary                 |
| app.perfil.tsx (L241)    | 🔴 CRÍTICO | Acceso sin guard                | Type guard + optional chaining |
| app.index.tsx            | BAJO       | Guards defensivos presentes     | ✅ OK                          |
| app.crear.tsx            | MEDIO      | Non-null assertion en submit    | Null check antes               |
| app.notificaciones.tsx   | MEDIO      | No maneja null explícito        | Componente defensivo           |
| app.mapa.tsx             | BAJO       | Guard + callback                | ✅ OK                          |
| app.mision.$misionId.tsx | BAJO       | Guard presente                  | ✅ OK                          |
| app.progreso.tsx         | BAJO       | Optional chaining               | ✅ OK                          |
| useCurrentUser hook      | 🔴 CRÍTICO | No retry → error permanente     | Retry: 1 mínimo                |

---

## Parte 6: Recomendaciones Inmediatas

### Parche 1: Agregar retry

```typescript
retry: 1 as const; // En lugar de retry: false
```

**Impacto:** Tolera 1 fallo, intenta de nuevo  
**Tiempo:** 5 minutos

### Parche 2: Error boundary en AppShell

```typescript
<ErrorBoundary fallback={<ErrorState />}>
  <AppShell>...</AppShell>
</ErrorBoundary>
```

**Impacto:** Catch crashés no capturados  
**Tiempo:** 15 minutos

### Parche 3: Fix app.perfil.tsx L241

```typescript
{
  user?.peopleImpacted?.toLocaleString() ?? "N/A";
}
```

**Impacto:** Elimina crash garantizado  
**Tiempo:** 5 minutos

---

## ✅ Checklist Pre-Beta

- [ ] Verificar que retry: 1 esté activo
- [ ] Verificar que app.perfil.tsx L241 tiene guard
- [ ] Verificar que AppShell tiene error boundary
- [ ] Verificar que app.crear.tsx no usa non-null assertion en event handlers
- [ ] Testing en red lenta (throttle a 2G en DevTools)
- [ ] Testing con localStorage vacío (cold start)
- [ ] Testing con profile query forzada a timeout
