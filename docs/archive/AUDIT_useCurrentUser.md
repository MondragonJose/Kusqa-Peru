# Auditoría de useCurrentUser() y Consumidores

## Análisis de Deuda Técnica Post-State Machine

---

## 1. MATRIZ DE ESTADOS REAL VS IMPLÍCITO

### Estado Real del Sistema

| Componente           | Estado Actual                                                   | Cómo lo Expone                    |
| -------------------- | --------------------------------------------------------------- | --------------------------------- |
| **AuthProvider**     | `state: "initializing" \| "authenticated" \| "unauthenticated"` | `useAuthState()` con tipos claros |
| **Supabase Session** | `session: Session \| null`                                      | En `useAuth()` (deprecated)       |
| **React Query**      | `data \| undefined`, `isLoading`, `isError`, `error`            | En `useQuery()`                   |
| **useCurrentUser()** | ??? (retorna `User \| null` únicamente)                         | **AMBIGUO**                       |

### Problemas de Mapeo

```
QUERY STATE              →  useCurrentUser()    →  Consumidor ve
==========================================================
isLoading: true          →  null               →  "No hay usuario"
isError: true            →  null               →  "No hay usuario"
data: undefined          →  null               →  "No hay usuario"
data: User              →  User               →  "Usuario autenticado"
data: null (403)        →  null               →  "No hay usuario" ❌

↑ IMPOSIBLE DIFERENCIAR ENTRE ESTOS 4 CASOS
```

### Matriz Detallada

| Caso                       | Estado Real                         | loading | user       | isError | useCurrentUser() | Consumidor Interpreta | Comportamiento Real        | Riesgo                                |
| -------------------------- | ----------------------------------- | ------- | ---------- | ------- | ---------------- | --------------------- | -------------------------- | ------------------------------------- |
| **A. Inicializando**       | AuthProvider bootstrap              | true    | null       | false   | null             | "No autenticado"      | Muestra spinner            | ALTO - Puede redirigir prematuramente |
| **B. Usuario autenticado** | Session válida, profile existe      | false   | User       | false   | User             | "Autenticado" ✓       | Renderiza app              | ✅ OK                                 |
| **C. No autenticado**      | Sin sesión                          | false   | null       | false   | null             | "No autenticado" ✓    | Redirige a "/"             | ✅ OK                                 |
| **D. Server error (404)**  | Profile no existe                   | false   | null       | true    | null             | "No autenticado"      | Intenta redirigir          | CRÍTICO - User no ve error            |
| **E. Server error (500)**  | DB down                             | false   | null       | true    | null             | "No autenticado"      | Intenta redirigir          | CRÍTICO - User piensa está logout     |
| **F. Network error**       | Sin conexión                        | false   | null       | true    | null             | "No autenticado"      | Intenta redirigir          | CRÍTICO - Redirect a "/" infinito     |
| **G. Token expired**       | Session expired                     | false   | User stale | true    | User stale       | "Autenticado"         | Renderiza con datos viejos | ALTO - Data inconsistencia            |
| **H. Profile creándose**   | Auth existe, profile INSERT pending | true    | null       | false   | null             | "No autenticado"      | Puede redirigir            | ALTO - Race condition                 |

---

## 2. MAPEO DE CONSUMIDORES

### Lista Completa de Consumidores de useCurrentUser()

#### **CRÍTICOS (Renderiza sin guards)**

1. **AppShell.tsx:29**

   ```typescript
   const currentUser = useCurrentUser();
   if (!currentUser) return <Spinner />;  // ← Guard existe

   // PERO LUEGO:
   {currentUser.missionsDone ?? 0}        // ← Acceso directo (sería null si error)
   {currentUser.avatar}                   // ← Acceso directo
   {currentUser.name}                     // ← Acceso directo
   Nivel {currentUser.level}              // ← Acceso directo
   ```

   **Riesgo:** Si error → null → guard detiene render → OK
   **Riesgo Real:** ¿Qué pasa si guard pasa pero data es null internamente?

2. **app.perfil.tsx:42**

   ```typescript
   const user = useCurrentUser();
   if (!user) return <Spinner />;  // ← Guard existe

   // LUEGO (línea 168+):
   <div className={`bg-gradient-${user.region}`}>  // ← Acceso directo
   {user.avatar}                                     // ← Acceso directo
   {user.name}                                       // ← Acceso directo
   {user.district}                                   // ← Acceso directo
   {user.xp.toLocaleString()}                        // ← Acceso directo (sin ?.)
   {user.rank}                                       // ← Acceso directo
   {user.streak}                                     // ← Acceso directo
   {user.missionsDone || 0}                          // ← Nullish check
   {user.peopleImpacted.toLocaleString()}            // ← Acceso directo (NO es optional!)
   ```

   **Riesgo:** CRÍTICO - Si `peopleImpacted: undefined`, crash en `.toLocaleString()`

