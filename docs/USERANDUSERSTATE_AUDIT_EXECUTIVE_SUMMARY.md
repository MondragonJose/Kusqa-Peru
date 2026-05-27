# useCurrentUser() Audit - Executive Summary

> **Analysis Date:** May 26, 2026  
> **Scope:** All consumers of `useCurrentUser()` post-State Machine refactor  
> **Status:** 🔴 CRITICAL ISSUES FOUND - Pre-Beta Risk Assessment

---

## Quick Summary

After Auth State Machine refactor, `useCurrentUser()` creates **state ambiguity** that can cause:
- Runtime crashes (optional field access)
- Silent failures (error misidentified as unauthenticated)
- Infinite redirect loops (network errors)
- Inconsistent UI rendering

**Impact:** Medium-High risk for beta release without fixes.

---

## Critical Issues Found

### Issue #1: Impossible State Distinction (CRITICAL)
**The Problem:**
```typescript
useCurrentUser() returns User | null

// Consumers can't distinguish:
null → "Loading" OR "Error" OR "Unauthenticated"?
```

**Where it matters:**
- Network error → treated as unauthenticated → redirect to "/" → infinite loop
- Server error (500) → treated as logout → wrong UX
- Query loading → treated as not logged in → premature redirect

**Files affected:** All 7 consumer routes

**Fix effort:** 2-3 hours (implement `useCurrentUserState()`)

---

### Issue #2: Runtime Crashes (CRITICAL)
**The Problem:**
```typescript
// app.perfil.tsx:241
{user.peopleImpacted.toLocaleString()}  // ❌ CRASH if undefined
```

**Root cause:** `peopleImpacted` can be `undefined` but no fallback

**Files affected:**
- app.perfil.tsx:239 - `user.xp.toLocaleString()`
- app.perfil.tsx:241 - `user.peopleImpacted.toLocaleString()`

**Fix effort:** 5 minutes per file

---

### Issue #3: Retry Mechanism Missing (HIGH)
**The Problem:**
```typescript
// queryOptions.ts
retry: false as const,  // ← No retries

// If network fails once:
// → Error state
// → useCurrentUser returns null
// → Treated as "not authenticated"
// → Redirect to "/" forever
```

**Result:** One network hiccup = user locked out

**Fix effort:** 1 hour (add retry UI + manual retry)

---

### Issue #4: State Machine Misalignment (HIGH)
**The Problem:**
```
useAuthState() says: "authenticated" (session valid)
useCurrentUser() says: null (query still loading)

Consumer renders: App without data → crash
```

**Root cause:** Two independent async sources

**Fix effort:** 2 hours (align state derivation)

---

## Consumer Risk Matrix

| File | Guard | Direct Access | Status | Risk | Notes |
|---|---|---|---|---|---|
| **AppShell.tsx** | ✓ `if (!currentUser)` | Safe with optional chaining | ✓ OK | LOW | Spinner shown, safe downstream |
| **app.perfil.tsx** | ✓ `if (!user)` | ❌ Direct on peopleImpacted | 🔴 CRASH | HIGH | Can throw TypeError |
| **app.progreso.tsx** | ✓ `if (!user)` | Safe but no error message | ⚠️ SILENT | MEDIUM | Blank screen instead of error |
| **app.index.tsx** | ✗ No guard | ✓ Optional chaining + fallback | ✓ OK | LOW | Defensive coding |
| **app.crear.tsx** | ✗ No guard | ✓ Optional chaining + fallback | ✓ OK | LOW | Defensive coding |
| **app.notificaciones.tsx** | ✗ No guard | Passes to CivicFeed | ⚠️ CHECK | MEDIUM | Depends on child safety |
| **app.mision.$missionId.tsx** | ✓ Checked | Safe | ✓ OK | LOW | Proper error handling |

---

## Proposed Fix: useCurrentUserState()

**Before:**
```typescript
const user = useCurrentUser();
if (!user) return <Spinner />;  // ← What if it's an error?
```

**After:**
```typescript
const result = useCurrentUserState();

if (result.status === "loading") return <Spinner />;
if (result.status === "error") return <ErrorUI retry={result.retry} />;
if (result.status === "unauthenticated") throw redirect({ to: "/" });
if (result.status === "authenticated") return <App user={result.user} />;
```

