# Auditoría useCurrentUser() — Resumen Ejecutivo

**Fecha:** 2026-05-26  
**Ámbito:** Post-State Machine refactor  
**Objetivo:** Detectar deuda técnica pre-beta  
**Estatus:** ✅ Análisis sin modificaciones

---

## 🔴 Hallazgos Críticos

### 1. Ambigüedad de Estados
`useCurrentUser()` retorna `User | null` — **imposible distinguir:**
- Cargando (query en progreso)
- Error (red/servidor falló)
- No autenticado (sin sesión)
- Autenticado (usuario existe)

**Impacto:** Error temporal → null → se trata como logout → redirect loop

---

### 2. Crashes de Runtime

**Archivo:** `src/routes/app.perfil.tsx:241`
```typescript
{user.peopleImpacted.toLocaleString()}  // ❌ CRASH si undefined
```

**Causa:** `useCurrentUser()` retorna `User | null` pero consumidor asume `User.peopleImpacted` existe

**Severidad:** 🔴 CRÍTICO — Pantalla blanca en producción

---

### 3. Sin Retry en Error

```typescript
// src/features/auth/hooks/useCurrentUser.ts:20
retry: false as const  // ← Un error = permanente
```

**Escenario móvil:**
1. Red falla durante 500ms
2. useCurrentUser() = null (tratado como logout)
3. Redirige a "/" aunque sesión aún válida
4. Loop infinito O pantalla en blanco

**Severidad:** 🔴 CRÍTICO en conexión inestable

---

### 4. Desalineación State Machines

```
useAuthState()      → "authenticated" (sesión OK ✓)
useCurrentUser()    → null (query cargando)
                      ↓
                    Componente intenta renderizar sin datos
                      ↓
                    CRASH O ERROR SILENCIOSO
```

**Severidad:** 🔴 CRÍTICO en redes lentas

---

## 📊 Matriz de Estados

| Estado Real | useCurrentUser() | Consumidor Ve | Esperado | Actual | Riesgo |
|---|---|---|---|---|---|
| **Bootstrap (cargando sesión)** | null | "No auth" | Spinner | Podría redirigir | 🔴 |
| **Error red (timeout)** | null | "No auth" | Retry spinner | Redirige a / | 🔴 |
| **Autenticado (normal)** | User | "Auth OK" | Render app | OK | ✅ |
| **Logout** | null | "No auth" | Redirigir | OK | ✅ |
| **Profile query slow** | null → User | "Wait" | Spinner → App | Crash si acceso directo | 🔴 |

---

## 🎯 Consumidores Afectados

### 🔴 CRÍTICO (Crash/Loop)
- **app.perfil.tsx** — Acceso sin guard: `user.peopleImpacted.toLocaleString()`
- **AppShell.tsx** — Fallback pero sin explicar error vs loading

### 🟡 ALTO (Redirect incorrecto)
- **app.index.tsx** — Podría mostrar componentes sin datos si query lento
- **useCurrentUser()** mismo — `retry: false` causa permanencia de error

### 🟢 MEDIO (Flicker)
- **app.notificaciones.tsx** — Depende de componente hijo, UI podría flicker
- **app.crear.tsx** — Async validation podría ver user = null en transición

### ✅ BAJO (Alineado)
- **app.mapa.tsx** — Usa en callback, defensive
- **app.index.tsx (main)** — Tiene guards robustos

---

## 📋 Consumidores Detallado

### AppShell.tsx
```typescript
if (!currentUser) {
  return <LoadingState />;  // Ambiguo: ¿loading o error o no auth?
}
```
**Riesgo:** MEDIO — Fallback existe pero sin error message

---

### app.perfil.tsx
```typescript
// Línea 241
<p className="text-sm text-muted-foreground">
  {user.peopleImpacted.toLocaleString()}  // ❌ CRASH si undefined
</p>
```
**Riesgo:** 🔴 CRÍTICO — Acceso directo a propiedad sin guard

---

### app.index.tsx
```typescript
const { data: user } = useQuery(userCurrentQueryOptions(), retry: false);
// Si error → user undefined
// Luego renderiza: {user?.missionCount}  // OK, tiene optional chaining
```
**Riesgo:** BAJO — Defensive con `?.`

---

### app.crear.tsx
```typescript
const user = useCurrentUser();
// Luego: useEffect async que depende de user
// Si user es null durante transición → crea state inconsistente
```
**Riesgo:** MEDIO — State derivado de user incierto

---

### useCurrentUser Hook
```typescript
retry: false as const  // Una sola vez, si falla → null forever
```
**Riesgo:** 🔴 CRÍTICO — No hay retry, permanente en error

---

## 🟥 Pre-Beta Checklist

- [ ] **CRÍTICO:** Crash en app.perfil.tsx línea 241 — usuario con `peopleImpacted` undefined
- [ ] **CRÍTICO:** Error permanente en useCurrentUser (no retry) — usuarios con conexión inestable quedan atrapados
- [ ] **ALTO:** Desalineación auth state machine vs user query — puede causar rendering incorrecto
- [ ] **ALTO:** Sin error boundary en AppShell — error silencioso no reportado
- [ ] **MEDIO:** UI flicker en app.index.tsx durante transitions
- [ ] **MEDIO:** app.crear.tsx depende de user state derivado

---

## 💡 Propuesta de Contrato Ideal

### Actual (Ambiguo)
```typescript
useCurrentUser(): User | null
```

### Propuesto (Explícito)
```typescript
interface UseCurrentUserResult {
  status: "loading" | "authenticated" | "unauthenticated" | "error";
  user: User | null;
  error?: Error | null;
  isAuthenticated: boolean;
  isReady: boolean;
}

useCurrentUser(): UseCurrentUserResult
```

**Ventajas:**
- ✅ No ambigüedad: `status === "loading"` vs `error` vs `unauthenticated`
- ✅ Error explícito: Puede mostrarse o logearse
- ✅ isReady: Sabe cuándo es seguro renderizar
- ✅ Alineado con state machine

---

## 📐 Propuesta de Refactor Futuro

**Fase 1 (Inmediato):**
1. Agregar `retry: 1` en useCurrentUser
2. Agregar error boundary en AppShell
3. Agregar guard en app.perfil.tsx línea 241

**Fase 2 (Post-Beta):**
1. Implementar nuevo contrato `UseCurrentUserResult`
2. Migrar consumidores gradualmente
3. Deprecate `User | null` API

---

## ✅ Conclusión

**Estado Pre-Beta:** ⚠️ **RIESGOS IDENTIFICADOS**

- **Riesgos Críticos:** 3 (crashes, loops, permanencia de error)
- **Riesgos Altos:** 2 (redirect incorrecto, state machine misalignment)
- **Riesgos Medios:** 3 (flicker, async state)
- **Recomendación:** Aplicar parches inmediatos antes de beta

**Timeline Estimado:** 30-60 minutos para stabilization patches
