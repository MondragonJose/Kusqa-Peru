# KUSQA — Conecta Perú

Civic-tech platform connecting young Peruvians with community-driven projects in their territory. Create, join, and complete civic expeditions that leave a measurable impact on your district.

Built for the Qhapaq Ñan generation — the path of those who walk together.

---

## Vision

KUSQA exists to lower the barrier for civic participation in Peru. Rather than waiting for institutional change, any young person can start or join a local project — a mural, a reforestation drive, a river cleanup — and see their collective footprint grow across the territory.

## Core Purpose

- **Discover** community expeditions by district, category, or proximity.
- **Create** new civic proposals with geolocation, images, and coalition support.
- **Participate** by joining expeditions, submitting evidence, and earning XP.
- **Track impact** across districts, regions, and the national territory map.
- **Build reputation** through a progression system (Caminante → Líder Kusqa).

---

## Technology Stack

| Layer                | Choice                                                           |
| -------------------- | ---------------------------------------------------------------- |
| **Framework**        | React 19 + TypeScript                                            |
| **Routing**          | TanStack Router (file-based, type-safe)                          |
| **SSR / Deployment** | TanStack Start (Vite + Vercel)                                   |
| **Styling**          | Tailwind CSS v4 + `tw-animate-css`                               |
| **UI Primitives**    | shadcn/ui (Radix + Lucide icons)                                 |
| **State / Server**   | TanStack React Query                                             |
| **Map**              | Leaflet + MarkerCluster + TopoJSON                               |
| **Spatial**          | PostGIS (Haversine queries, boundary intersection)               |
| **Backend**          | Supabase (PostgreSQL, Auth, Realtime, Storage)                   |
| **Validation**       | Zod                                                              |
| **Testing**          | Vitest + Testing Library + Storybook + Playwright                     |
| **Visual Catalog**   | Storybook 10 (`.storybook/`, stories in `__stories__/`)               |
| **E2E + A11Y**       | Playwright + @axe-core/playwright (see `e2e/`)                       |
| **Linting**          | ESLint + Prettier + typescript-eslint + eslint-plugin-boundaries |

---

## Product Philosophy

See [PRODUCT-PHILOSOPHY.md](./PRODUCT-PHILOSOPHY.md) for tone guardrails, register reference, and what KUSQA is / is not. All UI copy must conform to these principles before merging. Architecture decisions are tracked in [DECISIONS.md](./DECISIONS.md).

---

## Architecture

```
src/
├── components/       # Shared UI components (AppShell, TerritorialFootprint)
│   └── ui/           # shadcn/ui primitives
├── constants/        # App-wide constants (navigation, categories, gamification)
├── domain/           # Event-sourced domain layer
│   ├── events.ts     # Event types, reducers, projections
│   ├── territorial.ts       # Region inference, spatial lookup
│   ├── territorialEvent.ts  # TerritorialEvent aggregate
│   ├── spatialRelationships.ts  # Adjacency, spread, continuity
│   ├── territorialIntelligence.ts  # Vitality, continuity classification
│   └── ...            # Invariants, causality, evidence, lifecycle
├── features/         # Feature slices
│   ├── auth/         # Auth provider, mutation engine, hooks
│   ├── badges/       # Civic badge system
│   ├── community/    # Civic trust badge
│   ├── map/          # Leaflet map, layers, geocoding, analytics
│   ├── missions/     # Public mission cards, story modal
│   ├── notifications/# In-app notification feed
│   ├── progression/  # Civic route map, stages, kusqa moments
│   └── proposals/    # Proposal CRUD, comments, images, coalition
├── hooks/            # Shared React hooks (missions, evidence, realtime)
├── lib/              # Core infrastructure
│   ├── realtime/     # Supabase Realtime → React Query reconciliation
│   ├── telemetry/    # Operational metrics (Sentry/PostHog shims)
│   ├── env.ts        # Zod-validated environment variables
│   ├── supabase.ts   # Supabase client singleton
│   └── utils.ts      # cn() class merger
├── routes/           # TanStack file-based routes
├── services/         # Data access + business logic
│   ├── missionRepository.ts   # Mission queries (correct DbMission schema)
│   ├── userRepository.ts      # Profile + progress queries
│   ├── proposalRepository.ts  # Proposal CRUD
│   ├── evidenceRepository.ts  # Evidence queries
│   ├── evidenceContract.ts    # Evidence domain mapping
│   ├── districtRepository.ts  # District queries + stats
│   ├── spatialRepository.ts   # Spatial queries (nearby, density)
│   ├── storage/               # Evidence upload + signed URLs
│   └── ...                    # RPC adapters, comment repo, etc.
├── types/            # TypeScript type definitions
└── utils/            # Geographic helpers, formatting
```

### Data Flow

```
Route / Component
    → Feature hook (useMissions, useProposals, ...)
        → Service / Repository (missionRepository.ts, proposalRepository.ts)
            → Supabase client (lib/supabase.ts)
                → PostgreSQL + RPCs
```

Write operations go through **missionMutationEngine** (optimistic concurrency, dedup, pinned writes, realtime reconciliation). Realtime sync is managed per-user via `kusqa-sync:${userId}` channels with 3 `postgres_changes` subscriptions.

### Security Model

- **RLS is the final authority barrier.** Every table has row-level security policies. Service-layer auth resolution (added Phase 16E) provides defense-in-depth.
- Storage buckets: `mission-evidence` (private, path-prefix RLS), `proposal-images` (public, read-all).
- Feature flags (`VITE_USE_REALTIME_SYNC`, `VITE_EVIDENCE_UPLOAD_ENABLED`) provide kill-switch safety.