**Hook signature:**
```typescript
type CurrentUserResult = 
  | { status: "loading"; user: null; error: null }
  | { status: "authenticated"; user: User; error: null }
  | { status: "unauthenticated"; user: null; error: null }
  | { status: "error"; user: null; error: Error };

function useCurrentUserState(): CurrentUserResult
```

---

## Pre-Beta Checklist

| Task | Effort | Risk if Not Done |
|---|---|---|
| Fix peopleImpacted crashes | 10 min | 🔴 Runtime crash in production |
| Implement useCurrentUserState() | 2 hrs | 🔴 State ambiguity → wrong UX |
| Migrate AppShell to new hook | 30 min | 🟠 Inconsistent error handling |
| Migrate Perfil to new hook | 30 min | 🟠 Crash risk |
| Migrate Progreso to new hook | 30 min | 🟠 Silent failures |
| Add error boundary on /app | 1 hr | 🟠 Unhandled errors visible |
| Test network error scenarios | 1 hr | 🟠 Infinite loop risk |
| **TOTAL** | **~5.5 hours** | **BETA BLOCKER** |

---

## Severity Classification

### 🔴 CRITICAL (Fix Before Beta)
1. **R1:** peopleImpacted crash → TypeError in production
2. **R2:** State ambiguity → silent failures & wrong UX
3. **R3:** No retry mechanism → network error = permanent logout

### 🟠 HIGH (Fix Before Release)
4. **R4:** useAuthState + useCurrentUser misalignment
5. **R5:** No error recovery UI

### 🟡 MEDIUM (Fix Before Scale)
6. **R6:** Inconsistent guard patterns across routes
7. **R7:** No error boundary on protected routes

---

## Root Cause Analysis

**Why did this happen?**

1. **State Hidden in Hook:** React Query's `isLoading`, `isError`, `error` states are hidden inside `useCurrentUser()`, leaving consumers with only `User | null`

2. **Type Ambiguity:** `null` means 4 different things (loading, error, not-auth, auth-pending)

3. **Query + Auth Decoupling:** AuthProvider manages session, React Query manages profile. Two independent async processes can diverge.

4. **No Error Propagation:** Query errors are silently converted to `null` instead of being surfaced

---

## Design Gap

**Current Architecture:**
```
AuthProvider (useAuthState)    React Query (useCurrentUser)
       │                                │
       ├─ Manages session               ├─ Manages profile fetch
       ├─ Has loading state             ├─ Has loading/error states
       └─ Clear state enum              └─ States hidden
       
       Both run independently
       → Can diverge
       → Consumers confused
```

**Desired Architecture:**
```
AuthProvider (useAuthState)
       │
       ├─ Session ✓
       └─ Guides React Query enabled/retry behavior
       
React Query (useCurrentUserState)
       │
       ├─ Profile data
       ├─ Loading/error from query
       └─ Status derived from BOTH AuthProvider + Query
```

---

## Implementation Plan

### Phase 1: Immediate (Pre-Beta) - 5.5 hours

1. Fix optional field crashes (10 min)
2. Implement `useCurrentUserState()` (2 hrs)
3. Migrate 3 critical consumers (1.5 hrs)
4. Add error boundary (30 min)
5. Test network scenarios (1 hr)

### Phase 2: Post-Beta - 2 hours

1. Migrate remaining consumers
2. Deprecate `useCurrentUser()` in favor of new hook
3. Add retry UI component

---

## Reference Documents

- **Full Audit:** `docs/AUDIT_useCurrentUser.md` (detailed matrix + all findings)
- **State Analysis:** `/memories/repo/useCurrentUser_state_analysis.md` (visual diagrams)
- **Auth Architecture:** `/memories/repo/auth_architecture.md` (overall system design)

---

## Decision Required

**Proceed with fix?**
- [ ] Yes - Schedule 5.5 hour sprint for pre-beta fixes
- [ ] Partial - Fix only critical crashes, defer state design
- [ ] No - Accept risk for beta, fix post-release

**Recommendation:** ✅ **FIX IMMEDIATELY** - 5.5 hours is minimal effort for eliminating beta-blocking risk.
