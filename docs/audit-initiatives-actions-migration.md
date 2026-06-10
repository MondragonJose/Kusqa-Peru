# Audit: Initiative Actions — Surfaces, Drift & Migration Plan

**Status:** Audit · No implementation  
**Date:** 2026-06-10  

---

## 0. Canonical Model (`initiativeActions.ts`)

**File:** `src/domain/initiativeActions.ts`  
**Defines:** `getAvailableInitiativeActions(context: ActionContext): InitiativeAction[]`  
**Actions:** `"support" | "join" | "comment" | "share" | "edit" | "report"`  
**Relationships:** `"visitor" | "supporter" | "participant" | "collaborator" | "organizer"`  
**Lifecycles:** `"forming" | "active" | "ending" | "completed" | "archived"`  

### Canonical action matrix (lifecycle × relationship)

| Lifecycle | Visitor | Supporter | Participant | Collaborator | Organizer |
|-----------|---------|-----------|-------------|--------------|-----------|
| **forming** | support, share, report | support, comment, share | comment, share | comment, share | edit, comment, share |
| **active** | join, share, report | comment, share | comment, share | comment, share | edit, comment, share |
| **ending** | join, share, report | comment, share | comment, share | comment, share | edit, comment, share |
| **completed** | share, report | comment, share | comment, share | comment, share | edit, share |
| **archived** | [] | [] | [] | [] | [] |

### Rules encoded
- `share` always present except `archived`
- `report` visitor-only
- `edit` organizer-only
- `support` transitions to `join` past `forming`
- `comment` available to any non-visitor

### Current adoption: **ZERO**
`getAvailableInitiativeActions` is imported **only** in `src/domain/__tests__/initiativeActions.test.ts`. No component, hook, or route imports it.

---

## 1. Surface Inventory

### S1 — Map Popup

**File:** `src/features/map/layers/useMissionMarkerLayer.ts:98-159`

| Rendered | UI | Conditions | Source of Truth |
|----------|----|-----------|-----------------|
| Primary CTA | `pres.ctaLabel` (Apoyar | Unirme | Participar | Ver resultados) | `lifecyclePresentation.getLifecyclePresentation(deriveLifecycleFromMission())` | `lifecyclePresentation.ts` |
| Detail nav | "Ver más →" opens drawer | Always when `onRequestDetail` provided | Inline |

**Drift:** The "CTA label" approximates `initiativeActions` but only by lifecycle—ignores user relationship entirely. A visitor in `forming` sees "Apoyar" (correct), but a visitor in `active` sees "Unirme" (correct), but the popup has no second action (no share, no report)—canonical model says visitor should see `join, share, report`.

**Missing vs canonical:** share, report

---

### S2 — Map Sidebar (Desktop Detail Panel)

**File:** `src/routes/app.mapa.tsx:263-364`

| Rendered | UI | Conditions | Source of Truth |
|----------|----|-----------|-----------------|
| Join | "Unirme" → `/app/mision/$id` | Always when `activeMission` is set | Inline |

**Drift:** No lifecycle or relationship gating. Always shows "Unirme" even for proposals in `forming` (currently filtered out by `entityType !== "proposal"`, but after Initiative migration, proposals will appear). Canonical says visitor in `forming` sees `support, share, report`—not `join`.

**Missing vs canonical:** share, report (visitor); comment (non-visitor); edit (organizer)

---

### S3 — Map Drawer (Mobile Bottom Sheet)

**File:** `src/routes/app.mapa.tsx:423-527`

| Rendered | UI | Conditions | Source of Truth |
|----------|----|-----------|-----------------|
| Join | "Unirme a la misión →" → `/app/mision/$id` | Always when `activeMission` is set | Inline |

**Drift:** Identical to S2. Same unconditional "Unirme".

**Missing vs canonical:** share, report, comment, edit

---

### S4 — Index Page Drawer (Home Feed)

**File:** `src/routes/app.index.tsx:511-596`

| Rendered | UI | Conditions | Source of Truth |
|----------|----|-----------|-----------------|
| Navigate | "Apoyar iniciativa" (proposal) / "Explorar ruta" (mission) | Always (entity type discriminator) | Inline |

**Drift:** Single CTA with no lifecycle or relationship gating. Same problems as S2/S3.

