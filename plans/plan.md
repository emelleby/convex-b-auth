
# Implementation Plan: Organization & Team Management with Better-Auth

**Last updated**: 2026-05-07

## Overview

Implement comprehensive organization and team management using the Better-Auth organization plugin in a TanStack Start + Convex application. The primary onboarding flows are: (1) users discover organizations via global search and request to join, (2) users accept invitations sent via in-app notifications. Organization creation is gated behind a Pro subscription with a modular payment placeholder. Granular RBAC controls all operations.

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
| Phase 5 (remaining) | **PENDING** | nav-user bell badge integration (NotificationCenter exists but not wired into sidebar user menu) |
| Phase 6: Organization Discovery & Join Requests | **PENDING** | Search API with indexing, browse page, join request dialog, admin management |
| Phase 7: Subscription-Gated Org Creation | **PENDING** | Pro tier gate, payment placeholder, conditional UI |
| Phase 8: Enhanced RBAC & Permissions | **PENDING** | Granular permissions, tiered admin, invitation token lifecycle |

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
| **Subscription Gate** | Only Pro users create orgs, payment gateway placeholder | 7 |
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

### Phase 5: Invitation & Notification System — COMPLETE (except nav-user integration)

**Completed files**:
- `convex/invitations.ts` — listPendingForUser, getPendingCount, getInvitation
- `src/hooks/useNotifications.ts` — useNotifications, useNotificationCount
- `src/hooks/useNotificationActions.ts` — shared action hook
- `src/routes/_authed/app/notifications.tsx` — full notifications page with tabs (Invitations, Join Requests, System Alerts)
- `src/components/NotificationCenter.tsx` — dropdown bell icon component with badge, accept/decline, join request links

**Remaining**:
- Update `src/components/nav-user.tsx` — integrate NotificationCenter `<Bell>` badge next to user avatar (currently just a plain link to `/app/notifications`)

### Phase 6: Organization Discovery & Join Request System — PENDING

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

### Phase 7: Subscription-Gated Organization Creation — PENDING

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

### Phase 8: Enhanced RBAC & Permissions — PENDING

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
| Create organization (Pro) | plan-gated | plan-gated | plan-gated |

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

## File Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | `convex/joinRequests.ts`, `convex/invitations.ts`, `convex/orgCleanup.ts`, `convex/dashboard.ts` | `convex/schema.ts`, `convex/betterAuth/auth.ts`, `convex/auth_helpers.ts`, `src/lib/auth-client.ts` |
| 2 | `src/components/organization/CreateOrganizationDialog.tsx` | `src/components/org-switcher.tsx` |
| 3 | `src/components/organization/MembersList.tsx`, `InviteMemberDialog.tsx`, `PendingInvitationsList.tsx`, `OrgSettings.tsx` | `src/routes/_authed/app/organization.tsx` |
| 4 | `src/components/organization/TeamsList.tsx`, `TeamDialog.tsx`, `src/components/TeamSwitcherInOrg.tsx` | `src/components/app-sidebar.tsx` |
| 5 (done) | `src/hooks/useNotifications.ts`, `useNotificationActions.ts`, `src/routes/_authed/app/notifications.tsx`, `src/components/NotificationCenter.tsx` | (none) |
| 5 (remaining) | (none) | `src/components/nav-user.tsx` |
| 6 | `convex/orgDiscovery.ts`, `src/routes/_authed/app/browse-organizations.tsx`, `src/components/organization/JoinRequestDialog.tsx`, `src/components/organization/JoinRequestsAdmin.tsx` | `convex/joinRequests.ts` (add search queries or move to orgDiscovery), `src/routes/_authed/app/organization.tsx` (admin join requests in invitations tab), `src/components/app-sidebar.tsx` (browse link) |
| 7 | `convex/subscription.ts`, `src/hooks/useSubscription.ts`, `src/components/organization/UpgradePlanDialog.tsx` | `convex/schema.ts` (subscription table), `src/components/organization/CreateOrganizationDialog.tsx` (gate), `convex/betterAuth/auth.ts` (creation hook), `src/components/nav-user.tsx` (upgrade CTA) |
| 8 | `convex/permissions.ts`, `src/hooks/useOrgRole.ts` | `convex/joinRequests.ts` (lifecycle), `convex/invitations.ts` (tokens), all org management components (role hooks) |

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
- [ ] Users can discover organizations via global search
- [ ] Users can request to join organizations
- [ ] Admins can approve/reject join requests
- [x] Teams can be created within organizations
- [x] Users can belong to multiple teams within an org
- [x] Team switcher appears when organization is active
- [x] Organization switcher works with real data
- [ ] Member limits enforced (subscription-gated creation)
- [ ] Only Pro users can create organizations
- [ ] Granular RBAC enforced across all operations
- [ ] Invitation tokens work for URL-based acceptance
