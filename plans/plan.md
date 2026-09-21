
# Implementation Plan: Organization & Team Management with Better-Auth

**Last updated**: 2026-09-21

## Overview

Implement comprehensive organization and team management using the Better-Auth organization plugin in a TanStack Start + Convex application. The primary onboarding flows are: (1) users discover organizations via global search and request to join, (2) users accept invitations sent via in-app notifications. Organization creation is open to all authenticated users; the subscription plan gates features within an organization (revised 2026 — see Phase 7). Granular RBAC controls all operations.

## Current State

### Completed

| Phase | Status | Summary |
|-------|--------|---------|
| Phase 1: Schema & Backend Foundation | **COMPLETE** | joinRequest table, auth config, auth client, join request mutations |
| Phase 2: Create Organization Flow | **COMPLETE** | CreateOrganizationDialog, org switcher with real BA data |
| Phase 3: Organization Management UI | **COMPLETE** | Tabbed org page, MembersList, InviteMemberDialog, PendingInvitationsList, OrgSettings |
| Phase 4: Team Management UI | **COMPLETE** | TeamsList, TeamDialog, TeamSwitcherInOrg, sidebar integration |
| Phase 5: Invitation & Notification System | **COMPLETE** | Convex invitation queries, useNotifications/useNotificationActions hooks, notifications page, NotificationCenter dropdown |

### Remaining

| Phase | Status | Summary |
|-------|--------|---------|
| Phase 7 (revised): Org-Feature Subscription Gating | **PENDING** | Creation is deliberately open (decision recorded in `convex/betterAuth/auth.ts`); outstanding: member-limit / feature gating inside orgs, upgrade CTA surfaces |
| Phase 8.4: Invitation Token System | **PENDING** | Shareable token-based URL acceptance (`beforeCreateInvitation`, `getInvitationByToken`, token route) — `/app/invitations` currently handles in-app acceptance only. Verified 2026-09-21: no `token` field, no hook, no `?token=` handling in the route |
| Phase 10: Template Readiness | **IN PROGRESS** | 10.1 test runner + 10.2 typecheck gate **DONE** (2026-09-21). Remaining: 10.3 email, 10.4 de-specialize/cleanup, 10.5 ORPC auth (P8) |

### Completed after plan drift (audited 2026-09-21)

| Phase | Status | Evidence |
|-------|--------|---------|
| Phase 5 (remaining): nav-user bell badge | **COMPLETE** | `src/components/nav-user.tsx` — Notifications menu item with unread badge |
| Phase 6: Organization Discovery & Join Requests | **COMPLETE** | `convex/orgDiscovery.ts` (+ test), `src/routes/_authed/app/browse-organizations.tsx`, `JoinRequestDialog.tsx`, `JoinRequestsAdmin.tsx` wired into org page, cron auto-expiry of stale requests (`convex/crons.ts`) |
| Phase 8: Enhanced RBAC (8.1–8.3, 8.5) | **COMPLETE** | `convex/permissions.ts`, `src/hooks/useOrgRole.ts` used across org components, `cancelled`/`expired` join-request lifecycle + cron expiry |
| Phase 9: Sidebar Switcher Hierarchy & Membership Scoping | **COMPLETE** | See section 9 |

---

## Requirements Summary

| Requirement | Details | Phase |
|-------------|---------|-------|
| **Organizations** | Create (Pro-gated), manage settings, member limits | 2, 3, 7 |
| **Teams** | Create/manage teams within orgs, users in multiple teams | 4 |
| **Memberships** | Multi-org, multi-team per user | 1, 3 |
| **Invitations** | In-app notifications, token-based accept flow | 5, 8 |
| **Organization Discovery** | Global search with Convex search indexes, public profiles, privacy filters | 6 |
| **Join Requests** | Users request to join via discovery, admins approve/reject with status lifecycle | 6 |
| **Subscription Gate** | ~~Only Pro users create orgs~~ → revised: plans gate in-org features (member limits etc.) | 7 |
| **Enhanced RBAC** | Granular permissions for join requests, invitations, tiered admin | 8 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                           │
├──────────┬──────────┬──────────┬──────────┬──────────┬─────────────┤
│ Org       │ Team     │ Org      │ Notif    │ Browse & │ Subscription│
│ Switcher  │ Switcher │ Settings │ Center   │ Search   │ Gate UI     │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┴──────┬──────┘
     │          │          │          │          │            │
     ▼          ▼          ▼          ▼          ▼            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Better-Auth Client API                            │
│  authClient.organization.* / authClient.useListOrganizations()      │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 Convex Backend + Better-Auth                         │
│   Organization Plugin APIs + Custom Join Requests + Search + RBAC   │
└─────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Convex Database                              │
│  organization │ member │ invitation │ team │ teamMember │            │
│  joinRequest  │ subscription (NEW) │ permission (NEW)                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Primary User Workflows