**Missing vs canonical:** share, report, comment, edit, support/join (context-appropriate)

---

### S5 — Mission Detail Page

**File:** `src/routes/app.mision.$missionId.tsx:395-989`

| Rendered | UI | Conditions | Source of Truth |
|----------|----|-----------|-----------------|
| Join | "Iniciar ruta" / "✨ Estás en ruta" / "Ingresando..." | `!isMissionEntity \|\| alreadyJoined \|\| isPending \|\| isSuccess` | Inline (`useJoinMission`) |
| Bookmark | Heart icon toggle | Always | Inline (localStorage) |
| Share (hero) | "Compartir misión" | Always | Inline (clipboard/Web Share) |
| Share (sidebar) | "Compartir ruta" | Always | Inline (clipboard/Web Share) |
| Evidence | Photo/text upload form | Only when `userMission` exists (already joined) | Inline (`useSubmitEvidence`) |
| View proposal origin | Link | When `originProposalId` is truthy | Inline |

**Drift:** `share` is always present (matches canonical). `join` is always present for visitors (matches canonical for `active`/`ending`). But there are additional app-specific actions not in canonical model: bookmark, evidence, view origin. These are mission-specific and should remain outside `initiativeActions`.

**Missing vs canonical:** support (when proposal), report, comment, edit

---

### S6 — Proposal Detail Page

**File:** `src/routes/app.propuesta.$proposalId.tsx:25-156`

#### Page-level actions

| Rendered | UI | Conditions | Source of Truth |
|----------|----|-----------|-----------------|
| Archive | "Archivar propuesta" | `canArchiveProposal(userId, currentUserId, status)` — author + status not rejected/resolved | `proposalGovernance.ts:49-56` |
| Report | "Reportar" | `canReportProposal(currentUserId, authorId)` — any non-author | `proposalGovernance.ts:58-63` |

#### Via shared components

**ProposalStickyCTA** (`src/features/proposals/components/ProposalStickyCTA.tsx`):

| Rendered | UI | Conditions | Source of Truth |
|----------|----|-----------|-----------------|
| Support | "Apoyar" / "Ya apoyas" / "Apoyando…" | `copy.action === "support"` (phase: open, ready); disabled if `isSupporting \|\| isSupported(id)` | `proposalLifecycle.ts:76-125` |
| Co-organize | "Quiero co-organizar" (active/disabled) | `copy.action === "coorganize"` (phase: mobilizing); disabled for non-author | `proposalLifecycle.ts` |
| View mission | "Ya es una misión" (disabled) | `copy.action === "view_mission"` (phase: converted) | `proposalLifecycle.ts` |
| None/terminal | Phase label (disabled) | `copy.action === "none"` (completed, archived) | `proposalLifecycle.ts` |
| Share | "Compartir" | `copy.ctaSecondary === "Compartir" && action !== "none"` | Inline (clipboard/Web Share) |

**ConversionCta** (`src/features/proposals/components/ConversionCta.tsx:31-209`) — author only:

| Rendered | UI | Conditions | Source of Truth |
|----------|----|-----------|-----------------|
| Convert to mission | "Convertir en misión" | `nextStep === "convert_to_mission"` | `proposalLifecycle.ts` (`getProposalAuthorNextStep`) |
| Invite collaborators | "Invita a co-organizar" | `nextStep === "invite_collaborators"` | Same |
| Await collaborators | Info text only | `nextStep === "await_collaborators"` | Same |
| Reopen proposal | "Reabrir propuesta" | `status === "resolved"` | Same |

**ConversationThread** (`src/features/proposals/components/ConversationThread.tsx`):

| Rendered | UI | Conditions | Source of Truth |
|----------|----|-----------|-----------------|
| Create comment | Text form + button | Requires `userId` (authenticated) | `useCreateComment` hook |
| Reply to comment | Button | Always on non-deleted comments | Inline |
| Edit comment | Button | `isOwn && comment.isEditable` | Inline |
| Delete comment | Button | `isOwn` | `useDeleteComment` hook |

**Drift:** The proposal detail has its own rich action model with `proposalLifecycle` phases (`open → ready → mobilizing → converted → completed → archived`) that map loosely to `InitiativeLifecycle` but are not identical. The canonical `initiativeActions` doesn't model `coorganize`, `convert`, `invite_collaborators`, `reopen`, `archive`—these are proposal-author-only operations outside the generic action model.

