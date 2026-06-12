# 4D.1 Verified Database Contracts

Inspection-only. Source files under `supabase/migrations/`. No `.sql`, service, hook, or component was modified.

---

## Contract 1 — `append_civic_event` parameter list

**Source:** `supabase/migrations/20260607010000_create_civic_events.sql:106–114`

```sql
create or replace function public.append_civic_event(
  p_kind            public.civic_event_kind,
  p_actor_id        uuid,
  p_target_type     text,
  p_target_id       uuid,
  p_district_id     uuid default null,
  p_payload         jsonb default '{}'::jsonb,
  p_dedupe_key      text default null
) returns uuid
```

7 parameters in order: `p_kind` (civic_event_kind), `p_actor_id` (uuid), `p_target_type` (text), `p_target_id` (uuid), `p_district_id` (uuid, default null), `p_payload` (jsonb, default '{}'), `p_dedupe_key` (text, default null). Returns `uuid`.

**Status: CONFIRMED** — matches all named-parameter call sites (e.g. `continue_initiative` at line 91–106).

---

## Contract 2 — `initiative_stewards` columns + UNIQUE constraint

**Source:** `supabase/migrations/20260617000000_collapse_into_initiatives.sql:272–284`

```sql
create table if not exists public.initiative_stewards (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.initiatives(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role initiative_role not null default 'ally',
  invited_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  message text check (message is null or char_length(message) <= 600),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (initiative_id, user_id),
  check (user_id <> invited_by or invited_by is null)
);
```

**Later additive column** (`20260622000000_complete_initiative_schema.sql:27–29`):
```sql
alter table public.initiative_stewards
  add column initiative_type text not null default 'proposal'
  check (initiative_type in ('proposal', 'mission'));
```

**Full real column set:** `id`, `initiative_id`, `user_id`, `role`, `invited_by`, `status`, `message`, `created_at`, `responded_at`, `initiative_type`.

**UNIQUE constraint:** `unique (initiative_id, user_id)` at line 282 — CONFIRMED. Supports `on conflict (initiative_id, user_id)`.

`invited_by` EXISTS. `responded_at` EXISTS.

**Status: CONFIRMED** — both columns referenced by `continue_initiative` (`invited_by`, `responded_at`) exist with expected types.

---

## Contract 3 — `initiatives` columns used by 4D.1

**Source:** `supabase/migrations/20260617000000_collapse_into_initiatives.sql:76–135`

| Column        | Type    | Nullable | Default       | Line |
|---------------|---------|----------|---------------|------|
| `district_id` | uuid FK→districts(id) | YES | — | 95 |
| `title`       | text    | NOT NULL | —             | 82 |
| `updated_at`  | timestamptz | NOT NULL | `now()`  | 134 |

No later migration alters these columns. Verified via grep across all `supabase/migrations/*.sql` — zero matches for `alter table public.initiatives` beyond the original `enable row level security`.

**Status: CONFIRMED** — all three columns exist with expected types.

---

## Contract 4 — `status` type and valid values

**Source:** `supabase/migrations/20260617000000_collapse_into_initiatives.sql:58–64`

```sql
create type public.initiative_status as enum (
  'forming', 'gathering', 'active', 'completed', 'dormant'
);
```

- `status` is an **enum** (`public.initiative_status`), not plain text.
- Valid values: `'forming'`, `'gathering'`, `'active'`, `'completed'`, `'dormant'`.
- `'forming'` IS a valid enum label.
- Column declaration at line 121: `status initiative_status not null default 'forming'`.

No later migration alters this enum (grep for `alter type public.initiative_status` — zero matches).

**Status: CONFIRMED** — `status` is `public.initiative_status` enum; `'forming'` is valid and is the default.

---

## Contract 5 — `initiative_role` enum values

**Source:** `supabase/migrations/20260617000000_collapse_into_initiatives.sql:66–72`

```sql
create type public.initiative_role as enum (
  'steward', 'co_steward', 'ally', 'supporter', 'participant'
);
```

5 values: `'steward'`, `'co_steward'`, `'ally'`, `'supporter'`, `'participant'`.

No later migration alters this enum (grep for `alter type public.initiative_role` — zero matches).

`continue_initiative` (line 80) casts `'steward'::public.initiative_role` — CONFIRMED valid.

**Status: CONFIRMED.**

---

## Summary

| # | Contract | Status |
|---|----------|--------|
| 1 | `append_civic_event` param list (7 params, named) | **CONFIRMED** |
| 2 | `initiative_stewards` columns + UNIQUE (initiative_id, user_id) | **CONFIRMED** |
| 3 | `initiatives` columns: district_id, title, updated_at | **CONFIRMED** |
| 4 | `status` is `initiative_status` enum; `'forming'` is valid | **CONFIRMED** |
| 5 | `initiative_role` enum: steward, co_steward, ally, supporter, participant | **CONFIRMED** |

All 5 contracts match. No missing symbols. The 4D.1 migration (`continue_initiative`) assumptions verified correct.