### Workflow A: Discover & Join Organization

1. User navigates to "Browse Organizations" (`/app/browse-organizations`)
2. Search API queries organizations with privacy filter (only `metadata.allowJoinRequests !== false`)
3. User sees organization cards (name, slug, logo, member count)
4. User clicks "Request to Join" → `JoinRequestDialog` opens
5. Optional message submitted via `api.joinRequests.createJoinRequest`
6. Admin receives real-time notification via Convex subscription
7. Admin approves → user added as `member`, status → `approved`
8. User sees approved status in notifications, clicks "Switch to Organization"

### Workflow B: Invitation-Based Onboarding

1. Admin invites user via `InviteMemberDialog` (email + role + optional team)
2. Invitation stored in `invitation` table with unique `token` field
3. Invitee sees invitation in `NotificationCenter` dropdown + `/app/notifications` page
4. User accepts → `authClient.organization.acceptInvitation` → membership created
5. If no active org, auto-switches to the new organization

### Workflow C: Pro-Gated Organization Creation

1. User clicks "Create Organization" in org switcher
2. `CreateOrganizationDialog` checks subscription via `useSubscription()` hook
3. If not Pro: shows `UpgradePlanDialog` with CTA and Stripe Checkout placeholder
4. If Pro: normal creation form shown
5. Backend `beforeCreateOrganization` hook also validates Pro status server-side

---

## Implementation Steps

### Phase 1: Schema & Backend Foundation — COMPLETE

**Files**: `convex/schema.ts`, `convex/betterAuth/auth.ts`, `src/lib/auth-client.ts`, `convex/joinRequests.ts`, `convex/invitations.ts`, `convex/auth_helpers.ts`, `convex/orgCleanup.ts`, `convex/dashboard.ts`

All complete. The `joinRequest` table, auth config with teams + org hooks, auth client with teams enabled, and all join request + invitation CRUD functions are implemented.

### Phase 2: Create Organization Flow — COMPLETE

**Files**: `src/components/organization/CreateOrganizationDialog.tsx`, `src/components/org-switcher.tsx`

All complete. TanStack Form-based dialog, org switcher with session refetch handling.

### Phase 3: Organization Management UI — COMPLETE

**Files**: `src/routes/_authed/app/organization.tsx`, `src/components/organization/MembersList.tsx`, `src/components/organization/InviteMemberDialog.tsx`, `src/components/organization/PendingInvitationsList.tsx`, `src/components/organization/OrgSettings.tsx`

All complete. Five-tab layout, member CRUD, invite dialog, pending invitations, settings with danger zone.

### Phase 4: Team Management UI — COMPLETE

**Files**: `src/components/organization/TeamsList.tsx`, `src/components/organization/TeamDialog.tsx`, `src/components/TeamSwitcherInOrg.tsx`, `src/components/app-sidebar.tsx`

All complete. Teams list, create/edit dialog, in-org team switcher, sidebar integration.

### Phase 5: Invitation & Notification System — COMPLETE (audited 2026-09-21: nav-user integration done)

> Audited 2026-09-21: `nav-user.tsx` now includes the Notifications menu item with unread
> badge (`unreadCount` + destructive `Badge`). Nothing remaining in this phase.

**Completed files**:
- `convex/invitations.ts` — listPendingForUser, getPendingCount, getInvitation
- `src/hooks/useNotifications.ts` — useNotifications, useNotificationCount
- `src/hooks/useNotificationActions.ts` — shared action hook
- `src/routes/_authed/app/notifications.tsx` — full notifications page with tabs (Invitations, Join Requests, System Alerts)
- `src/components/NotificationCenter.tsx` — dropdown bell icon component with badge, accept/decline, join request links

**Remaining**: none.

### Phase 6: Organization Discovery & Join Request System — COMPLETE (audited 2026-09-21)

> Implemented across `convex/orgDiscovery.ts` (+ `orgDiscovery.test.ts`),
> `convex/joinRequests.ts` (full lifecycle incl. `cancelled`/`expired` + scheduled expiry),
> `src/routes/_authed/app/browse-organizations.tsx`, `src/components/organization/JoinRequestDialog.tsx`,
> `JoinRequestsAdmin.tsx` (wired into the org page invitations tab), browse link in the sidebar.
> The original 6.1 mirrored-index fallback was unnecessary — a `search_name` search index exists
> on the organization table (used by the component search query).

#### 6.1 Organization Search API (`convex/orgDiscovery.ts` — NEW FILE)

Create a dedicated module for organization discovery with proper indexing:

**Search Index Setup** (in `convex/schema.ts` or via Better-Auth component schema):
- Add a Convex search index on the `organization` table for full-text search on `name` and `slug`
- If search indexes can't be added to the Better-Auth managed table, use a mirrored `orgSearchIndex` table kept in sync via the `afterCreateOrganization` hook

