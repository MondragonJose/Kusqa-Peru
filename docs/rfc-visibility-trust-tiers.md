# RFC: Visibility & Trust Tiers

**Status:** Draft  
**Author:** Architecture  
**Date:** 2026-06-10  
**Audience:** KUSQA engineering team

---

## 1. Problem

KUSQA currently has no visibility model. Every action is effectively public. There is no trust progression, no role-based visibility, and no graduated access to coordination capabilities.

This creates two risks:

1. **Coordination friction** — anyone can see everything, but no one knows who is genuinely committed vs. passively observing.
2. **Safety gap** — minors interact in the same surface as anonymous visitors, with no graduated trust to unlock deeper coordination.

---

## 2. Principles

| Principle                | Implication                                                                   |
| ------------------------ | ----------------------------------------------------------------------------- |
| Community-first          | Trust is earned through participation, not identity verification              |
| Youth-native             | No ID upload, no age gates, no bureaucratic hurdles                           |
| Transparent by default   | All tiers add visibility — nothing is hidden from lower tiers                 |
| Safe for minors          | No private DMs, no real-name exposure, report always available                |
| No private DM dependency | All coordination happens on-initiative (comments, timeline, shared resources) |
| Calm coordination        | Progression is invitation-based, not gamified                                 |

---

## 3. Visibility Model

### 3.1 Tiers

```
PUBLIC
  │
  ▼
PARTICIPANT  (supporter / participant)
  │
  ▼
COLLABORATOR
  │
  ▼
ORGANIZER
```

### 3.2 Per-tier visibility

| Signal                        | PUBLIC | PARTICIPANT | COLLABORATOR | ORGANIZER |
| ----------------------------- | ------ | ----------- | ------------ | --------- |
| Title, description, category  | ✅     | ✅          | ✅           | ✅        |
| Region, district              | ✅     | ✅          | ✅           | ✅        |
| Emoji, cover                  | ✅     | ✅          | ✅           | ✅        |
| Temporal anchor label         | ✅     | ✅          | ✅           | ✅        |
| Lifecycle badge               | ✅     | ✅          | ✅           | ✅        |
| Participant count             | ✅     | ✅          | ✅           | ✅        |
| **Organizer pseudonym**       | ✅     | ✅          | ✅           | ✅        |
| **Organizer real name**       | ❌     | ❌          | ❌           | ✅        |
| Participant list (pseudonyms) | ❌     | ✅          | ✅           | ✅        |
| Activity timeline             | ❌     | ✅          | ✅           | ✅        |
| **All comments**              | ✅\*   | ✅          | ✅           | ✅        |
| **Coordination thread**       | ❌     | ❌          | ✅           | ✅        |
| Support count + avatars       | ✅     | ✅          | ✅           | ✅        |
| Collaboration resources       | ❌     | ❌          | ✅           | ✅        |
| Organizer contact handle      | ❌     | ❌          | ✅           | ✅        |
| Moderation panel              | ❌     | ❌          | ❌           | ✅        |
| Edit controls                 | ❌     | ❌          | ❌           | ✅        |
| Role management               | ❌     | ❌          | ❌           | ✅        |

\* Comments visible to PUBLIC are subject to a **safety delay** (see §5).

### 3.3 Per-tier actions

Maps to `InitiativeAction` from `initiativeActions.ts`:

| Action              | PUBLIC       | PARTICIPANT | COLLABORATOR | ORGANIZER |
| ------------------- | ------------ | ----------- | ------------ | --------- |
| `support`           | ✅ (forming) | —           | —            | —         |
| `join`              | ✅ (active)  | —           | —            | —         |
| `comment`           | ❌           | ✅          | ✅           | ✅        |
| `share`             | ✅           | ✅          | ✅           | ✅        |
| `edit`              | ❌           | ❌          | ❌           | ✅        |
| `report`            | ✅           | ✅          | ✅           | ✅        |
| Invite collaborator | ❌           | ❌          | ❌           | ✅        |
| Remove content      | ❌           | ❌          | ❌           | ✅        |

---

## 4. Trust Progression

### 4.1 Pathways

```
visitor ──1-click──▶ PARTICIPANT
  ▲                    │
  │               invitation
  │              (organizer)
  │                    ▼
  │              COLLABORATOR
  │                    │
  │              create initiative
  │                    ▼
  └── ─ ─ ─ ─ ─ ─ ORGANIZER
```

### 4.2 Triggers

| Transition                 | Trigger                           | Condition                                          | Reversible?             |
| -------------------------- | --------------------------------- | -------------------------------------------------- | ----------------------- |
| PUBLIC → PARTICIPANT       | Clicks "Apoyar" or "Unirme"       | Must be authenticated                              | Yes (unsupport/leave)   |
| PARTICIPANT → COLLABORATOR | Organizer sends invitation        | Participant must have ≥1 comment on the initiative | Yes (organizer revokes) |
| \* → ORGANIZER             | Creates a new proposal or mission | Must be authenticated; no abuse history            | N/A (own creation)      |

