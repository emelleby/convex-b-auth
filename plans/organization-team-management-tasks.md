# Organization & Team Management - Developer Task Specifications

**Project**: Convex + Better-Auth Organization Plugin Implementation
**Created**: 2026-03-17
**Last updated**: 2026-05-07
**Total Estimated Time**: ~100-130 hours
**Phases**: 8

---

## Progress Tracking

> **Full QA checklist**: See [`master-testing-acceptance-protocol.md`](./master-testing-acceptance-protocol.md) for all acceptance criteria and test steps across every phase.

### Phase 1: Schema & Backend Foundation (~12-16 hours)
- ✅ Task 1.1: Add joinRequest Table to Convex Schema - **COMPLETE**
- ✅ Task 1.2: Update Invitation Table with teamId Field - **COMPLETE**
- ✅ Task 1.3: Update Auth Client with Teams Configuration - **COMPLETE**
- ✅ Task 1.4: Update Auth Server with Member Limits and Invitation Hooks - **COMPLETE**
- ✅ Task 1.5: Create Join Request Convex Functions - Part 1 (Create & List) - **COMPLETE**
- ✅ Task 1.6: Create Join Request Convex Functions - Part 2 (Approve/Reject/Cancel) - **COMPLETE**

### Phase 2: Create Organization Flow (~6-8 hours) ← **MOVED EARLIER FOR TESTING**
- ✅ Task 2.1: Create Organization Dialog - **COMPLETE**
- ✅ Task 2.2: Integrate Create Organization in Switcher - **COMPLETE**

### Phase 3: Organization Management UI (~18-24 hours)
- ✅ Task 3.1: Create Organization Page Layout with Tabs - **COMPLETE**
- ✅ Task 3.2: Create Members List Component - **COMPLETE**
- ✅ Task 3.3: Create Invite Member Dialog - **COMPLETE**
- ✅ Task 3.4: Create Pending Invitations List Component - **COMPLETE**
- ✅ Task 3.5: Create Organization Settings Component - **COMPLETE**

### Phase 4: Team Management UI (~14-18 hours)
- ✅ Task 4.1: Create Teams List Component - **COMPLETE**
- ✅ Task 4.2: Create Team Dialog Component - **COMPLETE** (Fixed: API call now uses `data: { name }` wrapper and form default values populate with team name for editing)
- ✅ Task 4.3: Create Team Switcher Component - **COMPLETE**
- ✅ Task 4.4: Update App Sidebar with Team Switcher - **COMPLETE**

### Phase 5: Invitation System - In-App Notifications (~12-16 hours)
- ✅ Task 5.1: Create Convex Invitation Queries - **COMPLETE**
- ✅ Task 5.2: Create useNotifications Hook - **COMPLETE**
- ✅ Task 5.3: Create Notification Center Component - **COMPLETE** (dropdown bell with badge, accept/decline, join request links — `src/components/NotificationCenter.tsx`)
- ✅ Task 5.4: Create Full Notifications Page - **COMPLETE**
- ✅ Task 5.5: Update badge Notification Center - **PENDING** (integrate NotificationCenter `<Bell>` badge in the user menu's avatar in sidebar; currently just a plain link to `/app/notifications`). There is already an implementation of this in the NotificationCenter.tsx file. Just the badge with the count. The link stays the same.

### Phase 6: Organization Discovery & Join Request System (~14-18 hours)
- ⏳ Task 6.1: Organization Search API with Privacy Filters - **PENDING**
- ⏳ Task 6.2: Browse Organizations Page - **PENDING**
- ⏳ Task 6.3: Join Request Dialog - **PENDING**
- ⏳ Task 6.4: Join Requests Admin in Org Settings - **PENDING**
- ⏳ Task 6.5: Join Request Lifecycle Enhancements - **PENDING**

### Phase 7: Subscription-Gated Organization Creation (~8-12 hours)
- ⏳ Task 7.1: Subscription Schema & Backend - **PENDING**
- ⏳ Task 7.2: Subscription Check Helpers - **PENDING**
- ⏳ Task 7.3: Gate CreateOrganizationDialog - **PENDING**
- ⏳ Task 7.4: Payment Gateway Placeholder - **PENDING**

### Phase 8: Enhanced RBAC & Permissions (~10-14 hours)
- ⏳ Task 8.1: Permission Model & Backend Helpers - **PENDING**
- ⏳ Task 8.2: useOrgRole Hook & Conditional UI - **PENDING**
- ⏳ Task 8.3: Invitation Token System - **PENDING**
- ⏳ Task 8.4: Refactor Existing Role Checks - **PENDING**

---

## Table of Contents

1. ~~Phase 1: Schema & Backend Foundation~~ — **COMPLETE** (condensed below)
2. ~~Phase 2: Create Organization Flow~~ — **COMPLETE** (condensed below)
3. ~~Phase 3: Organization Management UI~~ — **COMPLETE** (condensed below)
4. ~~Phase 4: Team Management UI~~ — **COMPLETE** (condensed below)
5. ~~Phase 5: Invitation System~~ — **MOSTLY COMPLETE** (condensed below; Task 5.5 pending)
6. [Phase 6: Organization Discovery & Join Request System](#phase-6-join-request-system) — **PENDING**
7. [Phase 7: Subscription-Gated Organization Creation](#phase-7-subscription-gated-organization-creation) — **PENDING**
8. [Phase 8: Enhanced RBAC & Permissions](#phase-8-enhanced-rbac--permissions) — **PENDING**

> **QA Reference**: All acceptance criteria and test checklists for every phase (including completed) are consolidated in [`master-testing-acceptance-protocol.md`](./master-testing-acceptance-protocol.md).

## Reference Documentation

- **Better-Auth Organization Plugin**: `/home/eivind/emelleby/convex-b-auth/docs/better-auth-docs/organization-plugin.md`
- **Convex Schema Pattern**: `convex/schema.ts`
- **Auth Client Usage**: `src/lib/auth-client.ts`
- **Auth Server Config**: `convex/auth.ts`
- **Team Switcher Pattern**: `src/components/team-switcher.tsx`
- **Convex Function Patterns**: `convex/todos.ts`, `convex/people.ts`
- **Auth Helper Pattern**: `convex/auth_helpers.ts`
- **TanStack Query + Convex Demo**: `src/routes/demo/tanstack-query.tsx`

---

## Data Fetching Patterns

> **IMPORTANT**: This section defines the standard data fetching patterns for all organization-related components.

### Recommended Approach: TanStack Query + Better-Auth API

For data managed by Better-Auth (members, teams, invitations, organizations), use **TanStack Query** to wrap Better-Auth API calls. This provides:

- ✅ Proper loading/error states (`isLoading`, `isError`, `error`)
- ✅ Cache management and invalidation
- ✅ Consistency with TanStack Table integration
- ✅ Support for optimistic updates when needed
- ✅ No need to create additional Convex queries for Better-Auth data

### Standard Query Pattern

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"

export function MyComponent() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const queryClient = useQueryClient()

  // Query: Fetch data with TanStack Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['resource-name', activeOrg?.id],
    queryFn: () => authClient.organization.someApiCall({
      organizationId: activeOrg?.id,
    }),
    enabled: !!activeOrg?.id,  // Only run when org is available
  })

  // Mutation: Modify data and invalidate cache
  const mutation = useMutation({
    mutationFn: (args) => authClient.organization.someModifyCall(args),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['resource-name', activeOrg?.id]
      })
    },
  })

  // Use data...
  const items = data?.data ?? []
}
```

### Query Key Conventions

Use consistent query keys for cache management:

| Resource                 | Query Key                                      |
| ------------------------ | ---------------------------------------------- |
| Organization Members     | `['organization-members', organizationId]`     |
| Organization Teams       | `['organization-teams', organizationId]`       |
| Organization Invitations | `['organization-invitations', organizationId]` |
| Team Members             | `['team-members', teamId]`                     |
| User Invitations         | `['user-invitations', userId]`                 |
| Join Requests (Admin)    | `['join-requests', organizationId]`            |
| My Join Requests         | `['my-join-requests', userId]`                 |
| Public Organizations     | `['public-organizations', query]`              |
| User Subscription        | `['user-subscription', userId]`                |

### When to Use Convex useQuery Instead

Use Convex's reactive `useQuery` (from `convex/react`) when:

1. **Data is stored in Convex tables we control** (not Better-Auth managed)
2. **Real-time updates are critical** (e.g., multiple admins working simultaneously)
3. **Data comes from custom Convex queries** (e.g., `joinRequests.ts`)

```typescript
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

