# Production Readiness Report — Phase 19

## Summary

| Area | Status | Gaps Remaining |
|------|--------|----------------|
| **19A** CI/CD | ✅ Automated gating (typecheck, test, build) | No Vercel token in GitHub secrets yet |
| **19B** Supabase Hardening | ✅ Strategy documented, backup operational | No staging Supabase project; Pro plan not activated |
| **19C** Monitoring | ✅ Sentry + PostHog real SDKs integrated | 73+ console.errors still bypass telemetry |
| **19D** Deployment Reliability | ✅ Protocol documented, rollback procedures defined | No health check endpoint |
| **19E** Abuse Protection | ✅ Rate limiting on 5 actions, requiresAuth fixed | Client-side only; no server-side rate enforcement |
| **19F** Municipal Readiness | ✅ Model preserved: community-first, no institutional UX | No specific municipal documentation |

---

## Delivered Artifacts

### Infrastructure
- `.github/workflows/ci.yml` — PR check pipeline
- `.github/workflows/deploy.yml` — Production deploy with predeploy verification
- `.github/workflows/migration-check.yml` — Migration file validation
- `docs/branch-protection.md` — GitHub branch protection settings

### Monitoring
- `@sentry/react` + `posthog-js` added to dependencies
- `src/lib/telemetry/sentryShim.ts` — Real Sentry.init(), captureException, captureMetric
- `src/lib/telemetry/posthogShim.ts` — Real PostHog.init(), capture, $exception tracking
- `src/lib/telemetry/index.ts` — Lazy initialization with sentry + posthog routing

### Abuse Protection
- `src/lib/rateLimiter.ts` — Client-side sliding window rate limiter
- Rate limits applied: createProposal (5/min), uploadEvidence (3/min), createComment (10/min), toggleSupport (10/min), createMission (5/min)
- `src/features/auth/hooks/useCreateMission.ts` — `requiresAuth: true` (was false)
- `src/constants/app.ts` — ALLOWED_FILE_TYPES aligned with evidenceStorage.ts

### Operations
- `docs/staging-strategy.md` — Two-project staging vs production strategy
- `docs/deployment-protocol.md` — Pre-deploy checklist, rollback procedures, health checks
- `scripts/backup.sh` — Phase 18 delivery (verified operational in 19B audit)
- `scripts/ops/verify_rls.sql` — RLS policy verification
- `scripts/ops/verify_consistency.sql` — Data consistency checks

### Documentation
- `README.md` — Updated with current architecture, features, ops scripts
- `docs/branch-protection.md` — Branch protection settings
- `docs/staging-strategy.md` — Environment strategy
- `docs/deployment-protocol.md` — Deployment and rollback procedures

---

## Operational Checklist

- [ ] GitHub branch protection enabled on `main`
- [ ] `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` added to GitHub secrets
- [ ] `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` added to GitHub secrets
- [ ] Supabase project upgraded to Pro plan (if not already)
- [ ] Staging Supabase project created
- [ ] Sentry project created + DSN added to production `.env`
- [ ] PostHog project created + API key added to production `.env`
- [ ] `scripts/backup.sh` tested with production credentials
- [ ] First production backup taken
- [ ] `VITE_TELEMETRY_ENABLED=true` set in production `.env`

---

## Unresolved Risk Register

| # | Risk | Severity | Mitigation | Owner |
|---|------|----------|------------|-------|
| 1 | **No server-side rate limiting** | HIGH | Client-side rate limiting mitigates casual abuse. Supabase infrastructure-level rate limiting should be configured in Supabase Dashboard. | Infra |
| 2 | **73+ console.errors not in telemetry** | MEDIUM | Core paths (evidence storage, realtime, mutation rollback) already use `captureOperationalException`. Service-level errors need incremental migration. | Dev |
| 3 | **No staging Supabase project** | MEDIUM | Current single-project approach means migrations are tested against production. Staging project setup is documented but not implemented. | Infra |
| 4 | **Sentry/PostHog DSNs not configured in prod** | MEDIUM | SDKs integrated, ready. DSNs need to be set in production `.env`. If missing, telemetry gracefully degrades (DEV logs still work). | Ops |
| 5 | **Vercel + Cloudflare dual-target ambiguity** | LOW | `vercel.json` is the primary deployment target. `wrangler` config is gitignored. Should resolve by removing `wrangler` from scripts if Vercel is canonical. | Dev |
| 6 | **No health check endpoint** | LOW | Current approach is: app loads → route renders. `curl` check in deployment protocol is sufficient for small team. | Dev |
| 7 | **Supabase generated types are a stub** | LOW | Phase 18 finding. All DB queries typed as `any`. Zod validation in repositories compensates. Requires `supabase gen types` integration. | Dev |
| 8 | **No `supabase/config.toml`** | LOW | Prevents `supabase gen types --local`. Supabase CLI can still use `--project-id` for remote types. | Dev |

---

## Future Scaling Guidance

1. **Server-side rate limiting** — When adding backend RPCs or Edge Functions, implement rate limiting there (token bucket pattern).
2. **Health endpoint** — Add `GET /api/health` returning `{ status: "ok", timestamp, version }` for automated monitoring.
3. **Staging automation** — Automate staging Supabase project creation and migration application in CI.
4. **Type generation** — Add `npm run gen:types` script using `supabase gen types --project-id <PROJECT_ID>`.
5. **Error telemetry migration** — Gradually replace `console.error` calls in services with `captureOperationalException`.
6. **Down migrations** — For future schema changes, consider adding `down.sql` rollback scripts alongside forward migrations.