**Canonical overlap:** support → support, comment → comment, share → share, report → report, edit (when organizer? no—proposal has archive, not edit).

**Actions unique to proposal detail:** coorganize, convert, invite_collaborators, reopen, archive, create comment, reply, edit comment, delete comment.

---

### S7 — PublicMissionCard (Feed Cards)

**File:** `src/features/missions/components/PublicMissionCard.tsx:183-211`

| Rendered | UI | Conditions | Source of Truth |
|----------|----|-----------|-----------------|
| Join (missions) | "Unirme →" → `/app/mision/$id` | Entity type === mission | Inline |
| Support (proposals) | "Apoyar iniciativa ✨" / "Apoyado ❤️" / "Apoyando…" | Entity type === proposal; `isSupported`, `isSupporting` from `useSupportProposal` hook | `useSupportProposal()` |

**Drift:** Action rendered depends on entity type (mission vs proposal) not lifecycle. A mission in `completed` lifecycle still shows "Unirme" (should be disabled or show "Ver resultados"). A proposal in `converted` still shows "Apoyar" (should show "Ver misión"). No relationship awareness.

**Missing vs canonical:** share, report, comment, edit

---

### S8 — Profile Lists

**File:** `src/routes/app.perfil.tsx` (own) / `src/routes/app.perfil.$userId.tsx` (public)

| Rendered | UI | Conditions | Source of Truth |
|----------|----|-----------|-----------------|
| Explore territory | Link to `/app/mapa` | Always | Inline |
| Edit district | Button → modal | Own profile only | Inline |
| View story | Click timeline entry | Always | Inline |

**Drift:** Profile lists are read-only navigation. No support/join/share/report/edit buttons on items. The canonical action model doesn't apply here—profile is an archive, not an action surface.

**Verdict:** Profile lists are **out of scope** for the action model migration. They only navigate (like a feed list), not render actions on individual items.

---

## 2. Parity Matrix

| Action | Canonical | S1 Popup | S2 Sidebar | S3 Drawer | S4 Index | S5 Mission | S6 Proposal | S7 Card |
|--------|-----------|----------|------------|-----------|----------|------------|-------------|---------|
| **support** | ✓ | ~ (ctaLabel "Apoyar") | ✗ | ✗ | ~ ("Apoyar iniciativa") | ✗ | ✓ (StickyCTA) | ~ (if proposal) |
| **join** | ✓ | ~ (ctaLabel "Unirme") | ✓ (unconditional) | ✓ (unconditional) | ~ ("Explorar ruta") | ✓ | ✗ | ~ (if mission) |
| **comment** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ (ConversationThread) | ✗ |
| **share** | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ (hero + sidebar) | ✓ (StickyCTA) | ✗ |
| **edit** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ~ (archive—not edit) | ✗ |
| **report** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |

**Legend:** ✓ = present, ~ = approximate (different label/behavior), ✗ = absent

### Canonical actions not rendered anywhere
- **edit** appears nowhere (proposal has "archive" instead—different semantics)
- **comment** only appears in ConversationThread on proposal detail (not on mission detail, not on cards)
- **report** only appears on proposal detail footer

### Surfaces with no action model at all
- Map sidebar (S2) and map drawer (S3) are the worst offenders: single hardcoded "Unirme" regardless of lifecycle or relationship
- Index drawer (S4) same problem: single CTA with entity-type switch only
- PublicMissionCard (S7) switches on entity type, not lifecycle

---

## 3. Inconsistencies

### I1: Popup CTA vs Sidebar CTA (same entity, same page)
The map popup renders a lifecycle-aware CTA label (`getLifecyclePresentation().ctaLabel`): "Apoyar", "Unirme", "Participar", "Ver resultados". But the sidebar (and drawer) unconditionally render "Unirme". A `forming` proposal in sidebar shows "Unirme" while the popup correctly shows "Apoyar".

**Severity:** High (contradictory UX on same screen)