### 4.3 Design rationale

- **1-click participation** removes friction — supporting a proposal or joining a mission is the single action that unlocks commenting.
- **Invitation-based collaboration** prevents spam. Only the organizer decides who becomes a collaborator. No algorithm, no threshold, no gamification.
- **No auto-promotion** — trust is a human decision by the organizer, not a system computation.
- **Reversibility** is always available — the organizer can demote or remove collaborators. The participant can leave at any time.

---

## 5. Moderation & Safety

### 5.1 Reporting

`moderation_reports` table already exists in the schema. Current status: underutilized.

**Updated report flow:**

1. Any PUBLIC user can report any initiative (proposal or mission)
2. Report goes to:
   - **First line:** Initiative organizer (sees report, can resolve by removing content or dismissing)
   - **Escalation:** Platform steward (if organizer does not act within 48h or is the reported party)
3. Report reasons: `spam`, `abuse`, `inappropriate_content`, `minor_safety`, `other`

### 5.2 Minor protection (no age gate)

- **No real names** shown below ORGANIZER tier. Pseudonyms only.
- **No private DMs** — all interaction happens on-initiative, visible to the organizer.
- **Safety delay** on PUBLIC comments: comments from PUBLIC-tier visibility are delayed by 15 minutes to allow organizer moderation.
- **Block**: Any participant can block another user. Blocked users cannot comment on initiatives where the blocker is COLLABORATOR or above.

### 5.3 Abuse limitation

- **Support/join rate limit**: Max 10 supports or joins per hour per user (already partially implemented via `consumeRateLimit`).
- **Comment rate limit**: Max 5 comments per 10 minutes per initiative.
- **Organizer revocation**: Organizer can remove any participant or collaborator without appeal (for their own initiative).

---

## 6. Lifecycle Integration

How visibility and actions change at each lifecycle stage:

| Lifecycle     | PUBLIC                              | PARTICIPANT    | COLLABORATOR               | ORGANIZER                    |
| ------------- | ----------------------------------- | -------------- | -------------------------- | ---------------------------- |
| **forming**   | See, support, share, report         | Comment, share | Comment, share, coordinate | Edit, manage, comment, share |
| **active**    | See, join\*, share, report          | Comment, share | Comment, share, coordinate | Edit, manage, comment, share |
| **ending**    | See, join (if spots), share, report | Comment, share | Comment, share, coordinate | Edit, manage, comment, share |
| **completed** | See, share, report                  | Comment, share | Comment, share             | Edit outcome, share          |
| **archived**  | See, share, report                  | —              | —                          | —                            |

\* Join available only if `max_participants > current_count`. Spots info is visible to PUBLIC.

### Key lifecycle-driven visibility changes:

- **forming → active**: Transition adds "join" action for PUBLIC; "support" is no longer available.
- **active → completed**: "join" and "support" are removed for all tiers. "comment" remains for PARTICIPANT+ (reflection period).
- **active → archived**: All participation actions are frozen. Only "share" and "report" remain for PUBLIC.
- **completed → archived (auto)**: After 90 days of inactivity, completed initiatives archive automatically.

---

## 7. Database Impact

### 7.1 New columns on existing tables

```sql
-- Add visibility metadata to profiles (lightweight)
alter table public.profiles
  add column if not exists blocked_user_ids uuid[] not null default '{}',
  add column if not exists report_count integer not null default 0;

-- Add participant count cache to missions
alter table public.missions
  add column if not exists participant_count integer not null default 0;

-- Add comment safety delay tracking to proposal_comments
alter table public.proposal_comments
  add column if not exists is_public_visible boolean not null default true,
  add column if not requires_moderation boolean not null default false;
```

### 7.2 New tables

```sql
-- Coordination resources (shared docs, links, notes — visible to COLLABORATOR+)
create table if not exists public.initiative_resources (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null,
  initiative_type text not null check (initiative_type in ('proposal', 'mission')),
  title text not null,
  url text null,
  content text null,
  added_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint resources_initiative_check check (
    (initiative_type = 'proposal' and initiative_id is not null) or
    (initiative_type = 'mission' and initiative_id is not null)
  )
);

-- Organizer real-name verification (optional, shown only to ORGANIZER tier)
create table if not exists public.organizer_verification (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  full_name text not null,
  verified_at timestamptz not null default now()
);
```

### 7.3 No changes needed

- `proposal_supports` — already supports the PUBLIC→PARTICIPANT transition
- `mission_participants` — already supports the PUBLIC→PARTICIPANT transition
- `proposal_collaborators` — already supports the PARTICIPANT→COLLABORATOR transition
- `moderation_reports` — already exists
- `proposal_comments` — already exists (minor addition for safety delay)