**Queries**:
- `searchPublicOrganizations(query?, limit?)` — full-text search by name/slug
  - Privacy filter: only show orgs whose metadata marks them as discoverable (check `metadata.allowJoinRequests !== false`)
  - Exclude orgs the user is already a member of
  - Return: id, name, slug, logo, memberCount, createdAt
- `getPublicOrganizationProfile(organizationId)` — safe public profile with member count, team count
  - Returns only fields safe for public consumption (no internal IDs, no member list)

**Implementation detail for search**:
```
Option A (preferred): Convex search index on organization table
  - Add searchIndex: .searchIndex('search_name', ['name'])
  - Use ctx.db.query('organization').withSearchIndex(...)
  
Option B (fallback): Filtered scan with pagination
  - Use .withIndex('by_name') for prefix matching
  - Filter results for privacy settings
```

#### 6.2 Browse Organizations Page (`src/routes/_authed/app/browse-organizations.tsx` — NEW FILE)

- Search input with debounced query (300ms debounce)
- Grid of organization cards (name, slug, logo, member count)
- "Request to Join" button per org (disabled if already requested or already member)
- Sidebar navigation link to this page
- Empty state when no orgs match search
- Loading skeletons

#### 6.3 Join Request Dialog (`src/components/organization/JoinRequestDialog.tsx` — NEW FILE)

- Controlled dialog with org name display
- Optional message textarea
- Calls `api.joinRequests.createJoinRequest`
- Handles duplicate-pending and already-member errors gracefully
- Success feedback with auto-close

#### 6.4 Join Requests Admin in Org Settings

- New component: `src/components/organization/JoinRequestsAdmin.tsx`
- Displayed in the Invitations tab of the org page (alongside PendingInvitationsList)
- List pending requests with user name/email, message, date
- Approve / Reject with confirmation dialogs
- Real-time updates via Convex subscriptions
- Only visible to admin/owner roles

### Phase 7: Subscription & Organization Creation — REVISED / PARTIAL

> **Direction change (decision recorded in `convex/betterAuth/auth.ts`):** organization creation
> is open to all authenticated users; the subscription plan gates features *within* an org
> instead. Infrastructure done: `subscription` table + `convex/subscription.ts`,
> free-plan seeding in `afterCreateOrganization`, `src/hooks/useSubscription.ts`,
> `src/components/organization/UpgradePlanDialog.tsx`, upgrade entry point in `nav-user.tsx`.
>
> **Still open (revised scope):** actual feature gating inside orgs — member limits
> (MembersList/OrgSettings) and any premium-feature checks driven by `useSubscription()`.
> The original 7.4 creation gate and server-side `beforeCreateOrganization` validation are
> intentionally descoped; if that decision is ever reversed, both must be built together
> (client gate alone is bypassable).

#### 7.1 Subscription Schema (`convex/schema.ts`)

Add `subscription` table:
```typescript
subscription: defineTable({
  userId: v.string(),
  plan: v.string(),           // 'free' | 'pro'
  status: v.string(),         // 'active' | 'canceled' | 'past_due'
  stripeCustomerId: v.optional(v.string()),
  stripeSubscriptionId: v.optional(v.string()),
  currentPeriodStart: v.number(),
  currentPeriodEnd: v.number(),
}).index('by_userId', ['userId'])
```

Alternative: store subscription metadata on the `user` table via Better Auth's metadata field.

#### 7.2 Subscription Check Helpers (`convex/subscription.ts` — NEW FILE)

- `getUserSubscription(userId)` — returns current plan
- `canCreateOrganization(userId)` — checks Pro status (plan === 'pro' && status === 'active')
- `requireProSubscription(userId)` — throws if not Pro

#### 7.3 Subscription Hook (`src/hooks/useSubscription.ts` — NEW FILE)

- `useSubscription()` — client-side hook wrapping Convex query for current user's subscription
- Returns `{ plan, status, isPro, isLoading }`

#### 7.4 Gate in CreateOrganizationDialog

- Before showing the form, check subscription status via `useSubscription()`
- If not Pro: show upgrade prompt with "Upgrade to Pro" CTA
- If Pro: show the normal creation form
- The gate is a UI concern; backend also validates in `auth.ts` `beforeCreateOrganization` hook

**Conditional UI rendering logic**:
```
1. Dialog opens → useSubscription() fetches plan
2. isLoading → show skeleton
3. isPro === false → render <UpgradePlanDialog /> instead of creation form
4. isPro === true → render normal creation form with name/slug/logo fields
```

#### 7.5 Payment Gateway Placeholder

- `src/components/organization/UpgradePlanDialog.tsx` — dialog with placeholder for payment integration
- "Coming soon" message or Stripe Checkout redirect stub
- Modular: swap placeholder for real Stripe integration later
- The `nav-user.tsx` "Upgrade to Pro" menu item should also open this dialog

### Phase 8: Enhanced RBAC & Permissions — MOSTLY COMPLETE (audited 2026-09-21)

