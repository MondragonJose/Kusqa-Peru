# Staging vs Production Strategy

## Current State

- **One Supabase project** (`uhtgoljscgorfmfvxzux`) used for both dev and production
- **One Vercel deployment** — main branch deploys directly to production URL
- No isolated staging environment

## Recommendation: Two-Project Strategy

### Production Project

| Attribute | Value |
|-----------|-------|
| **Supabase Plan** | Pro ($25/mo) — enables daily backups, PITR option |
| **Vercel** | Production branch (`main`) |
| **Env** | Full real data, real auth providers |
| **Backups** | Automated daily + manual before migrations |

### Staging Project

| Attribute | Value |
|-----------|-------|
| **Supabase Plan** | Free tier (lower cost, non-critical) |
| **Vercel** | Preview deployments from PRs |
| **Env** | Anonymized seed data, test auth |
| **Backups** | Not critical; reseed from migrations if needed |

### Setup Steps

1. Create second Supabase project `kusqa-staging`
2. Apply all migrations to staging project
3. Configure Vercel preview deployments to use staging Supabase project
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for staging in Vercel env

### Environment Switching

The `.env` system already supports this — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` control the target. Vercel preview deployments get their own env vars from the Vercel dashboard.

## Service-Role Key Isolation

- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` to the client bundle (`VITE_` prefix = exposed)
- Service-role key should only be used in:
  - `scripts/backup.sh` (ops, not in Vite)
  - Future admin RPCs (server-side only)
  - Migration scripts (local CLI only)
- The current `VITE_SUPABASE_ANON_KEY` + RLS is the correct auth model

## Data Retention

| Data Type | Production | Staging |
|-----------|------------|---------|
| User profiles | Keep | Delete/anon |
| Missions | Keep | Seed data |
| Evidence files | Keep | Delete |
| Proposals | Keep | Seed data |
| Auth users | Supabase managed | Test accounts only |

## Migration Discipline

- **Always test on staging first** before applying to production
- Use `scripts/backup.sh --db-only` before production migrations
- Verify RLS with `scripts/ops/verify_rls.sql` after migration
- Run `scripts/ops/verify_consistency.sql` after migration