// For Convex-managed data with real-time reactivity
const joinRequests = useQuery(api.joinRequests.listPendingJoinRequests, {
  organizationId
})
```

### Anti-Patterns to Avoid

❌ **DO NOT** use `useEffect` with manual state management for data fetching:

```typescript
// ❌ AVOID THIS PATTERN
const [data, setData] = useState(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  const fetchData = async () => {
    setLoading(true)
    const result = await authClient.organization.listMembers()
    setData(result.data)
    setLoading(false)
  }
  fetchData()
}, [])
```

This approach lacks cache management, is prone to race conditions, and doesn't integrate well with the TanStack ecosystem.

---

## Phase 1: Schema & Backend Foundation — COMPLETE

**Files**: `convex/schema.ts`, `convex/auth.ts`, `src/lib/auth-client.ts`, `convex/joinRequests.ts`
**Time**: ~12-16 hours (estimated)

All tasks complete:
- ✅ Task 1.1: `joinRequest` table with three indexes
- ✅ Task 1.2: `invitation` table updated with `teamId` field
- ✅ Task 1.3: Auth client configured with `teams: { enabled: true }`
- ✅ Task 1.4: Auth server with `membershipLimit`, `sendInvitationEmail` no-op hook, `teams.maximumTeams: 10`
- ✅ Task 1.5: `createJoinRequest`, `listMyJoinRequests`, `listPendingJoinRequests` in `convex/joinRequests.ts`
- ✅ Task 1.6: `approveJoinRequest`, `rejectJoinRequest`, `cancelJoinRequest` in `convex/joinRequests.ts`

> Acceptance criteria and test steps: see [master-testing-acceptance-protocol.md — Phase 1](./master-testing-acceptance-protocol.md#phase-1-schema--backend-foundation)

---

## Phase 2: Create Organization Flow — COMPLETE

**Files**: `src/components/organization/CreateOrganizationDialog.tsx`, `src/components/team-switcher.tsx`, `src/components/app-sidebar.tsx`
**Time**: ~6-8 hours (estimated)

All tasks complete:
- ✅ Task 2.1: `CreateOrganizationDialog` with auto-slug, validation, controlled/uncontrolled modes
- ✅ Task 2.2: Org switcher with real Better-Auth data, loading/empty states, creation integrated

> Acceptance criteria and test steps: see [master-testing-acceptance-protocol.md — Phase 2](./master-testing-acceptance-protocol.md#phase-2-create-organization-flow)

---

## Phase 3: Organization Management UI — COMPLETE

**Files**: `src/routes/_authed/app/organization.tsx`, `src/components/organization/MembersList.tsx`, `InviteMemberDialog.tsx`, `PendingInvitationsList.tsx`, `OrgSettings.tsx`
**Time**: ~18-24 hours (estimated)

All tasks complete:
- ✅ Task 3.1: Tabbed org page layout (Overview, Members, Teams, Invitations, Settings)
- ✅ Task 3.2: `MembersList` with role changes, removal, confirmation dialogs
- ✅ Task 3.3: `InviteMemberDialog` with email validation, role selection
- ✅ Task 3.4: `PendingInvitationsList` with cancel functionality
- ✅ Task 3.5: `OrgSettings` with edit form, danger zone (owner-only delete)

> Acceptance criteria and test steps: see [master-testing-acceptance-protocol.md — Phase 3](./master-testing-acceptance-protocol.md#phase-3-organization-management-ui)

---

## Phase 4: Team Management UI — COMPLETE

**Files**: `src/components/organization/TeamsList.tsx`, `TeamDialog.tsx`, `src/components/TeamSwitcherInOrg.tsx`, `src/components/app-sidebar.tsx`
**Time**: ~14-18 hours (estimated)

All tasks complete:
- ✅ Task 4.1: `TeamsList` with create/delete, admin-only controls
- ✅ Task 4.2: `TeamDialog` with create/edit modes, `data: { name }` wrapper
- ✅ Task 4.3: `TeamSwitcherInOrg` sidebar component with active team indicator
- ✅ Task 4.4: Sidebar integration with contextual team switcher visibility

> Acceptance criteria and test steps: see [master-testing-acceptance-protocol.md — Phase 4](./master-testing-acceptance-protocol.md#phase-4-team-management-ui)

---

## Phase 5: Invitation System — In-App Notifications — MOSTLY COMPLETE

**Files**: `convex/invitations.ts`, `src/hooks/useNotifications.ts`, `useNotificationActions.ts`, `src/routes/_authed/app/notifications.tsx`, `src/components/NotificationCenter.tsx`
**Time**: ~12-16 hours (estimated)

- ✅ Task 5.1: Convex invitation queries (`listPendingForUser`, `getPendingCount`, `getInvitation`) with real-time reactivity
- ✅ Task 5.2: `useNotifications` and `useNotificationCount` hooks using Convex subscriptions
- ✅ Task 5.3: `NotificationCenter` dropdown with bell badge, accept/decline, join request links
- ✅ Task 5.4: Full notifications page at `/app/notifications` with tabs, `useNotificationActions` shared hook
- ⏳ Task 5.5: Integrate bell badge in `nav-user.tsx` — **PENDING** (implementation exists in `NotificationCenter.tsx`, needs wiring into sidebar user menu)

> Acceptance criteria and test steps: see [master-testing-acceptance-protocol.md — Phase 5](./master-testing-acceptance-protocol.md#phase-5-invitation-system--in-app-notifications)
---

## Phase 6: Join Request System

### Task 6.1: Organization Search API with Privacy Filters

**Complexity**: Medium (3-4 hours)

**Dependencies**: Task 1.4, 1.5, 1.6 complete

**Context**:
For users to request joining organizations, they need a way to discover organizations that accept join requests. This task creates a dedicated discovery module with proper search indexing and privacy filtering.

**Requirements**:
- **File to create**: `convex/orgDiscovery.ts` (new dedicated module)
- **File to modify**: `convex/schema.ts` (add search index if using mirrored table)
- Convex search index on organization name/slug for full-text search
- Privacy filter: only show orgs whose metadata marks them as discoverable
- Exclude orgs the user is already a member of
- Return only public-safe fields (no internal IDs, no member list)

**Search Index Strategy**:
- **Option A (preferred)**: Add a Convex search index directly on the `organization` table via `.searchIndex('search_name', ['name'])`. Use `ctx.db.query('organization').withSearchIndex('search_name', q => q.search('name', query))`.
- **Option B (fallback)**: If the Better-Auth component schema doesn't support custom search indexes, create a mirrored `orgSearchMeta` table kept in sync via the `afterCreateOrganization` hook, with its own search index.
- **Option C (minimal)**: Use `.withIndex('by_name')` for prefix matching + client-side filtering for privacy. This is the simplest but doesn't scale past ~1000 orgs.

Start with Option A. If the Better-Auth component schema rejects custom indexes, fall back to Option B.

**Implementation Steps**:

1. Create `convex/orgDiscovery.ts`:
2. Add organization search function:

```typescript
import { query } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth } from './auth_helpers'

