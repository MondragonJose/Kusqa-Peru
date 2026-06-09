# Deployment Protocol

## Pre-deployment Checklist

Run these steps in order before every production deployment:

```bash
# 1. Verify local state
git status                      # No uncommitted changes
git pull origin main            # Up to date with remote
npm ci                          # Clean dependencies

# 2. Run gates
npm run typecheck               # Zero type errors
npm run lint                    # Fix pre-existing with npm run lint:fix
npm run test                    # All 200+ tests pass
npm run build                   # Production build succeeds

# 3. Verify env
#    Check .env has correct production values:
#    - VITE_SUPABASE_URL → production Supabase URL
#    - VITE_SUPABASE_ANON_KEY → production anon key
#    - VITE_USE_LIVE_USER=true
#    - Feature flags as desired

# 4. Database (if migrations changed)
npm run backup:db               # Backup pre-migration state
#    Apply migrations via Supabase SQL editor or supabase db push
npm run db:verify               # Consistency check
npm run db:verify-rls           # Verify policy coverage
```

## Deployment

### Main branch (Production)

The `deploy.yml` GitHub Action handles this automatically:

1. Push to `main` triggers CI (`ci.yml`) + Deploy (`deploy.yml`)
2. Deploy waits for CI to pass (typecheck + test + build)
3. Vercel deploys from `main`

For manual deploys:

```bash
git checkout main
git pull
npm run build
npx vercel --prod
```

### PR branches (Preview)

- Every PR triggers `ci.yml` for typecheck + lint + test + build
- Vercel creates a preview URL automatically if configured
- Preview deployments should use staging Supabase env vars

## Rollback Procedures

### Vercel Rollback

```bash
# Option A: Revert code and re-deploy
git revert HEAD
git push origin main            # Triggers deploy workflow

# Option B: Immediate rollback to previous deployment
npx vercel rollback --prod      # Reverts to last successful deployment

# Option C: Via Vercel Dashboard
#    1. Go to Vercel Dashboard → Deployments
#    2. Find last known-good deployment
#    3. Click "..." → "Promote to Production"
```

### Database Rollback

PostgreSQL/Supabase does not support automatic migration rollback. Recovery procedure:

```bash
# 1. Restore pre-migration backup
./scripts/backup.sh --restore .backups/<pre-migration-timestamp>

# 2. Verify data integrity
psql -d "$SUPABASE_DB_URL" -f scripts/ops/verify_consistency.sql

# 3. If auth users are missing (not in pg_dump):
#    - Users will need to re-authenticate
#    - Profile rows will be re-created on next login
```

**There are no down migrations.** Every migration is forward-only. Recovery is via full database restore.

## Health Checks

After deployment, verify:

```bash
# 1. App loads
curl -s -o /dev/null -w "%{http_code}" https://kusqa.app/

# 2. API responds
curl -s -o /dev/null -w "%{http_code}" https://kusqa.app/api/health 2>/dev/null || \
  echo "App starts (SSR)"  # TanStack Start SSR health on route load

# 3. Manual checks
#    - Open the app in browser
#    - Authenticate with Google OAuth
#    - Verify mission catalog loads
#    - Verify map renders
#    - Submit a proposal (test)
```

## Emergency Contacts

| Service | Contact |
|---------|---------|
| Vercel | Dashboard → Support |
| Supabase | Dashboard → Support, status.supabase.com |
| GitHub | github.com/contact |