### I2: proposalLifecycle phases don't map 1:1 to InitiativeLifecycle
Proposal phases: `open`, `ready`, `mobilizing`, `converted`, `completed`, `archived`
Initiative lifecycles: `forming`, `active`, `ending`, `completed`, `archived`
- Proposal `open`/`ready` → Initiative `forming`
- Proposal `mobilizing` → Initiative `active`
- Proposal `converted` → Initiative `active` (or `ending`?)
- Proposal `completed` → Initiative `completed`
- Proposal `archived` → Initiative `archived`

The canonical action model doesn't know about `coorganize`, `convert`, `invite_collaborators`, `reopen`—these are proposal-author-specific collaboration primitives. They should remain separate.

**Severity:** Medium (two action universes need bridging, not merging)

### I3: PublicMissionCard switches on entity type, not lifecycle
A `completed` mission shows "Unirme" (wrong—should show "Ver resultados").
A `converted` proposal shows "Apoyar iniciativa" (wrong—should show "Ver misión").
Neither checks lifecycle.

**Severity:** High (visible in district feed, search results)

### I4: Map sidebar/drawer show missions only, not proposals
`sidebarMissions` filters `entityType !== "proposal"`. After Initiative migration, proposals will appear in the unified list but the sidebar has no proposal-specific action model (no support, no share).

**Severity:** High (will break post-migration without action model)

### I5: "support" ≠ "join" distinction missing from card surfaces
Canonical model says `forming` → support, `active`/`ending` → join. Only the map popup makes this distinction (via `lifecyclePresentation`). Every other surface either shows a generic "Unirme" (sidebar, drawer) or switches on entity type (PublicMissionCard).

**Severity:** Medium

### I6: No share action on map surfaces or cards
Canonical model says `share` is always present (except archived). It's missing from: map popup, map sidebar, map drawer, index drawer, PublicMissionCard. Only the detail pages (mission + proposal) have share buttons.

**Severity:** Medium (missed virality opportunity)

### I7: Report action inconsistently gated
Proposal detail uses `proposalGovernance.canReportProposal()` (non-author only). Canonical model says `report` is visitor-only. These are different gates: canonical restricts to visitors, actual code restricts to non-author (which includes visitors, supporters, participants, collaborators—anyone except author). The canonical model is more restrictive.

**Severity:** Low (actual behavior is more permissive than canonical—safe)

### I8: Edit action absent from all surfaces
Canonical model says `edit` is organizer-only. No surface renders an edit button. Proposal detail has "archive" instead (different semantics—destructive vs editorial). Mission detail has no edit at all.

**Severity:** Medium (organizers have no edit surface)

### I9: "Co-organize" action not in canonical model
Proposal detail's "Quiero co-organizar" (`proposalLifecycle.ts` phase: `mobilizing`) maps closest to an invitation to become a `collaborator`. The canonical model has no mechanism for relationship progression—it assumes relationship is known ahead of time.

**Severity:** Low (boundary of canonical model—collaboration priming is a separate concern from action availability)

---

## 4. Implementation Order

### Phase 0 — Bridge (week 1, no visual change)

| Step | File | Change | Complexity |
|------|------|--------|------------|
| 0.1 | `src/domain/initiativeActions.ts` | Add `deriveRelationship()` pure function: `(userId, initiative) → UserRelationship` | Low |
| 0.2 | `src/domain/initiativeActions.ts` | Add `actionToLabel(action, lifecycle, sourceType): string` — maps canonical actions to KUSQA UI labels | Low |
| 0.3 | `src/domain/initiativeActions.ts` | Add `actionToIcon(action): LucideIcon` | Low |
| 0.4 | `src/domain/initiativeActions.ts` | Export `ACTION_PRIORITY: Record<InitiativeAction, number>` for deterministic ordering | Low |

**Verification:** `deriveRelationship` tested against same matrix as `getAvailableInitiativeActions`. No new behavior.

---

### Phase 1 — InitiativeActionBar (week 1-2)

**New component:** `src/features/actions/components/InitiativeActionBar.tsx`

```tsx
// Contract
interface InitiativeActionBarProps {
  initiative: Initiative | CivicEntity;  // unified input
  lifecycle: InitiativeLifecycle;
  relationship: UserRelationship;
  onSupport?: () => void;
  onJoin?: () => void;
  onShare?: () => void;
  onComment?: () => void;
  onEdit?: () => void;
  onReport?: () => void;
  /** Override labels (for context-specific copy) */
  labelOverrides?: Partial<Record<InitiativeAction, string>>;
  /** Layout variant */
  variant?: "row" | "stack" | "compact" | "popup";
  /** Max actions to show (overflow hidden) */
  maxVisible?: number;
}
```