> 8.1 (permission matrix), 8.2 (`convex/permissions.ts` helpers), 8.3 (join-request lifecycle
> with `cancelled` + cron-driven `expired`), and 8.5 (`src/hooks/useOrgRole.ts` used across
> org management components) are implemented.
> **Only 8.4 (invitation tokens) remains** — see the Remaining table at the top.

#### 8.1 Permission Model Design

Define a granular permission matrix:

| Action | owner | admin | member |
|--------|-------|-------|--------|
| View org settings | ✅ | ✅ | ❌ |
| Update org settings | ✅ | ✅ | ❌ |
| Delete org | ✅ | ❌ | ❌ |
| Invite member | ✅ | ✅ | ❌ |
| Remove member | ✅ | ✅ | ❌ |
| Change member role | ✅ | ✅ | ❌ |
| Create team | ✅ | ✅ | ❌ |
| Delete team | ✅ | ✅ | ❌ |
| Manage team members | ✅ | ✅ | ❌ |
| View join requests | ✅ | ✅ | ❌ |
| Approve/reject join requests | ✅ | ✅ | ❌ |
| Cancel own join request | (self) | (self) | (self) |
| Browse organizations | ✅ | ✅ | ✅ |
| Create organization (revised — open to all, see Phase 7) | ✅ | ✅ | ✅ |

#### 8.2 Backend Permission Helpers (`convex/permissions.ts` — NEW FILE)

- `requireOrgRole(ctx, orgId, roles[])` — verify user has required role
- `canInviteMembers(ctx, orgId)` — check invite permission
- `canManageJoinRequests(ctx, orgId)` — check join request management permission
- Refactor existing role checks in joinRequests.ts and invitations to use shared helpers

**Current state**: Role checks are ad-hoc inline (e.g., `['owner', 'admin'].includes(membership.role)` scattered across `joinRequests.ts`, `MembersList.tsx`, `OrgSettings.tsx`, `useNotifications.ts`). Centralizing into `permissions.ts` reduces duplication and makes the permission model auditable.

#### 8.3 Join Request Lifecycle Enhancement

Current states: `pending`, `approved`, `rejected`
Enhanced states:
- `pending` — awaiting admin review
- `approved` — admin approved, user added as member
- `rejected` — admin rejected
- `cancelled` — user cancelled their own request (currently deletes; change to status update for audit trail)
- `expired` — auto-expire after configurable period (e.g., 30 days)

**Implementation**: Add `cancelled` and `expired` to the status enum. Change `cancelJoinRequest` from `db.delete()` to `db.patch({ status: 'cancelled' })`. Add a scheduled function to auto-expire stale requests.

#### 8.4 Invitation Token System

- Generate a unique `token` field on each invitation (stored in the `invitation` table managed by Better-Auth)
- Invitation accept URL: `/app/invitations?token=<token>` — works even for users not yet logged in
- When accepting: validate token against invitation record, mark as accepted, add member
- Allows sharing invitation links (e.g., via email or chat) beyond just in-app discovery

**Implementation approach**:
1. In `convex/betterAuth/auth.ts`, add a `beforeCreateInvitation` hook that generates a UUID token
2. Store token in the invitation's metadata or as a custom field
3. Add a Convex query `getInvitationByToken(token)` for URL-based lookup
4. Create route `/app/invitations` that reads `?token=` param, looks up invitation, handles accept/decline

#### 8.5 Conditional UI Rendering

- Extract a `useOrgRole()` hook that returns the current user's role in the active org
- Components receive the current user's role and conditionally render actions
- Use it in all org management components for consistent permission enforcement

**`src/hooks/useOrgRole.ts`**:
```typescript
export function useOrgRole() {
  const { data: session } = authClient.useSession()
  const { data: activeOrg } = authClient.useActiveOrganization()
  
  const membership = activeOrg?.members?.find(m => m.userId === session?.user?.id)
  
  return {
    role: membership?.role ?? null,
    isOwner: membership?.role === 'owner',
    isAdmin: membership?.role === 'admin' || membership?.role === 'owner',
    isMember: !!membership,
  }
}
```

---

## Phase 9: Sidebar Switcher Hierarchy & Membership Scoping — COMPLETE

**Problem**: The team switcher (`src/components/TeamSwitcherInOrg.tsx`) shows every team the user
belongs to across **all** their organizations, not just teams in the currently active organization.

### 9.1 Findings (verified against Better Auth source, `better-auth/dist/plugins/organization`)