3. **app.progreso.tsx:15**

   ```typescript
   const user = useCurrentUser();
   if (!user) return null;  // ← Guard existe

   // LUEGO (línea 47+):
   {user.xp.toLocaleString()}          // ← Acceso directo
   {user.rank}                         // ← Acceso directo
   {user.streak}                       // ← Acceso directo
   <CivicRouteMap userXp={user.xp} />  // ← Acceso directo
   ```

   **Riesgo:** CRÍTICO - Si error en query, guard detiene render correctamente, pero no muestra por qué

4. **app.index.tsx:54**

   ```typescript
   const currentUser = useCurrentUser();

   // NO HAY GUARD - usa optional chaining:
   const userRegion = currentUser?.region as Region | undefined;
   {
     currentUser?.xp?.toLocaleString() || "0";
   } // ✓ Safe con fallback
   {
     currentUser?.peopleImpacted ? `${currentUser.peopleImpacted}+` : "0";
   } // ✓ Safe
   ```

   **Riesgo:** BAJO - Usa optional chaining

5. **app.crear.tsx:30**

   ```typescript
   const currentUser = useCurrentUser();

   // NO HAY GUARD - usa optional chaining:
   const [district, setDistrict] = useState(currentUser?.district || "");
   const [region, setRegion] = useState<...>((currentUser?.region as ...) || "costa");

   // LUEGO en mutation (línea 111):
   const userId = user.id;  // ← 'user' acá es variable local, no currentUser
   ```

   **Riesgo:** BAJO - Usa fallbacks

6. **app.notificaciones.tsx:11**

   ```typescript
   const user = useCurrentUser();
   // Pasa directo a CivicFeed sin check:
   <CivicFeed notifications={...} userDistrict={user?.district} />
   ```

   **Riesgo:** MEDIO - No valida si user es null antes de acceder

7. **app.mision.$missionId.tsx:44**
   ```typescript
   const currentUser = useCurrentUser();
   if (!currentUser) {
     // Error handling aquí
   }
   // LUEGO: acceso seguro vía checks
   ```
   **Riesgo:** BAJO - Tiene guard

#### **INDIRECTOS (A través de otros hooks)**

8. **useUserXpProgress() → internamente usa useCurrentUser()**
   ```typescript
   const user = useCurrentUser();
   if (!user) {
     return { currentXp: 0, fromXp: 0, toXp: 100, progressPct: 0 };
   }
   // Retorna fallback si null → SAFE
   ```
   **Riesgo:** LOW - Retorna fallback

---

## 3. RIESGOS UX PRE-BETA

### 🔴 CRÍTICO (Pantalla Blanca / Crash)

| Riesgo                 | Scenario                                                                        | Ubicación          | Efecto                                                        |
| ---------------------- | ------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------- |
| **R1: Property crash** | Error en query + acceso directo a `user.xp.toLocaleString()` en profile         | app.perfil.tsx:239 | TypeError: Cannot read property 'toLocaleString' of undefined |
| **R2: Property crash** | `user.peopleImpacted.toLocaleString()` si peopleImpacted es undefined           | app.perfil.tsx:241 | TypeError: Cannot read property 'toLocaleString' of undefined |
| **R3: Render crash**   | Error en query → null → guard passes → downstream component accesses properties | AppShell.tsx:81+   | Depends on downstream but HIGH risk                           |
| **R4: No distinction** | Can't tell if user is "loading" vs "error" vs "unauthenticated"                 | All consumers      | Silent failures, wrong UX                                     |

### 🟠 ALTO (Redirect Incorrecto / Loop Infinito)

| Riesgo                 | Scenario                                                                                                                  | Ubicación                                     | Efecto                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------- |
| **R5: Wrong redirect** | Network error → query error → consumer treats as unauthenticated → throws redirect("/") → hits /app again → infinite loop | app.progreso.tsx:19 `if (!user) return null;` | UX loop or blank screen                 |
| **R6: Race condition** | AuthProvider.loading=true pero query.isLoading=false → null passed → redirect too early                                   | All routes                                    | User sees login when should see spinner |
| **R7: Lost data**      | Query returns stale user object with `peopleImpacted: undefined` from old cache                                           | app.perfil.tsx                                | Display wrong data or crash             |

### 🟡 MEDIO (Flicker / Inconsistencia)

| Riesgo                  | Scenario                                                                                             | Ubicación            | Efecto                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------ |
| **R8: Loading flicker** | useCurrentUser returns null during initial load → component shows spinner → data arrives → re-render | AppShell, Perfil     | UI flicker (50-100ms)                |
| **R9: Stale data**      | Token expired mid-session but useCurrentUser still has cached User object                            | app.progreso.tsx     | Shows outdated XP/rank until refresh |
| **R10: State mismatch** | useAuthState says "authenticated" but useCurrentUser returns null (different cache keys)             | All protected routes | Inconsistent UI state                |