---

## Setup

### Prerequisites

- Node.js >= 22
- npm
- A Supabase project (free tier works; Pro recommended for automated backups)

### Environment Variables

Copy `.env.example` to `.env` and configure. Required:

| Variable                 | Description              |
| ------------------------ | ------------------------ |
| `VITE_SUPABASE_URL`      | Supabase project URL     |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

Optional feature flags (all default `false`): `VITE_USE_LIVE_USER`, `VITE_USE_RPC_TRANSACTIONS`, `VITE_USE_REALTIME_SYNC`, `VITE_EVIDENCE_UPLOAD_ENABLED`, `VITE_TELEMETRY_ENABLED`.

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Apply migrations from `supabase/migrations/` in timestamp order via the Supabase SQL editor or `supabase db push`.
3. Enable Google Auth in Supabase Dashboard → Authentication → Providers.

### Local Development

```bash
npm install
npm run dev        # Opens at http://localhost:5173
```

### Production Build

```bash
npm run build      # Includes prebuild typecheck
npx vercel --prod
```

### Testing

```bash
npm run test              # Unit tests (Vitest) — 200+ tests
npm run test:watch        # Watch mode
npm run test:rpc          # RPC integration tests (requires Supabase env)
```

### Storybook — Visual Contract

```bash
npm run storybook         # Dev server at http://localhost:6006
npm run build-storybook   # Static build to storybook-static/
```

Stories live in `__stories__/` directories next to their components. Each story covers every `InitiativeLifecycle` state (forming, gathering, active, completed, dormant) to make visual drift visible. Design tokens are in `.storybook/design-tokens.css`.

### E2E + Accessibility

```bash
npm run e2e               # Full E2E run (builds app + starts server)
npm run e2e:dev            # Run against already-running dev server
npm run e2e:ui             # Playwright UI mode
```

The critical civic flow test (`e2e/civic-flow.spec.ts`) covers:
- Logged-out user views the initiative feed
- Attempts to support → redirected to login
- axe-core a11y audit on every public page (critical/serious violations = 0)

Playwright config is in `playwright.config.ts`. Snapshots go to `playwright-report/`.

### Ops Scripts

```bash
npm run backup            # Full DB + Storage backup (see scripts/backup.sh)
npm run db:verify         # Run consistency checks
npm run db:verify-rls     # Verify RLS policy coverage
```

---

## Supabase Migrations

37 timestamped migrations in `supabase/migrations/` covering:

| Phase                  | Tables / Features                                                                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Baseline               | `profiles`, `missions`, `mission_participants`, `user_progress`, `proposals`, `proposal_supports`                                        |
| Phase B                | `user_missions`, `mission_events`, `mission_evidence`, `user_notifications`, `moderation_reports`, storage buckets, realtime publication |
| Proposals              | Proposal enrichment, images, coalition system, collaborators, comments, lifecycle events                                                 |
| Districts              | `districts` table with spatial coordinates, FK columns on profiles/missions/proposals, aggregation RPCs                                  |
| Civic Events           | `civic_events` table, event emission RPCs, triggers on proposals/supports/comments                                                       |
| Spatial (Phases 12-13) | `region_metadata`, PostGIS geometry, boundary data, Haversine-based `find_nearby_*` and `find_territories_intersecting` RPCs             |
| Authority (Phase 16E)  | RLS policy consistency fixes across all tables                                                                                           |

---

## Current Status

| Feature                     | Status                                          |
| --------------------------- | ----------------------------------------------- |
| Auth (Google OAuth)         | Live                                            |
| Mission catalog             | Live (Supabase, RLS-scoped)                     |
| Territorial map             | Live (Leaflet + clustering + heatmap)           |
| Proposal creation           | Live (with images, coalition support, comments) |
| Districts & spatial queries | Live (with PostGIS spatial queries)             |
| Profile & progression       | Live                                            |
| Civic events                | Live (event-sourced activity feed)              |
| Badges system               | Live (derived from participation data)          |
| Notifications               | Live (Supabase Realtime)                        |
| Evidence upload             | Feature-flagged (VITE_EVIDENCE_UPLOAD_ENABLED)  |
| Realtime sync               | Feature-flagged (VITE_USE_REALTIME_SYNC)        |
| Multi-device reconciliation | Debounced, pin-aware                            |

---

## Backup & Recovery

See `scripts/ops/recovery_procedures.md` for detailed recovery scenarios:

- **Failed migration** — restore from `.backups/`, re-apply forward
- **Accidental deletion** — selective restore from `pg_dump`
- **Corrupted uploads** — re-upload from storage backup, regenerate signed URLs
- **Broken RLS** — temporary disable, fix policy, re-enable
- **Realtime outage** — kill-switch via `VITE_USE_REALTIME_SYNC=false`

Automated backup: `scripts/backup.sh` (DB via `supabase db dump` + storage via REST API).

---

## Project Resources

- **Supabase Project:** `uhtgoljscgorfmfvxzux`
- **Deployment:** Vercel
- **Migrations:** `supabase/migrations/` (37 files)
- **Ops Scripts:** `scripts/ops/verify_consistency.sql`, `scripts/ops/verify_rls.sql`, `scripts/ops/recovery_procedures.md`

---

## License

Private — All rights reserved.
