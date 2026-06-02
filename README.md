# KUSQA — Conecta Perú

Civic-tech platform connecting young Peruvians with community-driven projects in their territory. Create, join, and complete civic expeditions that leave a measurable impact on your district.

Built for the Qhapaq Ñan generation — the path of those who walk together.

---

## Vision

KUSQA exists to lower the barrier for civic participation in Peru. Rather than waiting for institutional change, any young person can start or join a local project — a mural, a reforestation drive, a river cleanup — and see their collective footprint grow across the territory.

## Core Purpose

- **Discover** community projects (expeditions) by region, category, or proximity.
- **Create** new civic proposals with geolocation, images, and team formation.
- **Participate** by joining expeditions, submitting evidence, and earning XP.
- **Track impact** across districts, regions, and the national territory map.
- **Build reputation** through a progression system (Caminante → Líder Kusqa).

---

## Technology Stack

| Layer | Choice |
|-------|--------|
| **Framework** | React 19 + TypeScript |
| **Routing** | TanStack Router (file-based, type-safe) |
| **SSR / Deployment** | TanStack Start (Vite + Vercel) |
| **Styling** | Tailwind CSS v4 + `tw-animate-css` |
| **UI Primitives** | shadcn/ui (Radix + Lucide icons) |
| **State / Server** | TanStack React Query |
| **Animations** | Framer Motion |
| **Map** | Leaflet + MarkerCluster |
| **Drawers** | Vaul |
| **Backend** | Supabase (PostgreSQL, Auth, Realtime, Storage) |
| **Validation** | Zod |
| **Testing** | Vitest |
| **Linting** | ESLint + Prettier + typescript-eslint |

---

## Architecture Overview

```
src/
├── components/       # Shared UI components (AppShell, Onboarding, Map overlay)
│   └── ui/           # shadcn/ui primitives (button, card, dialog, etc.)
├── constants/        # App-wide constants (navigation, categories, gamification)
├── data/             # Mock/seed data for development
├── design/           # Design tokens (spacing, shadows, typography)
├── domain/           # Event-sourced domain layer (events, invariants, projections)
├── features/         # Feature slices
│   ├── auth/         # Authentication provider, hooks, mutations
│   ├── badges/       # Civic badge system
│   ├── community/    # Civic trust badge
│   ├── map/          # Leaflet map, layers, geocoding
│   ├── missions/     # Public mission cards
│   ├── notifications/# In-app notification feed
│   ├── progression/  # Civic route map, stages, kusqa moments
│   └── proposals/    # Proposal CRUD hooks and queries
├── hooks/            # Shared React hooks (missions, evidence, realtime)
├── lib/              # Core infrastructure
│   ├── realtime/     # Supabase Realtime → React Query reconciliation
│   ├── telemetry/    # Operational metrics (Sentry/PostHog shims)
│   ├── supabase.ts   # Supabase client singleton
│   └── utils.ts      # cn() class merger
├── routes/           # TanStack file-based routes (app layout + 6 sub-routes)
├── services/         # Data access layer (repositories, contracts, adapters)
├── types/            # TypeScript type definitions (domain, Supabase, evidence)
└── utils/            # Date formatting, geographic helpers
```

### Data Flow

```
Route / Component
    → Feature hook (useMissions, useProposals, ...)
        → Service / Repository (missions.ts, proposalRepository.ts)
            → Supabase client (lib/supabase.ts)
                → PostgreSQL + RPCs
```

Write operations go through **missionMutationEngine** (optimistic concurrency, dedup, pinned writes, realtime reconciliation).

---

## Setup

### Prerequisites

- Node.js >= 22
- npm
- A Supabase project (free tier works)

### Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_USE_LIVE_USER` | No | Enable live auth + profiles (`true`) or mock (`false`, default) |
| `VITE_USE_RPC_TRANSACTIONS` | No | Use atomic RPC for mission join/complete |
| `VITE_USE_REALTIME_SYNC` | No | Enable Supabase Realtime sync |
| `VITE_EVIDENCE_UPLOAD_ENABLED` | No | Enable evidence image uploads |
| `VITE_GOOGLE_MAPS_API_KEY` | No | Google Places Autocomplete (falls back to local dataset) |

### Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run migrations in order:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Or apply each migration file from `supabase/migrations/` manually via the SQL editor.

3. Enable Google Auth in Supabase Dashboard → Authentication → Providers.
4. (Optional) Create the `proposal-images` storage bucket if not created by migrations.

### Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

### Production Build

```bash
npm run build
npm run preview
```

### Testing

```bash
npm run test              # Unit tests (Vitest)
npm run test:watch        # Watch mode
npm run test:rpc          # RPC integration tests (requires Supabase env)
```

### Deployment

The project is configured for **Vercel** deployment via `vercel.json`:

```bash
npx vercel --prod
```

The `api/index.js` entry point bridges Vercel serverless functions with TanStack Start SSR.

---

## Supabase Migrations

The `supabase/migrations/` directory contains 20 sequential migrations covering:

- User mission tracking (`user_missions`)
- Civic proposals with geolocation (`proposals`, `proposal_supports`)
- Mission evidence with moderation (`mission_evidence`)
- Notifications and moderation reports
- Authoritative XP RPCs and audit trail (`mission_events`)
- Storage buckets for proposal images and evidence
- Row-level security policies

Seed files are provided for development/staging environments.

---

## Current Status

Production-stabilization phase. Core flows (auth, mission catalog, map, proposals, profile, progression) are functional and connected to live Supabase data.

| Feature | Status |
|---------|--------|
| Auth (Google OAuth) | Live |
| Mission catalog | Live (Supabase) |
| Territorial map | Live (Leaflet + clustering) |
| Proposal creation | Live (with image upload) |
| Profile & progression | Live |
| Badges system | Live (derived from participation data) |
| Notifications | Live (Supabase Realtime) |
| Evidence upload | Phase B (feature-flagged) |
| Realtime sync | Phase B (feature-flagged) |
| Multi-device reconciliation | Phase B (debounced, pin-aware) |

---

## Roadmap

- [x] Core mission + proposal CRUD
- [x] Territorial map with region filtering
- [x] Google OAuth + session management
- [x] User progression (XP, levels, badges)
- [x] Evidence submission pipeline
- [x] Realtime cross-device reconciliation
- [ ] Admin moderation UI
- [ ] Push notifications (FCM/APNs)
- [ ] Image compression worker
- [ ] Community analytics dashboard

---

## Project Resources

- **Supabase Project:** `uhtgoljscgorfmfvxzux` (MondragonJose's Project)
- **Deployment:** Vercel
- **Migrations:** `supabase/migrations/` (20 files)
- **Ops Scripts:** `scripts/ops/verify_consistency.sql`

---

## Contributing

This is an internal civic-tech project. If you're interested in contributing or adapting KUSQA for your region, please open an issue or reach out.

---

## License

Private — All rights reserved.
