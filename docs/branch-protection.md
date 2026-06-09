# Branch Protection Recommendations

Configure these rules in GitHub → Settings → Branches → Add branch protection rule for `main`:

## Required Settings

| Setting | Value | Rationale |
|---------|-------|-----------|
| Require pull request before merging | ✅ | Prevents direct pushes to main |
| Require approvals | **1** | Small team; one reviewer is sufficient |
| Dismiss stale reviews | ✅ | Ensures review is fresh after changes |
| Require status checks | ✅ | Gates on automated verification |
| Require branches up to date | ✅ | Prevents merge skew |

## Required Status Checks (from CI workflows)

| Check | Workflow | Why |
|-------|----------|-----|
| `validate` (Typecheck) | `ci.yml` | Block if TypeScript errors |
| `validate` (Test) | `ci.yml` | Block if test failures |
| `validate` (Build) | `ci.yml` | Block if build fails |
| `validate` (Migration Check) | `migration-check.yml` | Block if migrations break ordering rules |

## Recommended (Non-Blocking)

| Setting | Rationale |
|---------|-----------|
| Require conversation resolution | Keeps PRs clean |
| Do not allow bypassing | Everyone uses PRs, including admins |
| Restrict push access to `main` | Only via PR merge |
| Include administrators | Admins also follow workflow |

## Current Status (Pre-Phase 19)

Branch protection is **not configured**. The above settings should be applied in the GitHub UI after the CI workflows have run at least once (so the check names are registered).

## Enforcement Notes

- `lint` is explicitly non-gating. Pre-existing formatting issues (450+) make it impractical to block on. Run `npm run lint:fix` periodically to reduce the backlog.
- `deploy.yml` runs separately from PR checks. It enforces typecheck + test + build again before deploying, providing defense-in-depth.