### 🔵 BAJO (Copy/UX Inconsistency)

| Riesgo                         | Scenario                                                                                | Ubicación        | Efecto                           |
| ------------------------------ | --------------------------------------------------------------------------------------- | ---------------- | -------------------------------- |
| **R11: Empty state**           | No fallback message for `!user` case → page goes blank                                  | app.progreso.tsx | Silent failure, no error message |
| **R12: Inconsistent fallback** | Some routes use `if (!user) return null`, others `if (!currentUser) return <Spinner />` | Multiple         | Inconsistent error UX            |

---

## 4. PROBLEMAS ESPECÍFICOS DE IMPLEMENTACIÓN

### Problema A: useCurrentUser() Oculta Estados

```typescript
// HOY:
export function useCurrentUser(): User | null {
  const { data: user } = useQuery({...});
  return user ?? null;
}

// ¿QUÉ PASÓ CON?
const { isLoading, isError, error } = useQuery({...});  // ← PERDIDO
```

**Impacto:** Consumidores no pueden diferenciar:

- Waiting for data (show spinner)
- Error occurred (show error UI)
- Not authenticated (redirect)
- Authenticated (render app)

### Problema B: Query.retry=false sin Error Handling

```typescript
export function userCurrentQueryOptions() {
  return {
    queryKey: userKeys.current,
    queryFn: () => userRepository.getCurrentUser(), // ← Lanza Error
    enabled: isLiveUserEnabled(),
    retry: false as const, // ← SIN REINTENTOS
  };
}
```

**Impacto:** Si network falla una vez, error es permanente. User no sabe si:

- No tiene internet
- Backend is down
- Profile doesn't exist
- Token expired

### Problema C: getCurrentUser() Lanza Error para "No Autenticado"

```typescript
export async function getCurrentUser(): Promise<User> {
  const userId = await this.getAuthenticatedUserId();
  if (!userId) {
    throw new Error("No authenticated user");  // ← LANZA ERROR
  }
  ...
}
```

**Impacto:** "No authenticated" vs "Server error" ambos retornan en useCurrentUser como null

- Imposible reaccionar diferente a cada caso

### Problema D: Optional Fields sin Fallbacks

```typescript
// En mapProfileToUser():
xp: profile.experience_points ?? 0,      // ✓ Safe
level: profile.level ?? 1,               // ✓ Safe
peopleImpacted: progress?.communityPoints ?? undefined,  // ❌ Unsafe
missionsDone: progress?.total_missions_completed ?? 0,   // ✓ Safe

// Consumidor:
{user.peopleImpacted.toLocaleString()}  // ← CRASH si undefined
```

**Impacto:** Runtime crash si peopleImpacted es undefined

---

## 5. PROPUESTA DE CONTRATO IDEAL

### Objetivo

Hacer explícito el estado, eliminar ambigüedad, sin introducir nuevas queries.

### Opción A: Hook Mejorado (Recomendada)

```typescript
/**
 * useCurrentUserState - Hook mejorado con estado explícito
 *
 * Debe:
 * 1. Unificar status de query (loading, error, success)
 * 2. Diferenciar "no autenticado" de "error"
 * 3. Exponer error para debugging
 * 4. Retornar objeto discriminado por tipo
 */
export type CurrentUserResult =
  | { status: "loading"; user: null; error: null }
  | { status: "authenticated"; user: User; error: null }
  | { status: "unauthenticated"; user: null; error: null }
  | { status: "error"; user: null; error: Error };

export function useCurrentUserState(): CurrentUserResult {
  const {
    data: user,
    isLoading,
    isError,
    error,
  } = useQuery({
    ...userCurrentQueryOptions(),
  });

  if (isLoading) {
    return { status: "loading", user: null, error: null };
  }

  if (isError) {
    // Distinguish: "No authenticated user" vs "Server error"
    if (error?.message.includes("No authenticated user")) {
      return { status: "unauthenticated", user: null, error: null };
    }
    return { status: "error", user: null, error: error as Error };
  }

  if (user) {
    return { status: "authenticated", user, error: null };
  }

  // Fallback
  return { status: "unauthenticated", user: null, error: null };
}
```

### Uso en Consumidores

```typescript
// Antes:
const user = useCurrentUser();
if (!user) return <Spinner />;  // ← Ambiguo

// Después:
const result = useCurrentUserState();

if (result.status === "loading") return <Spinner />;
if (result.status === "error") return <Error message={result.error.message} />;
if (result.status === "unauthenticated") {
  throw redirect({ to: "/" });
}
if (result.status === "authenticated") {
  return <App user={result.user} />;
}
```