export const searchPublicOrganizations = query({
  args: {
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const limit = args.limit ?? 20

    // Option A: Use search index (preferred)
    // const orgs = await ctx.db
    //   .query('organization')
    //   .withSearchIndex('search_name', (q) =>
    //     q.search('name', args.query ?? '').eq('metadata.allowJoinRequests', true)
    //   )
    //   .take(limit)

    // Option C: Filtered scan (fallback for initial implementation)
    let orgs = await ctx.db
      .query('organization')
      .order('desc')
      .take(limit * 2)

    // Filter by search query if provided
    if (args.query && args.query.trim()) {
      const searchLower = args.query.toLowerCase()
      orgs = orgs.filter(
        (org) =>
          org.name.toLowerCase().includes(searchLower) ||
          (org.slug && org.slug.toLowerCase().includes(searchLower))
      )
    }

    // Privacy filter: only show discoverable orgs
    // Check org.metadata.allowJoinRequests !== false (default: discoverable)
    orgs = orgs.filter((org) => {
      const metadata = org.metadata as Record<string, unknown> | undefined
      return !metadata || metadata.allowJoinRequests !== false
    })

    // Exclude orgs the user is already a member of
    const userMemberships = await ctx.db
      .query('member')
      .withIndex('by_userId', (q) => q.eq('userId', user.id))
      .collect()
    const memberOrgIds = new Set(userMemberships.map((m) => m.organizationId))

    return orgs
      .filter((org) => !memberOrgIds.has(org.id))
      .slice(0, limit)
      .map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        createdAt: org.createdAt,
      }))
  },
})