| Area | Current behavior | Verdict |
|------|------------------|---------|
| Org switcher (`src/components/org-switcher.tsx`) | `authClient.useListOrganizations()` → `/organization/list` → `adapter.listOrganizations(user.id)` — lists orgs **via member records only**; plus a `validatedActiveOrg` cross-session guard | ✅ Already correctly scoped. No change needed. |
| Team switcher data source | `authClient.organization.listUserTeams()` → `/organization/list-user-teams` → `adapter.listTeamsByUser({ userId })` — returns teams across **all** orgs, never filtered by `activeOrganizationId` | ❌ Root cause of the bug |
| Org-scoped team listing | `authClient.organization.listTeams({ query: { organizationId } })` → `/organization/list-teams` — returns all teams of one org; throws FORBIDDEN unless caller is an **org member** (org-level check, not team-level) | ✅ Correct primitive; already used by `TeamsList` |
| Membership resolution | `api.teams.getTeamMembershipStatuses` (`convex/teams.ts`) — one batched Convex query returning `'leader' \| 'member' \| 'pending' \| 'none'` per team for the current user | ✅ Reused as-is |
| Switch enforcement | `setActiveTeam` verifies `findTeamMember(teamId, userId)` server-side and throws `USER_IS_NOT_A_MEMBER_OF_THE_TEAM`; stores `session.activeTeamId` | ✅ Server already prevents illegal switches |
| Hierarchy gap | `setActiveOrganization` writes only `activeOrganizationId` and does **NOT** clear `activeTeamId` — after an org switch the session can carry a stale team ID from the previous org | ⚠️ Fixed client-side: active team derived from `session.activeTeamId` ∩ current org's member teams (stale ID → "Select Team") |
| "View all teams" surface | `/app/organization?tab=teams` (`TeamsList`) already lists **all** teams in the active org with Request to Join / Cancel / Leave / Manage actions, driven by `listTeams` + `getTeamMembershipStatuses` | ✅ Switcher links to it — no new page |