### Opción B: Keep useCurrentUser, Add useCurrentUserStatus (Lower Effort)

```typescript
// Nuevo hook SOLO para status:
export function useCurrentUserStatus() {
  const { isLoading, isError, error } = useQuery({
    ...userCurrentQueryOptions(),
  });

  return {
    isLoading,
    isError,
    error,
    isAuthenticated: !isLoading && !isError,
  };
}

// Consumidor usa ambos:
const user = useCurrentUser();
const { isLoading, isError, error } = useCurrentUserStatus();

if (isLoading) return <Spinner />;
if (isError) return <Error />;
if (!user) throw redirect({ to: "/" });
return <App user={user} />;
```

### Diseño Ideal Completo

```typescript
interface CurrentUserState {
  // Status enum
  status: "initializing" | "loading" | "authenticated" | "unauthenticated" | "error";

  // Data
  user: User | null;
  error: Error | null;

  // Convenience predicates
  isReady: boolean; // ← true only when status !== "loading"
  isAuthenticated: boolean; // ← true only when status === "authenticated"
  isError: boolean; // ← true only when status === "error"

  // Helper actions
  retry?: () => void; // ← For network errors
  clearError?: () => void; // ← For dismissing error UI
}

export function useCurrentUserState(): CurrentUserState {
  const { authState } = useAuth(); // ← From auth state machine
  const {
    data: user,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    ...userCurrentQueryOptions(),
  });

  // Derive status
  let status: CurrentUserState["status"];
  if (authState.state === "initializing") {
    status = "initializing";
  } else if (isLoading) {
    status = "loading";
  } else if (isError) {
    status = error?.message.includes("No authenticated") ? "unauthenticated" : "error";
  } else if (user) {
    status = "authenticated";
  } else {
    status = "unauthenticated";
  }

  return {
    status,
    user,
    error: isError ? (error as Error) : null,
    isReady: !isLoading && authState.isReady,
    isAuthenticated: status === "authenticated",
    isError: status === "error",
    retry: isError ? () => refetch() : undefined,
  };
}
```

---

## 6. CHECKLIST DE RIESGOS ANTES DE BETA

- [ ] **R1, R2:** Profile page crashes on `user.peopleImpacted.toLocaleString()` → Add guard `user.peopleImpacted?.toLocaleString() || "0"`
- [ ] **R3:** AppShell guard protects against property access crashes ✓ (already checked)
- [ ] **R4:** Can't distinguish error from unauthenticated → Implement useCurrentUserState()
- [ ] **R5:** Network error causes redirect loop → Implement retry mechanism
- [ ] **R6:** Auth race condition → Verify useAuthState() blocks redirects during bootstrap (already fixed)
- [ ] **R7:** Stale data in cache → Add query invalidation on token refresh
- [ ] **R8:** Loading flicker → Can't avoid but communicate via loader UI
- [ ] **R9:** Token expiry mid-session → Supabase auto-refresh should handle
- [ ] **R10:** State mismatch between useAuthState + useCurrentUser → Align via authState
- [ ] **R11, R12:** Inconsistent fallbacks → Standardize on `if (!user) return <LoadingSpinner />`

---

## 7. RECOMENDACIONES ARQUITECTÓNICAS

### Corto Plazo (Pre-Beta)

1. Implement `useCurrentUserState()` as new canonical hook
2. Migrate critical consumers (AppShell, Profile, Progress)
3. Add error boundaries on protected routes
4. Add specific error messages for different failure modes

### Mediano Plazo (Post-Beta)

1. Deprecate bare `useCurrentUser()` in favor of `useCurrentUserState()`
2. Implement retry UI for network errors
3. Add query invalidation on token refresh
4. Add proper error recovery flow

### Largo Plazo

1. Consider persisting entire UserState snapshot to browser cache
2. Implement optimistic updates for user profile changes
3. Add offline mode detection

---

## 8. DEUDA TÉCNICA CUANTIFICADA

| Item                                    | Severity | Effort to Fix | Impact if Not Fixed              |
| --------------------------------------- | -------- | ------------- | -------------------------------- |
| Optional field crashes (peopleImpacted) | CRITICAL | 5 min         | Runtime crash in production      |
| State ambiguity (error vs not-auth)     | HIGH     | 2 hours       | Silent failures, wrong UX        |
| No retry mechanism                      | HIGH     | 1 hour        | Network error = permanent logout |
| Inconsistent guards                     | MEDIUM   | 30 min        | Flickers, inconsistent UX        |
| No loading state tracking               | MEDIUM   | 3 hours       | Can't show proper spinners       |
| Auth state + query state mismatch       | MEDIUM   | 2 hours       | Logic inconsistencies            |

**Total Effort:** ~9 hours
**Timeline:** 1-2 days