export const getPublicOrganizationProfile = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx)

    const org = await ctx.db
      .query('organization')
      .filter((q) => q.eq(q.field('id'), args.organizationId))
      .first()

    if (!org) {
      throw new Error('Organization not found')
    }

    // Get member count
    const members = await ctx.db
      .query('member')
      .withIndex('by_organizationId', (q) => q.eq('organizationId', org.id))
      .collect()

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      memberCount: members.length,
      createdAt: org.createdAt,
    }
  },
})
```

3. Add index to member table if not exists (check schema):
   - `by_organizationId` on member table

**Acceptance Criteria**:
- [ ] `convex/orgDiscovery.ts` exists as a dedicated module
- [ ] `searchPublicOrganizations` query exists with privacy filter
- [ ] Search filters by name and slug (with search index or fallback)
- [ ] Orgs the user is already a member of are excluded
- [ ] Returns limited, safe public data only
- [ ] `getPublicOrganizationProfile` returns org details with member count
- [ ] All queries require authentication

**Testing Instructions**:
1. Call searchPublicOrganizations with no query - should return orgs
2. Call with search query - should filter results
3. Call getPublicOrganizationProfile with valid org ID
4. Verify member count is accurate

**Definition of Done**: Organization discovery queries work correctly.

---

### Task 6.2: Create Browse Organizations Page

**Complexity**: Medium (3-4 hours)

**Dependencies**: Task 5.1 complete

**Context**:
A page where users can browse and search for organizations to request joining.

**Requirements**:
- **File to create**: `src/routes/_authed/app/browse-organizations.tsx`
- Search input for filtering organizations
- Grid/list of organization cards
- "Request to Join" button per organization

**Implementation Steps**:

1. Create `src/routes/_authed/app/browse-organizations.tsx`:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Search, Building2, Users } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import JoinRequestDialog from '@/components/organization/JoinRequestDialog'

export const Route = createFileRoute('/_authed/app/browse-organizations')({
  component: BrowseOrganizationsPage,
})

function BrowseOrganizationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)

  // Debounce search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // Simple debounce with setTimeout
    setTimeout(() => setDebouncedQuery(value), 300)
  }

  const organizations = useQuery(api.orgDiscovery.searchPublicOrganizations, {
    query: debouncedQuery || undefined,
    limit: 20,
  })

  const myJoinRequests = useQuery(api.joinRequests.listMyJoinRequests)

  // Check if user has pending request for an org
  const hasPendingRequest = (orgId: string) => {
    return myJoinRequests?.some(
      (req) => req.organizationId === orgId && req.status === 'pending'
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Browse Organizations</h1>
        <p className="text-muted-foreground">
          Discover and request to join organizations
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search organizations..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Organizations Grid */}
      {!organizations ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {debouncedQuery
              ? `No organizations found matching "${debouncedQuery}"`
              : 'No organizations available'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org) => (
            <Card key={org.id}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {org.logo ? (
                    <img
                      src={org.logo}
                      alt={org.name}
                      className="h-10 w-10 rounded-lg"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <CardDescription>@{org.slug}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>Organization</span>
                </div>
              </CardContent>
              <CardFooter>
                {hasPendingRequest(org.id) ? (
                  <Button variant="outline" disabled className="w-full">
                    Request Pending
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => setSelectedOrgId(org.id)}
                  >
                    Request to Join
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Join Request Dialog */}
      <JoinRequestDialog
        open={!!selectedOrgId}
        onOpenChange={(open) => !open && setSelectedOrgId(null)}
        organizationId={selectedOrgId ?? ''}
        organizationName={
          organizations?.find((o) => o.id === selectedOrgId)?.name ?? ''
        }
      />
    </div>
  )
}
```

**Acceptance Criteria**:
- [ ] `src/routes/_authed/app/browse-organizations.tsx` exists
- [ ] Search input filters organizations
- [ ] Organization cards display name, slug, logo
- [ ] "Request to Join" button opens dialog
- [ ] "Request Pending" shown if already requested
- [ ] Loading and empty states handled

**Testing Instructions**:
1. Navigate to `/app/browse-organizations`
2. Verify organizations are displayed
3. Search for organization by name
4. Click "Request to Join" - dialog should open
5. After submitting request, button should show "Request Pending"

**Definition of Done**: Browse page works with search and join request trigger.

---

### Task 6.3: Create Join Request Dialog

**Complexity**: Small (1-2 hours)

**Dependencies**: Task 5.2 complete

**Context**:
Dialog for submitting a join request with an optional message.

**Requirements**:
- **File to create**: `src/components/organization/JoinRequestDialog.tsx`
- Organization name display
- Optional message textarea
- Submit via Convex mutation

**Implementation Steps**:

1. Create `src/components/organization/JoinRequestDialog.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface JoinRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  organizationName: string
}

export default function JoinRequestDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
}: JoinRequestDialogProps) {
  const [message, setMessage] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const createJoinRequest = useMutation(api.joinRequests.createJoinRequest)

  const handleSubmit = async () => {
    try {
      setIsPending(true)
      setError(null)

      await createJoinRequest({
        organizationId,
        message: message.trim() || undefined,
      })

      setSuccess(true)
      setMessage('')

      // Close after short delay
      setTimeout(() => {
        onOpenChange(false)
        setSuccess(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request')
    } finally {
      setIsPending(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      setMessage('')
      setError(null)
      setSuccess(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request to Join</DialogTitle>
          <DialogDescription>
            Send a request to join <strong>{organizationName}</strong>. An admin
            will review your request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-md text-sm">
              Request submitted successfully! The organization admin will review
              it.
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell the admins why you'd like to join..."
              rows={4}
              disabled={isPending || success}
            />
            <p className="text-xs text-muted-foreground">
              This message will be visible to organization admins.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || success}>
            {isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

2. Note: Textarea component may need to be installed:
   ```bash
   npx shadcn@latest add textarea
   ```

**Acceptance Criteria**:
- [ ] `src/components/organization/JoinRequestDialog.tsx` exists
- [ ] Shows organization name
- [ ] Optional message textarea
- [ ] Submit creates join request
- [ ] Success/error messages shown
- [ ] Dialog resets on close

**Testing Instructions**:
1. Open dialog from browse page
2. Submit without message - should work
3. Submit with message - should include message
4. Try submitting duplicate - should show error

**Definition of Done**: Join request dialog creates request in database.

---

### Task 6.4: Create Join Requests Admin Component

**Complexity**: Medium (3-4 hours)

**Dependencies**: Task 1.5, 1.6, Task 2.1 complete

**Context**:
Admins need to see and manage pending join requests from the organization settings page. This component shows in the Invitations tab.

**Requirements**:
- **File to create**: `src/components/organization/JoinRequestsAdmin.tsx`
- List pending join requests with user info and message
- Approve/reject buttons with confirmation
- Show empty state when no requests

**Implementation Steps**:

1. Create `src/components/organization/JoinRequestsAdmin.tsx`:

```typescript
'use client'

