# Auth Feature Module

## Current State

This module provides **migration-safe stubs** for authentication.
All hooks return static mock data from `src/data/kusqa.ts`.

## Migration Guide (for auth agent)

When integrating Supabase Auth:

1. Install `@supabase/auth-helpers-react` or use the Supabase client directly
2. Replace `useCurrentUser()` internals in `hooks/useCurrentUser.ts`
3. Map `SupabaseUser` → `User` domain type in a new `mappers/userMapper.ts`
4. Add `AuthProvider` wrapper in `__root.tsx`
5. Implement `useIsAuthenticated()` with real session checks

## Files

- `hooks/useCurrentUser.ts` — Main auth hook (replace internals here)
- `index.ts` — Barrel exports

## DO NOT modify these files outside the auth feature:

- `src/types/domain.ts` — User type
- `src/services/users.ts` — Supabase user service
- `src/lib/supabase.ts` — Supabase client