---

## 8. RLS Impact

### 8.1 New policies

```sql
-- Initiative resources: COLLABORATOR+ can read
create policy "collaborator_plus_can_read_resources"
  on public.initiative_resources
  for select
  using (
    exists (
      select 1 from public.proposal_collaborators pc
      where pc.proposal_id = initiative_id
        and pc.user_id = auth.uid()
        and pc.status = 'accepted'
    )
    or
    exists (
      select 1 from public.mission_participants mp
      where mp.mission_id = initiative_id
        and mp.user_id = auth.uid()
    )
    -- organizer can always read their own resources
    or exists (
      select 1 from public.missions m where m.id = initiative_id and m.organizer_id = auth.uid()
    )
  );

-- Comment safety delay: PUBLIC can only see comments marked public_visible
create policy "public_can_read_safe_comments"
  on public.proposal_comments
  for select
  using (
    is_public_visible = true
    or
    auth.uid() is not null  -- authenticated users see all
  );
```

### 8.2 Existing policies that remain unchanged

- All existing SELECT policies remain (they already allow authenticated reads)
- INSERT/DELETE on `proposal_supports` remains self-only
- INSERT/UPDATE on `mission_participants` remains self-only

---

## 9. Migration Strategy

### Phase 1 — Schema (zero-downtime)

1. Run `alter table` statements (add columns) — these are additive and non-blocking
2. Create new tables (`initiative_resources`, `organizer_verification`)
3. Add RLS policies (non-blocking — policy is a no-op until query uses it)

**Rollback:** `alter table ... drop column` or `drop table` — safe within a single migration window.

### Phase 2 — Application layer (deploy after Phase 1)

1. Update `initiativeActions.ts` — the `UserRelationship` type already supports the tiers; no changes needed
2. Create `useInitiativeVisibility(initiativeId, userId)` hook that returns the user's current tier for a given initiative
3. Update `getAvailableInitiativeActions()` to accept the resolved tier (already accepts `relationship`)
4. Add `initiative_resources` UI for COLLABORATOR+ tier
5. Add `safetyDelay` logic to comment submission

### Phase 3 — Moderation (deploy after Phase 2)

1. Wire up `moderation_reports` to notify organizers
2. Add organizer moderation panel (comments, participant management)
3. Add block functionality
4. Add safety delay cron job (mark comments public_visible after 15 min)

---

## 10. Risks

| Risk                                                  | Likelihood | Impact | Mitigation                                                                                |
| ----------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------- |
| Organizer abuses role (removes participants unfairly) | Low        | Medium | Platform steward escalation via `moderation_reports`                                      |
| Participants feel excluded from coordination          | Medium     | Low    | Organizer can invite freely; no auto-promotion keeps quality high                         |
| Safety delay frustrates legitimate commenters         | Low        | Low    | Delay is 15 min, only for PUBLIC visibility; PARTICIPANT+ sees instantly                  |
| Block creates coordination deadlock                   | Low        | Medium | Block only prevents commenting on same initiative; user can leave and join different ones |

---

## 11. Tradeoffs

| Decision                        | For                      | Against                                                |
| ------------------------------- | ------------------------ | ------------------------------------------------------ |
| Invitation-based collaboration  | High trust, no spam      | Slower growth of collaborator pool                     |
| No auto-promotion               | No gamification pressure | Organizer may forget to promote deserving participants |
| Safety delay on PUBLIC comments | Protects minors          | Delays legitimate public discourse                     |
| Pseudonyms only below ORGANIZER | Privacy for minors       | Reduced accountability                                 |

---

## 12. Recommended Implementation Sequence

```
Week 1: Schema + RLS (Phase 1)
  ├── Add columns to profiles, missions, proposal_comments
  ├── Create initiative_resources table
  ├── Create organizer_verification table
  └── Add RLS policies

Week 2: Application layer (Phase 2)
  ├── Create useInitiativeVisibility() hook
  ├── Wire up initiative_resources UI for COLLABORATOR+
  ├── Update existing surfaces to gate actions by tier
  └── Add safety delay on comment submission

Week 3: Moderation (Phase 3)
  ├── Wire up moderation_reports to organizer notification
  ├── Build organizer moderation panel
  ├── Add block functionality
  └── Add safety delay release cron job
```

---

## 13. Success Criteria

| Criterion                                              | Measurement                                                       |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| A minor can participate without exposing personal info | No real names leaked outside ORGANIZER tier                       |
| Coordination happens without DMs                       | All coordination resources are on-initiative                      |
| Trust progression is clear                             | Users can self-assess their tier from UI                          |
| Abuse is reportable from any tier                      | Report button available in all surfaces                           |
| Organizers can manage their space                      | Remove participant, promote to collaborator, dismiss collaborator |
| Zero-downtime deployment                               | Each phase is additive, no migration requires backfill            |