import { Check, X, MessageSquare } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState } from 'react'

export default function JoinRequestsAdmin() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)

  const pendingRequests = useQuery(
    api.joinRequests.listPendingJoinRequests,
    activeOrg?.id ? { organizationId: activeOrg.id } : 'skip'
  )

  const approveRequest = useMutation(api.joinRequests.approveJoinRequest)
  const rejectRequest = useMutation(api.joinRequests.rejectJoinRequest)

  const handleApprove = async (requestId: string) => {
    try {
      setProcessingId(requestId)
      await approveRequest({ requestId })
    } catch (err) {
      console.error('Failed to approve:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    try {
      setProcessingId(requestId)
      await rejectRequest({ requestId })
      setRejectingId(null)
    } catch (err) {
      console.error('Failed to reject:', err)
    } finally {
      setProcessingId(null)
    }
  }

  if (!activeOrg) {
    return <p>No organization selected</p>
  }

  if (pendingRequests === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No pending join requests.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Pending Join Requests</h3>

      <div className="rounded-lg border">
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="p-4 border-b last:border-b-0 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">User ID: {request.userId}</p>
                <p className="text-xs text-muted-foreground">
                  Requested {new Date(request.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRejectingId(request.id)}
                  disabled={processingId === request.id}
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(request.id)}
                  disabled={processingId === request.id}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
              </div>
            </div>

            {request.message && (
              <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
                <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <p className="text-sm">{request.message}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reject Confirmation Dialog */}
      <Dialog open={!!rejectingId} onOpenChange={() => setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Join Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this request? The user will not be
              added to the organization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectingId && handleReject(rejectingId)}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

2. Update the organization page Invitations tab to include this component:

```typescript
// In src/routes/_authed/app/organization.tsx, Invitations tab:
import JoinRequestsAdmin from '@/components/organization/JoinRequestsAdmin'
import PendingInvitationsList from '@/components/organization/PendingInvitationsList'
import InviteMemberDialog from '@/components/organization/InviteMemberDialog'

// In TabsContent for invitations:
<TabsContent value="invitations" className="mt-6 space-y-6">
  <Card>
    <CardHeader className="flex flex-row items-center justify-between">
      <div>
        <CardTitle>Invitations</CardTitle>
        <CardDescription>Manage sent invitations</CardDescription>
      </div>
      <InviteMemberDialog />
    </CardHeader>
    <CardContent>
      <PendingInvitationsList />
    </CardContent>
  </Card>

  <Card>
    <CardHeader>
      <CardTitle>Join Requests</CardTitle>
      <CardDescription>Review requests from users who want to join</CardDescription>
    </CardHeader>
    <CardContent>
      <JoinRequestsAdmin />
    </CardContent>
  </Card>
</TabsContent>
```

**Acceptance Criteria**:
- [ ] `src/components/organization/JoinRequestsAdmin.tsx` exists
- [ ] Shows pending requests with user info
- [ ] Displays request message if present
- [ ] Approve button adds user to organization
- [ ] Reject button with confirmation dialog
- [ ] Loading and empty states handled
- [ ] Only visible to admins/owners

**Testing Instructions**:
1. Create join request from another user
2. As admin, navigate to Invitations tab
3. See pending request with message (if any)
4. Approve request - user should become member
5. Create another, reject it
6. Verify request is removed after action

**Definition of Done**: Join requests admin panel works with approve/reject functionality.

---

### Task 6.5: Join Request Lifecycle Enhancements

**Complexity**: Medium (2-3 hours)

**Dependencies**: Task 1.5, 1.6 complete

**Context**:
Enhance the join request lifecycle beyond the basic `pending → approved | rejected` flow. Add `cancelled` status (soft-delete for audit trail instead of hard delete) and `expired` status (auto-expire stale requests).

**Requirements**:
- **File to modify**: `convex/joinRequests.ts`
- Change `cancelJoinRequest` from hard delete to status update (`cancelled`)
- Add scheduled function to auto-expire requests older than configurable period
- Update `listMyJoinRequests` to include cancelled/expired requests with status labels

**Implementation Steps**:

1. Update `cancelJoinRequest` to use status update instead of delete:

```typescript
export const cancelJoinRequest = mutation({
  args: { requestId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const request = await ctx.db
      .query('joinRequest')
      .filter((q) => q.eq(q.field('id'), args.requestId))
      .first()

    if (!request) throw new Error('Join request not found')
    if (request.userId !== user.id) throw new Error('You can only cancel your own requests')
    if (request.status !== 'pending') throw new Error('Only pending requests can be cancelled')

    await ctx.db.patch(request._id, {
      status: 'cancelled',
      reviewedAt: Date.now(),
    })

    return { success: true }
  },
})
```

2. Add auto-expire scheduled function (optional, can be a cron or manual trigger):

```typescript
export const expireStaleRequests = mutation({
  args: { maxAgeMs: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const maxAge = args.maxAgeMs ?? 30 * 24 * 60 * 60 * 1000 // 30 days default
    const cutoff = Date.now() - maxAge

    const staleRequests = await ctx.db
      .query('joinRequest')
      .withIndex('by_status_and_organizationId', (q) => q.eq('status', 'pending'))
      .filter((q) => q.lt(q.field('createdAt'), cutoff))
      .collect()

    for (const request of staleRequests) {
      await ctx.db.patch(request._id, { status: 'expired' })
    }

    return { expired: staleRequests.length }
  },
})
```

**Acceptance Criteria**:
- [ ] `cancelJoinRequest` updates status to `cancelled` instead of deleting
- [ ] `expireStaleRequests` mutation exists for auto-expiry
- [ ] `listMyJoinRequests` returns all statuses including `cancelled` and `expired`
- [ ] UI shows appropriate labels for each status

**Definition of Done**: Lifecycle supports pending, approved, rejected, cancelled, expired states.

---

## Phase 7: Subscription-Gated Organization Creation

### Task 7.1: Subscription Schema & Backend

**Complexity**: Medium (2-3 hours)

**Dependencies**: Phase 1 complete

**Context**:
Add a subscription table to track user plans (free/pro). This gates organization creation behind a Pro subscription. For initial implementation, all users default to free; Pro status can be manually set in the database until payment integration is complete.

**Requirements**:
- **File to modify**: `convex/schema.ts`
- Add `subscription` table with plan, status, Stripe fields

**Implementation Steps**:

1. Open `convex/schema.ts`
2. Add the subscription table:

```typescript
subscription: defineTable({
  userId: v.string(),
  plan: v.string(),           // 'free' | 'pro'
  status: v.string(),         // 'active' | 'canceled' | 'past_due' | 'trialing'
  stripeCustomerId: v.optional(v.string()),
  stripeSubscriptionId: v.optional(v.string()),
  currentPeriodStart: v.number(),
  currentPeriodEnd: v.number(),
})
  .index('by_userId', ['userId'])
  .index('by_stripeCustomerId', ['stripeCustomerId']),
```

3. Run `npx convex dev` to sync schema

**Acceptance Criteria**:
- [ ] `subscription` table exists with all fields
- [ ] Indexes on `userId` and `stripeCustomerId`
- [ ] Schema syncs without errors

**Definition of Done**: Subscription table exists in Convex database.

---

### Task 7.2: Subscription Check Helpers

**Complexity**: Medium (2-3 hours)

**Dependencies**: Task 7.1 complete

**Context**:
Backend helpers for checking subscription status. These are used both by the frontend (via Convex queries) and by backend hooks (e.g., `beforeCreateOrganization`).

**Requirements**:
- **File to create**: `convex/subscription.ts`
- **File to create**: `src/hooks/useSubscription.ts`

**Implementation Steps**:

1. Create `convex/subscription.ts`:

```typescript
import { query } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth } from './auth_helpers'

export const getUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx)

    const subscription = await ctx.db
      .query('subscription')
      .withIndex('by_userId', (q) => q.eq('userId', user.id))
      .first()

    if (!subscription) {
      return { plan: 'free', status: 'active', isPro: false }
    }

    return {
      plan: subscription.plan,
      status: subscription.status,
      isPro: subscription.plan === 'pro' && subscription.status === 'active',
      currentPeriodEnd: subscription.currentPeriodEnd,
    }
  },
})

export const canCreateOrganization = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx)

    const subscription = await ctx.db
      .query('subscription')
      .withIndex('by_userId', (q) => q.eq('userId', user.id))
      .first()

    if (!subscription) return false
    return subscription.plan === 'pro' && subscription.status === 'active'
  },
})
```

2. Create `src/hooks/useSubscription.ts`:

```typescript
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useConvexAuthReady } from '@/hooks/useConvexAuthReady'

export function useSubscription() {
  const { isAuthenticated } = useConvexAuthReady()

  const subscription = useQuery(
    api.subscription.getUserSubscription,
    isAuthenticated ? {} : 'skip'
  )

  return {
    plan: subscription?.plan ?? 'free',
    status: subscription?.status ?? 'active',
    isPro: subscription?.isPro ?? false,
    isLoading: subscription === undefined,
  }
}
```

**Acceptance Criteria**:
- [ ] `convex/subscription.ts` exists with `getUserSubscription` and `canCreateOrganization`
- [ ] `src/hooks/useSubscription.ts` exists
- [ ] Returns `isPro: true` only when plan is 'pro' and status is 'active'
- [ ] Defaults to free plan when no subscription record exists

**Definition of Done**: Subscription queries and client hook work correctly.

---

### Task 7.3: Gate CreateOrganizationDialog

**Complexity**: Medium (2-3 hours)

**Dependencies**: Task 7.2 complete

**Context**:
Conditionally render the organization creation form based on subscription status. Non-Pro users see an upgrade prompt instead of the creation form. Backend also validates via a `beforeCreateOrganization` hook in `convex/betterAuth/auth.ts`.

**Requirements**:
- **File to modify**: `src/components/organization/CreateOrganizationDialog.tsx`
- **File to modify**: `convex/betterAuth/auth.ts` (add server-side validation)

**Implementation Steps**:

1. Update `CreateOrganizationDialog.tsx` to check subscription:

```typescript
// In CreateOrganizationDialog component:
const { isPro, isLoading: isLoadingSubscription } = useSubscription()

// Conditional rendering:
// isLoadingSubscription → skeleton
// !isPro → <UpgradePlanDialog /> or inline upgrade prompt
// isPro → normal creation form
```

2. Add server-side validation in `convex/betterAuth/auth.ts`:

```typescript
// In organization() plugin config:
organization({
  // ... existing config ...
  beforeCreateOrganization: async (ctx, data) => {
    // Check subscription
    const subscription = await ctx.runQuery(api.subscription.canCreateOrganization, {})
    if (!subscription) {
      throw new Error('Pro subscription required to create organizations')
    }
  },
})
```

**Acceptance Criteria**:
- [ ] Non-Pro users see upgrade prompt instead of creation form
- [ ] Pro users see normal creation form
- [ ] Loading state while checking subscription
- [ ] Backend validates Pro status in `beforeCreateOrganization` hook
- [ ] Cannot bypass gate via direct API call

**Definition of Done**: Organization creation is gated behind Pro subscription on both client and server.

---

### Task 7.4: Payment Gateway Placeholder

**Complexity**: Small (1-2 hours)

**Dependencies**: Task 7.3 complete

**Context**:
A modular dialog component that serves as a placeholder for future Stripe integration. Shows "coming soon" messaging and can be swapped for real Stripe Checkout when payment infrastructure is ready.

**Requirements**:
- **File to create**: `src/components/organization/UpgradePlanDialog.tsx`
- **File to modify**: `src/components/nav-user.tsx` (wire "Upgrade to Pro" menu item)

**Implementation Steps**:

1. Create `src/components/organization/UpgradePlanDialog.tsx`:

```typescript
'use client'

import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface UpgradePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UpgradePlanDialog({ open, onOpenChange }: UpgradePlanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription>
            Create unlimited organizations with a Pro plan.
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 space-y-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-semibold">Pro Plan</h3>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>- Create unlimited organizations</li>
              <li>- Unlimited team members</li>
              <li>- Priority support</li>
            </ul>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Payment integration coming soon. Contact support for early access.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled>
            {/* TODO: Replace with Stripe Checkout redirect */}
            Coming Soon
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

2. Update `nav-user.tsx` "Upgrade to Pro" to open this dialog:

```typescript
import UpgradePlanDialog from '@/components/organization/UpgradePlanDialog'

// Add state:
const [showUpgrade, setShowUpgrade] = useState(false)

// Replace existing menu item:
<DropdownMenuItem onClick={() => setShowUpgrade(true)}>
  <Sparkles />
  Upgrade to Pro
</DropdownMenuItem>

// Add dialog at bottom of component:
<UpgradePlanDialog open={showUpgrade} onOpenChange={setShowUpgrade} />
```

**Acceptance Criteria**:
- [ ] `src/components/organization/UpgradePlanDialog.tsx` exists
- [ ] Shows Pro plan features and "coming soon" message
- [ ] "Upgrade to Pro" in nav-user opens the dialog
- [ ] Modular: easy to swap placeholder for Stripe Checkout
- [ ] Used in CreateOrganizationDialog when user is not Pro

**Definition of Done**: Upgrade dialog exists as a modular placeholder, wired into nav-user and CreateOrganizationDialog.

---

## Phase 8: Enhanced RBAC & Permissions

### Task 8.1: Permission Model & Backend Helpers

**Complexity**: Medium (3-4 hours)

**Dependencies**: Phase 1 complete

**Context**:
Create centralized permission helpers to replace the ad-hoc role checks scattered across `joinRequests.ts`, `MembersList.tsx`, `OrgSettings.tsx`, and `useNotifications.ts`. All current checks use inline patterns like `['owner', 'admin'].includes(membership.role)`.

**Requirements**:
- **File to create**: `convex/permissions.ts`

**Permission Matrix**:

| Action                       | owner      | admin      | member     |
| ---------------------------- | ---------- | ---------- | ---------- |
| View org settings            | yes        | yes        | no         |
| Update org settings          | yes        | yes        | no         |
| Delete org                   | yes        | no         | no         |
| Invite member                | yes        | yes        | no         |
| Remove member                | yes        | yes        | no         |
| Change member role           | yes        | yes        | no         |
| Create team                  | yes        | yes        | no         |
| Delete team                  | yes        | yes        | no         |
| Manage team members          | yes        | yes        | no         |
| View join requests           | yes        | yes        | no         |
| Approve/reject join requests | yes        | yes        | no         |
| Cancel own join request      | self       | self       | self       |
| Browse organizations         | yes        | yes        | yes        |
| Create organization          | plan-gated | plan-gated | plan-gated |

**Implementation Steps**:

1. Create `convex/permissions.ts`:

```typescript
import { QueryCtx } from './_generated/server'
import { requireAuth } from './auth_helpers'

type OrgRole = 'owner' | 'admin' | 'member'

async function getOrgMembership(ctx: QueryCtx, userId: string, orgId: string) {
  return await ctx.db
    .query('member')
    .withIndex('by_userId', (q) => q.eq('userId', userId))
    .filter((q) => q.eq(q.field('organizationId'), orgId))
    .first()
}

export async function requireOrgRole(
  ctx: QueryCtx,
  orgId: string,
  allowedRoles: OrgRole[]
) {
  const user = await requireAuth(ctx)
  const membership = await getOrgMembership(ctx, user.id, orgId)

  if (!membership || !allowedRoles.includes(membership.role as OrgRole)) {
    throw new Error(`Requires role: ${allowedRoles.join(' or ')}`)
  }

  return { user, membership }
}

export async function canInviteMembers(ctx: QueryCtx, orgId: string) {
  return requireOrgRole(ctx, orgId, ['owner', 'admin'])
}

export async function canManageJoinRequests(ctx: QueryCtx, orgId: string) {
  return requireOrgRole(ctx, orgId, ['owner', 'admin'])
}

export async function canManageTeams(ctx: QueryCtx, orgId: string) {
  return requireOrgRole(ctx, orgId, ['owner', 'admin'])
}

export async function canDeleteOrganization(ctx: QueryCtx, orgId: string) {
  return requireOrgRole(ctx, orgId, ['owner'])
}
```

2. Refactor `convex/joinRequests.ts` to use shared helpers:
   - Replace inline role checks in `listPendingJoinRequests`, `approveJoinRequest`, `rejectJoinRequest` with `canManageJoinRequests(ctx, orgId)`

**Acceptance Criteria**:
- [ ] `convex/permissions.ts` exists with all helper functions
- [ ] `requireOrgRole` validates user has required role in org
- [ ] `canInviteMembers`, `canManageJoinRequests`, `canManageTeams`, `canDeleteOrganization` exist
- [ ] Existing join request functions refactored to use shared helpers
- [ ] All existing role checks still work after refactor

**Definition of Done**: Centralized permission helpers exist and existing code is refactored to use them.

---

### Task 8.2: useOrgRole Hook & Conditional UI

**Complexity**: Small (1-2 hours)

**Dependencies**: Phase 3 complete

**Context**:
Extract a reusable hook that returns the current user's role in the active org. Use it across all org management components to conditionally render admin-only actions.

**Requirements**:
- **File to create**: `src/hooks/useOrgRole.ts`
- **Files to modify**: `MembersList.tsx`, `TeamsList.tsx`, `OrgSettings.tsx`, `PendingInvitationsList.tsx` (replace inline role checks)

**Implementation Steps**:

1. Create `src/hooks/useOrgRole.ts`:

```typescript
import { authClient } from '@/lib/auth-client'

export function useOrgRole() {
  const { data: session } = authClient.useSession()
  const { data: activeOrg } = authClient.useActiveOrganization()

  const membership = activeOrg?.members?.find(
    (m) => m.userId === session?.user?.id
  )

  return {
    role: membership?.role ?? null,
    isOwner: membership?.role === 'owner',
    isAdmin: membership?.role === 'admin' || membership?.role === 'owner',
    isMember: !!membership,
  }
}
```

2. Update components to use the hook:
   - `MembersList.tsx`: replace `const isAdmin = currentUserMember?.role === 'admin' || ...`
   - `TeamsList.tsx`: replace inline admin check
   - `OrgSettings.tsx`: replace `const isOwner = activeOrg?.members?.some(...)`
   - `PendingInvitationsList.tsx`: use `isAdmin` for cancel button visibility

**Acceptance Criteria**:
- [ ] `src/hooks/useOrgRole.ts` exists
- [ ] Returns `role`, `isOwner`, `isAdmin`, `isMember`
- [ ] At least 2 components refactored to use the hook
- [ ] No regression in existing permission-enforced UI

**Definition of Done**: Shared `useOrgRole` hook used across org management components.

---

### Task 8.3: Invitation Token System

**Complexity**: Medium (3-4 hours)

**Dependencies**: Task 5.1 complete

**Context**:
Add unique tokens to invitations so they can be shared via URL (`/app/invitations?token=<token>`). This allows invitations to work outside the in-app notification flow (e.g., shared via email or chat).

**Requirements**:
- **File to modify**: `convex/betterAuth/auth.ts` (add `beforeCreateInvitation` hook to generate token)
- **File to modify**: `convex/invitations.ts` (add `getInvitationByToken` query)
- **File to create**: `src/routes/_authed/app/invitations.tsx` (token-based accept page)

**Implementation Steps**:

1. In `convex/betterAuth/auth.ts`, generate a token when invitations are created:

```typescript
organization({
  // ... existing config ...
  // Note: Better Auth may not expose a beforeCreateInvitation hook directly.
  // If not, add a token field after invitation creation via the adapter,
  // or store tokens in a separate invitationToken table.

  // Alternative: store tokens in a custom table
  // Create invitationToken table in schema.ts:
  // invitationToken: defineTable({
  //   invitationId: v.string(),
  //   token: v.string(),
  //   createdAt: v.number(),
  // }).index('by_token', ['token']).index('by_invitationId', ['invitationId'])
})
```

2. Add token lookup query in `convex/invitations.ts`:

```typescript
export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const tokenRecord = await ctx.db
      .query('invitationToken')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .first()

    if (!tokenRecord) return null

    const invitation = await ctx.db
      .query('invitation')
      .filter((q) => q.eq(q.field('id'), tokenRecord.invitationId))
      .first()

    if (!invitation || invitation.status !== 'pending') return null

    const org = await ctx.db
      .query('organization')
      .filter((q) => q.eq(q.field('id'), invitation.organizationId))
      .first()

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      organizationName: org?.name ?? 'Unknown',
      organizationSlug: org?.slug,
      organizationId: invitation.organizationId,
      expiresAt: invitation.expiresAt,
    }
  },
})
```

3. Create `src/routes/_authed/app/invitations.tsx`:

```typescript
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useNotificationActions } from '@/hooks/useNotificationActions'