**Behavior:**
1. Calls `getAvailableInitiativeActions({ lifecycle, sourceType, relationship })`
2. Renders each action as a button/link
3. `support`/`join` are primary CTAs (first in list)
4. `share` is secondary (icon-only for compact/popup)
5. `report` is tertiary (text-only, muted)
6. `edit` is organizer-only (shows pencil icon + label)
7. `comment` navigates to comment section or opens comment modal
8. Actions with no handler are rendered disabled with tooltip

**Priority order (left to right):** `support|join` > `comment` > `share` > `edit` > `report`

---

### Phase 2 — Replace map surfaces (week 2)

| Surface | File | Change |
|---------|------|--------|
| S1 Popup | `useMissionMarkerLayer.ts:98-159` | Replace inline HTML CTA with `InitiativeActionBar variant="popup" maxVisible={2}` (primary + "Ver más") |
| S2 Sidebar | `app.mapa.tsx:335-343` | Replace "Unirme" `<Link>` with `InitiativeActionBar variant="row"` |
| S3 Drawer | `app.mapa.tsx:466-472` | Replace "Unirme a la misión →" `<Link>` with `InitiativeActionBar variant="compact"` |
| S4 Index | `app.index.tsx:558-573` | Replace "Apoyar iniciativa" / "Explorar ruta" with `InitiativeActionBar variant="row" maxVisible={2}` |

**Each replacement:**
1. Derive `lifecycle` from entity (already have `deriveLifecycleFromMission` or direct `Initiative.lifecycle`)
2. Derive `relationship` from auth + participation state (Phase 0 `deriveRelationship()`)
3. Pass entity + lifecycle + relationship to `InitiativeActionBar`
4. Remove inline action conditional logic

---

### Phase 3 — Replace card surfaces (week 2-3)

| Surface | File | Change |
|---------|------|--------|
| S7 Card | `PublicMissionCard.tsx:183-211` | Replace entity-type switch (mission→"Unirme", proposal→"Apoyar") with `InitiativeActionBar variant="compact" maxVisible={1}` |
| Feed items | `app.index.tsx` feed list cards | If feed cards exist as reusable, apply same pattern |

---

### Phase 4 — Align detail pages (week 3-4)

| Surface | File | Change |
|---------|------|--------|
| S5 Mission | `app.mision.$missionId.tsx:505-545` | Use `InitiativeActionBar` for primary actions; keep bookmark/evidence as page-specific extras |
| S6 Proposal | `app.propuesta.$proposalId.tsx:126-149` | Footer actions (archive/report) → use `InitiativeActionBar` for `report`; archive stays as page-specific |
| S6 Proposal | `ProposalStickyCTA.tsx` | Keep as-is but align `support`/`share` labels with canonical model; add `comment` action |

**Proposal-specific actions** (coorganize, convert, invite_collaborators, reopen) stay outside `InitiativeActionBar`—they are outside the canonical model and only meaningful to the proposal-author workflow.

**Mission-specific actions** (bookmark, evidence) stay outside `InitiativeActionBar`—they are app-specific features, not generic initiative actions.

---

### Phase 5 — Retire old code (week 4)

| File | Change |
|------|--------|
| Any remaining inline action logic in replaced surfaces | Remove conditional action rendering |
| `proposalGovernance.ts` `canReportProposal()` | Replace inline call with `getAvailableInitiativeActions` + local handler |
| `lifecyclePresentation.ts` `ctaLabel` | Remove/deprecate (replaced by `actionToLabel()`); keep visual semantics (containerClass, opacity, animationClass, badge, tooltipTone, isHidden) |

---

## 5. Reusable InitiativeActionBar Design

