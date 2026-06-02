# Propuesta: Contrato Ideal para useCurrentUser()

---

## Problema Actual

```typescript
// Ambiguo: No se puede diferenciar
useCurrentUser(): User | null
```

**¿Qué significa `null`?**
- ¿Cargando?
- ¿Error?
- ¿No autenticado?
- ¿Usuario pero no perfil aún?

---

## Contrato Propuesto (Futuro)

### Interfaz
```typescript
interface UseCurrentUserResult {
  /**
   * Estado explícito de la query de usuario actual
   */
  status: "loading" | "authenticated" | "unauthenticated" | "error";

  /**
   * Usuario autenticado (solo si status === "authenticated")
   */
  user: User | null;

  /**
   * Error si status === "error" (ej: Red timeout, 403, etc)
   */
  error: Error | null;

  /**
   * Conveniencia: true si status === "authenticated"
   */
  isAuthenticated: boolean;

  /**
   * Conveniencia: true si bootstrap completó (no "loading")
   */
  isReady: boolean;
}

function useCurrentUser(): UseCurrentUserResult
```

### Beneficios

| Aspecto | Actual | Propuesto |
|---|---|---|
| **Differencia loading vs error** | ❌ Ambiguo | ✅ status explícito |
| **Permite retry UI** | ❌ No | ✅ Mostrar error + retry btn |
| **Type-safe rendering** | ❌ Crash posible | ✅ Status gate rendering |
| **Alineado con state machine** | ❌ No | ✅ Mismo enum pattern |
| **Extensible (MFA, etc)** | ❌ Difícil | ✅ Fácil agregar estado |

---

## Ejemplos de Uso Post-Refactor

### Antes (Ambiguo)
```typescript
export function AppShell({ children }: { children: ReactNode }) {
  const currentUser = useCurrentUser();
  
  if (!currentUser) {
    return <LoadingState />;  // ¿Loading o error?
  }
  
  return <div>{children}</div>;
}
```

### Después (Explícito)
```typescript
export function AppShell({ children }: { children: ReactNode }) {
  const userResult = useCurrentUser();
  
  if (userResult.status === "loading") {
    return <LoadingSpinner />;
  }
  
  if (userResult.status === "error") {
    return <ErrorState error={userResult.error} onRetry={refetch} />;
  }
  
  if (userResult.status === "unauthenticated") {
    return <RedirectToLogin />;
  }
  
  // Aquí garantizado: status === "authenticated" && user !== null
  return <div>{children}</div>;
}
```

---

## Antes de Implementar: Plan de Migración

### Fase 1: Setup (1 hora)
1. Crear `UseCurrentUserResult` interfaz
2. Crear `useCurrentUserNext()` hook (nueva API)
3. Mantener `useCurrentUser()` funcionando (old API)
4. Ambas coexisten

### Fase 2: Rollout Gradual (2-3 días)
1. Migrar componentes críticos primero (AppShell, Perfil)
2. Testing en redes lentas
3. Migrar consumidores uno a uno
4. Mantener old API como deprecated

### Fase 3: Cleanup (1 semana)
1. Deprecate `useCurrentUser()`
2. Reemplazar todos los consumidores
3. Eliminar `useCurrentUser()`

---

## Comparación: Estado vs useCurrentUser vs useAuthState

```typescript
// Auth State Machine (ya implementado)
const authState = useAuthState();
// → state: "initializing" | "authenticated" | "unauthenticated"
// → Tracks: Session validity
// → When: En bootstrap y cambios de sesión
// → Consumers: Routes, top-level guards

// useCurrentUser (actual)
const user = useCurrentUser();
// → User | null
// → Tracks: User profile data
// → When: Query ejecuta
// → Consumers: UI components que muestren datos del usuario
// → PROBLEMA: Ambiguo con auth state

// useCurrentUserNext (propuesto)
const userResult = useCurrentUserNext();
// → { status, user, error, isAuthenticated, isReady }
// → Tracks: User profile data + query state
// → When: Query ejecuta
// → Consumers: UI components que muestren datos
// → SOLUCIÓN: Explícito, no ambiguo
```

---

## Propuesta de Contrato Extendido (Futuro Lejano)

Para roles, permisos, etc:

```typescript
interface UseCurrentUserExtended extends UseCurrentUserResult {
  /**
   * Roles del usuario (ej: ["admin", "moderator"])
   */
  roles?: string[];

  /**
   * Permisos derivados de roles (ej: { canModerate: true })
   */
  permissions?: Record<string, boolean>;

  /**
   * Si usuario requiere MFA
   */
  requiresMFA?: boolean;
}
```

---

## Recomendación Final

**Inmediato (Pre-Beta):**
- ✅ Aplicar parches de retry + guards

**Post-Beta (Sprint 2):**
- 🚀 Implementar UseCurrentUserResult
- 🚀 Migrar gradualmente

**Ventaja:** Cero breaking changes, rollout seguro