export const Route = createFileRoute('/_authed/app/invitations')({
  component: InvitationAcceptPage,
})

function InvitationAcceptPage() {
  const { token } = useSearch({ strict: false }) as { token?: string }
  const invitation = useQuery(
    api.invitations.getInvitationByToken,
    token ? { token } : 'skip'
  )
  const actions = useNotificationActions()

  // Render invitation details with accept/decline buttons
  // Handle expired/invalid tokens
}
```

**Acceptance Criteria**:
- [ ] Invitation tokens are generated when invitations are created
- [ ] `/app/invitations?token=<token>` shows invitation details
- [ ] Accept/decline works from the token URL
- [ ] Expired/invalid tokens show appropriate error
- [ ] Works for logged-in users (unauthenticated users redirected to login first)

**Definition of Done**: Invitations can be accepted via URL with token-based lookup.

---

### Task 8.4: Refactor Existing Role Checks

**Complexity**: Small (1-2 hours)

**Dependencies**: Task 8.1, 8.2 complete

**Context**:
Final cleanup task to replace all remaining inline role checks with the centralized `permissions.ts` backend helpers and `useOrgRole` frontend hook.

**Requirements**:
- **Files to modify**: All components and backend functions with inline role checks
- Ensure no `['owner', 'admin'].includes(membership.role)` patterns remain outside `permissions.ts`
- Ensure no `activeOrg?.members?.some(...)` patterns remain outside `useOrgRole.ts`

**Scope**:
- `convex/joinRequests.ts`: replace inline checks with `canManageJoinRequests`
- `convex/invitations.ts`: use shared helpers if applicable
- `src/components/organization/MembersList.tsx`: use `useOrgRole()`
- `src/components/organization/TeamsList.tsx`: use `useOrgRole()`
- `src/components/organization/OrgSettings.tsx`: use `useOrgRole()`
- `src/hooks/useNotifications.ts`: use `useOrgRole()` or shared logic

**Acceptance Criteria**:
- [ ] No inline role check patterns remain in component code
- [ ] All backend role checks use `permissions.ts` helpers
- [ ] All frontend role checks use `useOrgRole()` hook
- [ ] No regression in existing functionality

**Definition of Done**: All role checks centralized, codebase consistent.