**Default-team membership (verified in `crud-org.mjs` / `crud-invites.mjs`)**:
- **Org creator**: auto-added to a default team (created with the org, named `${org.name}`;
  this repo's `afterCreateOrganization` hook renames it to `${org.name}-org`). Always has ≥1 team.
- **Invited members**: added to a team **only if the invitation carries a `teamId`**
  (`InviteMemberDialog` team picker is optional). Invited without a team → zero team memberships.
- **Org join-request approvals**: add only an org `member` record, no team membership.
- Consequence: "always in a default team" does NOT hold universally → the switcher stays visible
  whenever the active org has any teams, so "View all teams" is always reachable.

**Conclusion: no backend changes required.** All server-side primitives exist; this was a
frontend data-source fix plus defensive active-team derivation.

### 9.2 Fix `TeamSwitcherInOrg.tsx` — DONE

1. **Data source**: replaced `listUserTeams()` with
   `authClient.organization.listTeams({ query: { organizationId: activeOrg.id } })`.
   Shares the react-query key `['organization-teams', activeOrg?.id]` with `TeamsList`
   (one cache, one invalidation path).
2. **Membership filter**: resolves statuses via
   `useConvexQuery(api.teams.getTeamMembershipStatuses, { teamIds })` (skipped when empty).
   Dropdown lists only teams with status `'leader' | 'member'`
   → list = (teams in active org) ∩ (teams I am a member of).
3. **Active team derivation**: read from `session.session.activeTeamId`, matched against the
   filtered member-team list; removed the old `useEffect` that force-selected `teams[0]`.
4. **Selection**: `setActiveTeam({ teamId })` + explicit `refetchSession()` on success
   (dead-atom workaround, same as `useOrgSync` in `org-switcher.tsx`); local `activeTeam` state removed.
5. **Last menu item**: renamed "Manage Teams" → **"View all teams"** → `/app/organization?tab=teams`.
6. **Visibility rule**: renders whenever an active org exists **and the org has ≥1 team**;
   with zero own teams shows a "You haven't joined any teams yet" hint + View all teams.
   Hidden only when the org has no teams at all.
7. **Error handling**: `listTeams` failure → `console.error` + render nothing.

### 9.3 Invalidation consistency — DONE

- `TeamsList.handleLeave` now invalidates `['organization-teams', activeOrg?.id]`
  (was `['user-teams']`, which nothing uses anymore).

### 9.4 Test — DONE (`src/components/TeamSwitcherInOrg.test.tsx`, 13 tests)

Covers: membership/org filtering (non-member and pending teams excluded), stale
`activeTeamId` → "Select Team", active team shows name + "Active" badge, click switches via
`setActiveTeam` + session refetch, "View all teams" navigates to the teams tab, and
render-nothing when the org has no teams. Plus 9.5 behavior tests below.

**Verification**: `bunx vitest run --config .tmp-vitest.invite.config.ts src/components/TeamSwitcherInOrg.test.tsx`
→ 13/13 pass. `bunx tsc --noEmit` → no errors in changed files (14 pre-existing errors elsewhere,
tracked in Phase 10.2; was 18 before the `canManage` fix).
`biome check` clean on changed files (TeamsList has pre-existing import-sort/format warnings, untouched).

**Note (pre-existing, out of scope)**: `InviteMemberDialog.test.tsx` currently fails because
`InviteMemberDialog` uses Convex `useQuery` but the test does not mock `convex/react`.

### 9.5 Active team auto-selection & cross-session memory — DONE

**Problem**: (a) the switcher required manual selection even when the user belongs to teams;
(b) `activeOrganizationId`/`activeTeamId` live on the Better Auth **session record**, so they
reset to null on every logout/login — the user did not return to their previous org/team.

**New helper `src/lib/active-selection.ts`**: localStorage-backed `{ orgId, teamId }` memory
(SSR-guarded): `getRememberedSelection()`, `rememberOrg(orgId)`, `rememberTeam(orgId, teamId)`.

**`org-switcher.tsx` (`useOrgSync`)**:
- Auto-select now prefers the remembered org (validated against the user's org list, so a
  stale/foreign ID falls back to the first org) before falling back to `organizations[0]`.
- Observer effect persists whichever org becomes active — covers manual switching,
  auto-select, and orgs created via `CreateOrganizationDialog` in one place.

**`TeamSwitcherInOrg.tsx`**:
- Auto-select effect: when the session has no *valid* active team (none, stale, or cross-org),
  select the remembered team for this org if the user is still a member, else the first own
  team. Guarded by an org-keyed ref so a failed/rejected selection doesn't loop. Also
  self-heals after leaving the active team (it drops out of ownTeams → reselects).
- Observer effect persists the active team for the active org (covers manual + auto selection).

**Safety**: remembered IDs are always validated against data the server returns for the current
user (org list / org-scoped teams / membership statuses) — a stale or cross-account localStorage
value can never activate something the user does not belong to (server enforces this too).

**Tests added (7)**: auto-select first member team; prefers remembered member team over the
first-own fallback; ignores remembered non-member team; ignores remembered team of another org;
no auto-select when the user has no member teams; no auto-select when a valid team is already
active; active team is persisted to localStorage. The org-switcher preference logic itself is
not unit-tested (no pre-existing harness for it); it is covered by types + manual verification.

---

## Phase 10: Template Readiness — PENDING (audited 2026-09-21)

The organization/team feature work is functionally complete. What remains before this repo
can serve as a starting template is repo health and de-specialization. None of this was
tracked in earlier phases.

### 10.1 Test runner is broken — **DONE** (2026-09-21)

Resolved. New root [`vitest.config.ts`](../vitest.config.ts) defines two vitest projects —
`convex` (edge-runtime, `convex/**/*.test.ts`) and `web` (jsdom + React, `src/**/*.test.{ts,tsx}`)
— and takes precedence over `vite.config.ts`, so the Cloudflare plugin is never loaded during
tests. `.kilo/**` is excluded so stale worktree copies are not collected twice.
`.tmp-vitest.invite.config.ts` folded in and deleted.

Both suites were also genuinely broken and are now fixed:
- `convex/orgDiscovery.test.ts` passed the *betterAuth* schema as the app schema and never
  registered the component. Now registers it (`t.registerComponent('betterAuth', …)`) against
  the app schema. It also faked identity with arbitrary strings; Better Auth's `getAuthUser`
  resolves a caller by session `_id === identity.sessionId` **then** user `_id === identity.subject`,
  so a new `signIn()` helper creates both records and returns a client acting as that user.
- `InviteMemberDialog.test.tsx` rendered a component calling Convex `useQuery` with no provider.
  `convex/react` is now mocked (the org invitation-validity setting is not what these tests cover).

**Verification**: `bun run test` → 3 files, 18 tests, all passing.

<details><summary>Original finding</summary>

- `bun run test` does not start: the root `test` script uses [`vite.config.ts`](../vite.config.ts),
  whose Cloudflare workers pool fails with
  `Error: [module runner] Dynamic access of "import.meta.env" is not supported`.
  No test has run from the project's own script in months.
- Two test harness configs exist outside the package scripts:
  [`convex/vitest.config.ts`](../convex/vitest.config.ts) (edge-runtime, for convex-test) and
  `.tmp-vitest.invite.config.ts` (jsdom + react) — the latter is a temp file that Phase 9.4
  documents as the command for running component tests.
- `convex/orgDiscovery.test.ts` fails (2/2) in convex-test function resolution.
- `InviteMemberDialog.test.tsx` fails — uses Convex `useQuery` without mocking `convex/react`.
- Running the convex config unscoped also picks up test files from the stale
  `.kilo/worktrees/hissing-bestseller/` copy (see 10.4).
</details>

### 10.2 No typecheck gate — **DONE** (2026-09-21)

`package.json` has no `typecheck` script, so `tsc` errors accumulate unnoticed. This is how the
`canManage` ReferenceError in `OrgSettings.tsx` reached the working tree — the build does not
typecheck, so it built fine while the Settings tab crashed on render (fixed 2026-09-21).

`"typecheck": "tsc --noEmit"` added to `package.json`; **all 14 errors cleared**,
`bun run typecheck` exits 0. Notable fixes rather than deletions:

- `nav-secondary.tsx` typed its icon prop from the uninstalled `@tabler/icons-react`. The icons
  passed to it are lucide icons, so it now uses `LucideIcon` — no new dependency.
- `ImageField.tsx` imported a type from `@/hooks/use-image-upload`, a hook that does not exist.
  Replaced with a local structural `ImageUpload` interface matching what the component
  destructures. (`ImageField` itself is re-exported but unused — flagged, not deleted.)
- `login-signup.tsx` used router `<Link to="/terms-of-service">` and `<Link to="#">` for
  placeholder legal pages that are not routes; now plain `<a href>`.
- `fieldVariants` is now exported from `ui/field.tsx` (it was declared but not exported).

Still outstanding: wire `typecheck` + `test` + `build` into CI.

<details><summary>Original finding (14 errors)</summary>

| Kind | Locations |
|------|-----------|
| Unused imports/vars (TS6133) | `convex/invitations.ts:3`, `convex/orgDiscovery.test.ts:3,38`, `src/components/organization/TeamDialog.tsx:4`, `src/lib/utils.ts:2`, `src/routes/_public/route.tsx:1`, `src/server.ts:11` |
| Type-only imports of absent modules (TS2307) | `src/components/nav-secondary.tsx:3` (`@tabler/icons-react`, not installed), `src/components/form-fields/ImageField.tsx:11` (`@/hooks/use-image-upload`, does not exist) — erased at build, so runtime is unaffected |
| Invalid route literals (TS2322) | `src/components/mvpblocks/login-signup.tsx:267,274` — `/terms-of-service` and `#` are not routes |
| Misc | `src/hooks/tanstack-form.tsx:29` (`fieldVariants` not exported from `ui/field`), `src/lib/demo-store-devtools.tsx:25,40` |
</details>

### 10.3 Email is not implemented — **BLOCKER for the invite flow**

`sendInvitationEmail` in [`convex/betterAuth/auth.ts`](../convex/betterAuth/auth.ts) is a
`console.log` stub. There is no verification email and no password reset
(`requireEmailVerification: false`). For an invite-driven org template this is the largest
functional hole. Tracked as P6 in [`auth-production-grade.md`](./auth-production-grade.md).

**Goal**: a real provider (Resend) behind a Convex action, invoked from `sendInvitationEmail`;
then password reset + optional email verification. Pairs naturally with Phase 8.4 — token-based
invite URLs are what the email would carry.

### 10.4 De-specialize and clean

- `appName: 'Sailing Club App'` is hardcoded in the auth config — make it config/env-driven.
- Demo cruft to remove: `src/routes/demo/*`, `convex/todos.ts`, `convex/people.ts`,
  `convex/testAuth.ts`, `src/lib/demo-store-devtools.tsx`.
- Dead files: `convex/invitations.ts.bak`, `.tmp-vitest.invite.config.ts` (after 10.1).
- Stale 63MB `.kilo/worktrees/` — delete, and gitignore `.kilo/` and `graft/`.
- No social login (email/password only); most templates want GitHub/Google.

### 10.5 Carry-over from the auth audit

[`auth-production-grade.md`](./auth-production-grade.md) is largely resolved — P1/P2 (readiness
gate, `src/hooks/useConvexAuthReady.ts`), P3 (error boundary in `_authed/route.tsx`), P4
(duplicate `requireAuth` removed from `people.ts`), P5 (`requireAuth` / `getOptionalAuth`
convention in `auth_helpers.ts`), P7 (cursor-loop pagination in `orgCleanup.ts`), and P10
(session-cleanup cron) are all done.

Still open: **P6** (email — see 10.3), **P8** (ORPC procedures in `src/orpc/router/` enforce no
auth; `api.$.ts` forwards a bearer token as context but no procedure checks it), **P9**
(`as any` casts around the adapter).

### 10.6 Suggested order

1. ~~10.2 typecheck gate → 10.1 test runner~~ — **DONE 2026-09-21**
2. 10.4 cleanup (largest diff, lowest risk, best done while tests are green)
3. 10.3 email + Phase 8.4 invitation tokens (one coherent piece of work)
4. 10.5 P8 ORPC auth, then Phase 7 revised in-org feature gating

---

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | `convex/joinRequests.ts`, `convex/invitations.ts`, `convex/orgCleanup.ts`, `convex/dashboard.ts` | `convex/schema.ts`, `convex/betterAuth/auth.ts`, `convex/auth_helpers.ts`, `src/lib/auth-client.ts` |
| 2 | `src/components/organization/CreateOrganizationDialog.tsx` | `src/components/org-switcher.tsx` |
| 3 | `src/components/organization/MembersList.tsx`, `InviteMemberDialog.tsx`, `PendingInvitationsList.tsx`, `OrgSettings.tsx` | `src/routes/_authed/app/organization.tsx` |
| 4 | `src/components/organization/TeamsList.tsx`, `TeamDialog.tsx`, `src/components/TeamSwitcherInOrg.tsx` | `src/components/app-sidebar.tsx` |
| 5 (done) | `src/hooks/useNotifications.ts`, `useNotificationActions.ts`, `src/routes/_authed/app/notifications.tsx`, `src/components/NotificationCenter.tsx` | (none) |
| 5 (remaining) | — | **DONE** (`src/components/nav-user.tsx` badge integrated) |
| 6 | `convex/orgDiscovery.ts`, `src/routes/_authed/app/browse-organizations.tsx`, `src/components/organization/JoinRequestDialog.tsx`, `src/components/organization/JoinRequestsAdmin.tsx` | `convex/joinRequests.ts` (add search queries or move to orgDiscovery), `src/routes/_authed/app/organization.tsx` (admin join requests in invitations tab), `src/components/app-sidebar.tsx` (browse link) |
| 7 | `convex/subscription.ts`, `src/hooks/useSubscription.ts`, `src/components/organization/UpgradePlanDialog.tsx` | `convex/schema.ts` (subscription table), `src/components/organization/CreateOrganizationDialog.tsx` (gate), `convex/betterAuth/auth.ts` (creation hook), `src/components/nav-user.tsx` (upgrade CTA) |
| 8 | `convex/permissions.ts`, `src/hooks/useOrgRole.ts` | `convex/joinRequests.ts` (lifecycle), `convex/invitations.ts` (tokens), all org management components (role hooks) |
| 9 | `src/lib/active-selection.ts` (new), `src/components/TeamSwitcherInOrg.test.tsx` (new) | `src/components/TeamSwitcherInOrg.tsx` (data source + membership filter + session-derived active team + auto-select/persistence), `src/components/organization/TeamsList.tsx` (query-key invalidation only), `src/components/org-switcher.tsx` (remembered-org auto-select + persistence) |
| 10 | vitest workspace/projects config, email action (Resend) | `package.json` (`typecheck` + fixed `test` scripts), `convex/betterAuth/auth.ts` (`appName`, `sendInvitationEmail`), `.gitignore`; deletions: `src/routes/demo/*`, `convex/todos.ts`, `convex/people.ts`, `convex/testAuth.ts`, `convex/invitations.ts.bak`, `.tmp-vitest.invite.config.ts`, `.kilo/worktrees/` |

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| Better-Auth schema conflicts with Convex | High | Use local component schema; regenerate with CLI |
| Search performance on large org lists | Medium | Convex search indexes; limit results; debounce queries |
| Subscription bypass (client-side only check) | High | Server-side validation in all creation paths |
| Join request spam | Medium | Rate limit per user per org; auto-expire stale requests |
| RBAC regression in existing features | Medium | Shared permission helpers; test all role-action combinations |
| Notification polling performance | N/A | Already using Convex real-time subscriptions (no polling) |

---

## Success Criteria

- [x] Users can create organizations and become owner
- [x] Users can be invited to organizations (in-app, no email)
- [x] Users see pending invitations in notification center
- [x] Users can accept/decline invitations
- [x] Users can discover organizations via global search (audited 2026-09-21)
- [x] Users can request to join organizations (audited 2026-09-21)
- [x] Admins can approve/reject join requests (audited 2026-09-21)
- [x] Teams can be created within organizations
- [x] Users can belong to multiple teams within an org
- [x] Team switcher appears when organization is active
- [x] Organization switcher works with real data
- [x] Team switcher lists only teams the user is a member of **in the active organization** (Phase 9)
- [x] Team switcher offers "View all teams" → org teams tab with join-request actions (Phase 9)
- [x] Active team derived from session and cleared-looking when switching orgs (stale ID never displayed) (Phase 9)
- [x] Member team auto-selected as active when none is valid (Phase 9.5)
- [x] User returns to the same organization and team after logging in again (Phase 9.5)
- [ ] Org-feature gating: member limits enforced via subscription (Phase 7 revised scope)
- [x] Granular RBAC enforced across all operations (centralized `permissions.ts` + `useOrgRole`, audited 2026-09-21)
- [ ] Invitation tokens work for URL-based acceptance (Phase 8.4)
- [x] `bun run test` runs all suites green (Phase 10.1 — 18/18, 2026-09-21)
- [x] `bun run typecheck` exits clean (Phase 10.2 — 2026-09-21)
- [ ] Invitation emails actually send (Phase 10.3)
- [ ] Repo is de-specialized: no hardcoded app name, no demo cruft (Phase 10.4)

> Note: the original criteria "Only Pro users can create organizations" and "Member limits
> enforced (subscription-gated creation)" were superseded by the decision that creation is
> open to all users and plans gate in-org features instead (see Phase 7).