```
┌─────────────────────────────────────────────────────────────┐
│  variant="row" (sidebar, desktop detail panels)             │
│                                                             │
│  [❤️ Apoyar] [💬 Comentar] [🔗 Compartir] [✏️ Editar]     │
│                        (▼ more if maxVisible exceeded)       │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐
│  variant="compact" (cards,   │
│  mobile drawer)              │
│                              │
│  [❤️ Apoyar]        [🔗]    │
│                              │
│  Primary action + share icon │
└──────────────────────────────┘

┌────────────────────────┐
│  variant="popup" (map) │
│                        │
│  ┌──────────────────┐  │
│  │  ❤️  Apoyar      │  │
│  ├──────────────────┤  │
│  │  Ver más →       │  │
│  └──────────────────┘  │
│                        │
│  Single action + nav   │
└────────────────────────┘

┌───────────────────────────────────────┐
│  variant="stack" (detail footer,      │
│  mobile full-width)                   │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  ❤️  Apoyar iniciativa         │  │
│  ├─────────────────────────────────┤  │
│  │  💬  Dejar un comentario       │  │
│  ├─────────────────────────────────┤  │
│  │  🔗  Compartir                 │  │
│  ├─────────────────────────────────┤  │
│  │  ⚑  Reportar                  │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
```

### Action → Label mapping

```ts
const ACTION_LABEL: Record<InitiativeAction, string> = {
  support: "Apoyar",
  join: "Unirme",
  comment: "Comentar",
  share: "Compartir",
  edit: "Editar",
  report: "Reportar",
};

function actionToLabel(
  action: InitiativeAction,
  lifecycle: InitiativeLifecycle,
  sourceType: "proposal" | "mission",
): string {
  if (action === "join" && lifecycle === "ending") {
    return "Participar"; // softer CTA for ending initiatives
  }
  if (action === "support" && lifecycle === "completed") {
    return "Apoyar (finalizado)";
  }
  return ACTION_LABEL[action];
}
```

---

## 6. Rollout Strategy

### Per-surface rollout order

```
Phase 2a ── S2 (sidebar) + S3 (drawer)
  │          Map surfaces first (worst drift, highest visibility)
  │
Phase 2b ── S4 (index drawer)
  │          Homepage second (high traffic)
  │
Phase 2c ── S1 (popup)
  │          Map popup last in Phase 2 (has lifecycle-aware CTA already—
  │          least broken of the map surfaces)
  │
Phase 3a ── S7 (PublicMissionCard)
  │          Card surfaces are used in district feed, search—
  │          medium traffic
  │
Phase 4a ── S5 (mission detail)
  │          Detail pages are the most complex—migrate last
  │
Phase 4b ── S6 (proposal detail)
  │          Proposal detail has its own action ecosystem—
  │          align without breaking StickyCTA/ConversionCta
```

### Feature flag

```ts
// src/lib/operationalFeature.ts
export function isUnifiedActionBarEnabled(): boolean {
  return import.meta.env.VITE_USE_UNIFIED_ACTION_BAR === "true";
}
```

### Rollback per surface

Each surface replacement is a single file change (add `InitiativeActionBar`, remove inline conditional block). Reverting means swapping back the JSX block. Since the canonical model is a superset of each surface's current actions, no data loss occurs on rollback.

### Migration safety checks

1. **No surface loses an action it currently has.** Every current action maps to a canonical action. If the canonical model doesn't include a surface's action (e.g., `coorganize`), that surface retains its custom rendering.
2. **No new actions appear on a surface before handlers exist.** `InitiativeActionBar` renders actions disabled when no handler is provided. A surface without an `onShare` handler renders share as disabled (with tooltip) or hidden (via `maxVisible`).
3. **Actions only increase, never decrease.** Post-migration, map surfaces gain `share`, `report`, and relationship-aware behavior. They never lose actions they currently have.

---

## 7. Summary

| Metric | Count |
|--------|-------|
| Surfaces audited | 8 |
| Surfaces to migrate | 6 (S1-S5, S7) |
| Surfaces out of scope | 2 (S8 profile—read-only navigation) |
| Canonical actions not rendered anywhere | 1 (edit) |
| Canonical actions partially rendered | 4 (support, join, comment, report all missing from 3+ surfaces) |
| Inconsistencies found | 9 |
| Unique proposal actions outside canonical | 5 (coorganize, convert, invite, reopen, archive) |
| Unique mission actions outside canonical | 3 (bookmark, evidence, view origin) |
| Implementation phases | 5 (0: bridge, 1: bar, 2: map, 3: cards, 4: details, 5: retire) |
| Estimated effort | 3-4 weeks |
| Risk | Low (additive, per-surface rollback, feature flag) |
