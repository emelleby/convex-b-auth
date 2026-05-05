# Organization & Team Management - Developer Task Specifications

**Project**: Convex + Better-Auth Organization Plugin Implementation
**Created**: 2026-03-17
**Total Estimated Time**: ~80-100 hours
**Phases**: 6

---

## Progress Tracking

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
- ✅ Task 5.3: Create Notification Center Component - **COMPLETE**
- ✅ Task 5.4: Create Full Notifications Page - **COMPLETE**
- ✅ Task 5.5: Update Nav User with Notification Center - **COMPLETE**

### Phase 6: Join Request System (~10-14 hours)
- ⏳ Task 6.1: Extend Join Request API with Organization Discovery - **PENDING**
- ⏳ Task 6.2: Create Browse Organizations Page - **PENDING**
- ⏳ Task 6.3: Create Join Request Dialog - **PENDING**
- ⏳ Task 6.4: Create Join Requests Admin Component - **PENDING**

---

## Table of Contents

1. [Phase 1: Schema & Backend Foundation](#phase-1-schema--backend-foundation)
2. [Phase 2: Create Organization Flow](#phase-2-create-organization-flow)
3. [Phase 3: Organization Management UI](#phase-3-organization-management-ui)
4. [Phase 4: Team Management UI](#phase-4-team-management-ui)
5. [Phase 5: Invitation System](#phase-5-invitation-system---in-app-notifications)
6. [Phase 6: Join Request System](#phase-6-join-request-system)

---

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

| Resource | Query Key |
|----------|-----------|
| Organization Members | `['organization-members', organizationId]` |
| Organization Teams | `['organization-teams', organizationId]` |
| Organization Invitations | `['organization-invitations', organizationId]` |
| Team Members | `['team-members', teamId]` |
| User Invitations | `['user-invitations', userId]` |
| Join Requests (Admin) | `['join-requests', organizationId]` |
| My Join Requests | `['my-join-requests', userId]` |

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

## Phase 1: Schema & Backend Foundation

### Task 1.1: Add joinRequest Table to Convex Schema

**Complexity**: Small (1-2 hours)

**Context**:  
Better-Auth's organization plugin handles `organization`, `member`, `team`, `teamMember`, and `invitation` tables automatically. However, the "join request" feature (where users request to join an organization and admins approve/reject) is custom functionality not provided by Better-Auth. We need to create this table ourselves.

**Requirements**:
- **File to modify**: `convex/schema.ts`
- Add a new `joinRequest` table with proper indexes

**Implementation Steps**:

1. Open `convex/schema.ts`
2. Add the following table definition after the `teamMember` table:

```typescript
joinRequest: defineTable({
  id: v.string(),
  userId: v.string(),
  organizationId: v.string(),
  message: v.optional(v.string()),
  status: v.string(), // 'pending' | 'approved' | 'rejected'
  reviewedBy: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index('by_organizationId', ['organizationId'])
  .index('by_userId', ['userId'])
  .index('by_status_and_organizationId', ['status', 'organizationId']),
```

3. Save the file
4. Run `npx convex dev` to sync schema

**Acceptance Criteria**:
- [ ] `joinRequest` table exists in schema with all fields
- [ ] Three indexes are defined: `by_organizationId`, `by_userId`, `by_status_and_organizationId`
- [ ] `npx convex dev` runs without errors
- [ ] Schema follows existing patterns in the file

**Testing Instructions**:
1. Run `npx convex dev` - should complete without errors
2. Check Convex dashboard - `joinRequest` table should appear

**Definition of Done**: Schema compiles, Convex syncs successfully, table visible in dashboard.

---

### Task 1.2: Update Invitation Table with teamId Field

**Complexity**: Small (30 minutes)

**Context**:  
When teams are enabled in Better-Auth, invitations can optionally include a team. The invitation table needs a `teamId` field so users can be invited directly to a team within an organization.

**Requirements**:
- **File to modify**: `convex/schema.ts`
- Add `teamId` optional field to `invitation` table

**Implementation Steps**:

1. Open `convex/schema.ts`
2. Find the `invitation` table definition (around line 34)
3. Add `teamId` field after `role`:

```typescript
invitation: defineTable({
  id: v.string(),
  email: v.string(),
  inviterId: v.string(),
  organizationId: v.string(),
  role: v.optional(v.string()),
  teamId: v.optional(v.string()), // ADD THIS LINE
  status: v.string(),
  createdAt: v.number(),
  expiresAt: v.number(),
})
  .index('by_email', ['email'])
  .index('by_organizationId', ['organizationId']),
```

4. Save and sync with `npx convex dev`

**Acceptance Criteria**:
- [ ] `invitation` table has `teamId` field of type `v.optional(v.string())`
- [ ] Existing invitation functionality is not broken
- [ ] Schema syncs without errors

**Testing Instructions**:
1. Run `npx convex dev`
2. Verify in Convex dashboard that invitation table has the new field

**Definition of Done**: Field added, schema syncs, existing tests pass.

---

### Task 1.3: Update Auth Client with Teams Configuration

**Complexity**: Small (30 minutes)

**Context**:  
The Better-Auth client needs to know that teams are enabled to expose team-related methods. Currently `src/lib/auth-client.ts` uses `organizationClient()` without team configuration.

**Requirements**:
- **File to modify**: `src/lib/auth-client.ts`
- Enable teams in the organizationClient plugin

**Implementation Steps**:

1. Open `src/lib/auth-client.ts`
2. Update the `organizationClient()` call to include teams configuration:

```typescript
import { convexClient } from '@convex-dev/better-auth/client/plugins'
import { organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  plugins: [
    convexClient(),
    organizationClient({
      teams: {
        enabled: true,
      },
    }),
  ],
})
```

3. Save the file

**Acceptance Criteria**:
- [ ] `organizationClient` has `teams: { enabled: true }` configuration
- [ ] No TypeScript errors
- [ ] App still compiles and runs

**Testing Instructions**:
1. Run `npm run dev` (or your dev command)
2. Open browser console, type `authClient.organization` - should see team methods available

**Definition of Done**: Client configured, app compiles, team methods accessible.

---

### Task 1.4: Update Auth Server with Member Limits and Invitation Hooks

**Complexity**: Medium (2-3 hours)

**Context**:
The server-side Better-Auth configuration needs enhancement to:
1. Enforce member limits (5 for free, unlimited for Pro)
2. Disable email sending (we use in-app notifications instead)
3. Ensure teams are properly configured

**Requirements**:
- **File to modify**: `convex/auth.ts`
- Add `membershipLimit` configuration
- Add empty `sendInvitationEmail` hook (no-op since we don't send emails)
- Fix the schema configuration syntax error on line 41

**Implementation Steps**:

1. Open `convex/auth.ts`
2. Note: There's a syntax issue on line 41 - the `schema:` object is incorrectly placed. Fix it.
3. Update the `organization()` plugin configuration:

```typescript
organization({
  teams: {
    enabled: true,
    maximumTeams: 10, // Limit teams per organization
  },
  // Member limit based on organization plan
  // Free: 5 members, Pro: unlimited
  membershipLimit: 100, // Default limit, can be made dynamic later

  // No email sending - invitations handled via in-app notifications
  sendInvitationEmail: async (data) => {
    // Intentionally empty - no email infrastructure
    // Invitations are stored in DB and shown in notification center
    console.log(`[DEV] Invitation created: ${data.email} invited to ${data.organization.name}`);
  },

  schema: {
    teamMember: {
      additionalFields: {
        role: {
          type: 'string',
          required: false,
        },
      },
    },
  },
}),
```

4. Save the file
5. Run `npx convex dev` to verify

**Acceptance Criteria**:
- [ ] `organization()` plugin has `membershipLimit` configured
- [ ] `sendInvitationEmail` hook is defined (empty implementation)
- [ ] `teams.maximumTeams` is set to 10
- [ ] Schema syntax is correct
- [ ] Server compiles without errors

**Testing Instructions**:
1. Run `npx convex dev` - should complete without errors
2. Create a test invitation through the app - should not send email, should log to console

**Definition of Done**: Auth configuration updated, no syntax errors, invitation hook logs to console.

---

### Task 1.5: Create Join Request Convex Functions - Part 1 (Create & List)

**Complexity**: Medium (2-3 hours)

**Context**:
Join requests allow users to request membership in an organization without being invited. This requires custom Convex functions since Better-Auth doesn't provide this out of the box.

**Requirements**:
- **File to create**: `convex/joinRequests.ts`
- Create `createJoinRequest` mutation
- Create `listMyJoinRequests` query (for users)
- Create `listPendingJoinRequests` query (for org admins)

**Reference Pattern**: Follow `convex/todos.ts` for structure

**Implementation Steps**:

1. Create new file `convex/joinRequests.ts`
2. Add imports and helper:

```typescript
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth } from './auth_helpers'

// Generate a unique ID (Better-Auth style)
function generateId(): string {
  return crypto.randomUUID()
}
```

3. Add `createJoinRequest` mutation:

```typescript
/**
 * Create a join request for an organization.
 * Users can only have one pending request per organization.
 */
export const createJoinRequest = mutation({
  args: {
    organizationId: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    // Check if user already has a pending request for this org
    const existingRequest = await ctx.db
      .query('joinRequest')
      .withIndex('by_userId', (q) => q.eq('userId', user.id))
      .filter((q) =>
        q.and(
          q.eq(q.field('organizationId'), args.organizationId),
          q.eq(q.field('status'), 'pending')
        )
      )
      .first()

    if (existingRequest) {
      throw new Error('You already have a pending request for this organization')
    }

    // Check if user is already a member
    const existingMember = await ctx.db
      .query('member')
      .withIndex('by_userId', (q) => q.eq('userId', user.id))
      .filter((q) => q.eq(q.field('organizationId'), args.organizationId))
      .first()

    if (existingMember) {
      throw new Error('You are already a member of this organization')
    }

    // Create the join request
    const id = generateId()
    await ctx.db.insert('joinRequest', {
      id,
      userId: user.id,
      organizationId: args.organizationId,
      message: args.message,
      status: 'pending',
      createdAt: Date.now(),
    })

    return { id }
  },
})
```

4. Add `listMyJoinRequests` query:

```typescript
/**
 * List all join requests made by the current user.
 */
export const listMyJoinRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx)

    const requests = await ctx.db
      .query('joinRequest')
      .withIndex('by_userId', (q) => q.eq('userId', user.id))
      .order('desc')
      .collect()

    // Enrich with organization names
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const org = await ctx.db
          .query('organization')
          .filter((q) => q.eq(q.field('id'), request.organizationId))
          .first()

        return {
          ...request,
          organizationName: org?.name ?? 'Unknown Organization',
        }
      })
    )

    return enrichedRequests
  },
})
```

5. Add `listPendingJoinRequests` query:

```typescript
/**
 * List pending join requests for an organization.
 * Only org admins/owners can view this.
 */
export const listPendingJoinRequests = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    // Verify user is admin/owner of this organization
    const membership = await ctx.db
      .query('member')
      .withIndex('by_userId', (q) => q.eq('userId', user.id))
      .filter((q) => q.eq(q.field('organizationId'), args.organizationId))
      .first()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only organization admins can view join requests')
    }

    const requests = await ctx.db
      .query('joinRequest')
      .withIndex('by_status_and_organizationId', (q) =>
        q.eq('status', 'pending').eq('organizationId', args.organizationId)
      )
      .order('desc')
      .collect()

    return requests
  },
})
```

6. Save the file

**Acceptance Criteria**:
- [ ] File `convex/joinRequests.ts` exists
- [ ] `createJoinRequest` mutation validates no duplicate pending requests
- [ ] `createJoinRequest` mutation validates user is not already a member
- [ ] `listMyJoinRequests` returns user's requests with org names
- [ ] `listPendingJoinRequests` only accessible to admins/owners
- [ ] All functions use `requireAuth()` helper
- [ ] No TypeScript errors

**Testing Instructions**:
1. Run `npx convex dev`
2. In app, create a test join request (you'll need UI later, or use Convex dashboard)
3. Verify request appears in `joinRequest` table
4. Verify `listMyJoinRequests` returns the request

**Definition of Done**: Three functions created, all compile, auth checks in place.

---

### Task 1.6: Create Join Request Convex Functions - Part 2 (Approve/Reject/Cancel)

**Complexity**: Medium (2-3 hours)

**Dependencies**: Task 1.5 must be complete

**Context**:
Complete the join request system with actions: admins approve/reject, users cancel their own requests.

**Requirements**:
- **File to modify**: `convex/joinRequests.ts`
- Add `approveJoinRequest` mutation
- Add `rejectJoinRequest` mutation
- Add `cancelJoinRequest` mutation

**Implementation Steps**:

1. Open `convex/joinRequests.ts`
2. Add `approveJoinRequest` mutation:

```typescript
/**
 * Approve a join request and add user as member.
 * Only org admins/owners can approve.
 */
export const approveJoinRequest = mutation({
  args: {
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    // Find the request
    const request = await ctx.db
      .query('joinRequest')
      .filter((q) => q.eq(q.field('id'), args.requestId))
      .first()

    if (!request) {
      throw new Error('Join request not found')
    }

    if (request.status !== 'pending') {
      throw new Error('Request has already been processed')
    }

    // Verify user is admin/owner
    const membership = await ctx.db
      .query('member')
      .withIndex('by_userId', (q) => q.eq('userId', user.id))
      .filter((q) => q.eq(q.field('organizationId'), request.organizationId))
      .first()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only organization admins can approve join requests')
    }

    // Update request status
    await ctx.db.patch(request._id, {
      status: 'approved',
      reviewedBy: user.id,
      reviewedAt: Date.now(),
    })

    // Add user as member with 'member' role
    const memberId = generateId()
    await ctx.db.insert('member', {
      id: memberId,
      organizationId: request.organizationId,
      userId: request.userId,
      role: 'member',
      createdAt: Date.now(),
    })

    return { success: true }
  },
})
```

3. Add `rejectJoinRequest` mutation:

```typescript
/**
 * Reject a join request.
 * Only org admins/owners can reject.
 */
export const rejectJoinRequest = mutation({
  args: {
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    const request = await ctx.db
      .query('joinRequest')
      .filter((q) => q.eq(q.field('id'), args.requestId))
      .first()

    if (!request) {
      throw new Error('Join request not found')
    }

    if (request.status !== 'pending') {
      throw new Error('Request has already been processed')
    }

    // Verify user is admin/owner
    const membership = await ctx.db
      .query('member')
      .withIndex('by_userId', (q) => q.eq('userId', user.id))
      .filter((q) => q.eq(q.field('organizationId'), request.organizationId))
      .first()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only organization admins can reject join requests')
    }

    await ctx.db.patch(request._id, {
      status: 'rejected',
      reviewedBy: user.id,
      reviewedAt: Date.now(),
    })

    return { success: true }
  },
})
```

4. Add `cancelJoinRequest` mutation:

```typescript
/**
 * Cancel own pending join request.
 */
export const cancelJoinRequest = mutation({
  args: {
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)

    const request = await ctx.db
      .query('joinRequest')
      .filter((q) => q.eq(q.field('id'), args.requestId))
      .first()

    if (!request) {
      throw new Error('Join request not found')
    }

    if (request.userId !== user.id) {
      throw new Error('You can only cancel your own requests')
    }

    if (request.status !== 'pending') {
      throw new Error('Only pending requests can be cancelled')
    }

    await ctx.db.delete(request._id)

    return { success: true }
  },
})
```

5. Save the file

**Acceptance Criteria**:
- [ ] `approveJoinRequest` adds user as member with 'member' role
- [ ] `approveJoinRequest` updates request status to 'approved'
- [ ] `rejectJoinRequest` updates request status to 'rejected'
- [ ] `cancelJoinRequest` deletes the request (only owner can cancel)
- [ ] All mutations verify appropriate permissions
- [ ] All mutations handle edge cases (not found, already processed)

**Testing Instructions**:
1. Create a join request (from Task 1.5)
2. Test approve flow - user should become member
3. Create another request, test reject flow
4. Create another request, test cancel flow (as requesting user)

**Definition of Done**: All three mutations work correctly with proper auth checks.

---

## Phase 2: Create Organization Flow

> **Why Phase 2?** Creating organizations must come before managing them. This phase enables testing of all subsequent phases by allowing users to create organizations.

### Task 2.1: Create Organization Dialog ✅ COMPLETE

**Complexity**: Medium (3-4 hours)

**Dependencies**: Phase 1 complete

**Implemented**: `src/components/organization/CreateOrganizationDialog.tsx`
- Supports both **controlled** mode (`open` + `onOpenChange` props) and **uncontrolled** mode (`trigger` prop)
- Name field with auto-generated slug (stops auto-generating once user manually edits the slug)
- Slug validated with `/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/`
- Optional logo URL field
- Creates org via `authClient.organization.create()`, then sets it active via `authClient.organization.setActive()`
- Full error display and loading/disabled states during submission
- Form resets on close

**Context**:
Users need to be able to create new organizations. This dialog captures the organization details and uses the Better-Auth API to create the organization.

**Requirements**:
- **File to create**: `src/components/organization/CreateOrganizationDialog.tsx`
- Form with organization name, slug (auto-generated), optional logo
- Validation for required fields
- Create organization via Better-Auth API

**Reference**: Better-Auth docs: `authClient.organization.create()`

**Implementation Steps**:

1. Create `src/components/organization/CreateOrganizationDialog.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Building2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface CreateOrganizationDialogProps {
  trigger?: React.ReactNode
  onSuccess?: (orgId: string) => void
}

export default function CreateOrganizationDialog({
  trigger,
  onSuccess,
}: CreateOrganizationDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [logo, setLogo] = useState('')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      setSlug(generatedSlug)
    }
  }, [name, slugManuallyEdited])

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true)
    // Only allow valid slug characters
    const cleanSlug = value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSlug(cleanSlug)
  }

  const handleSubmit = async () => {
    // Validation
    if (!name.trim()) {
      setError('Organization name is required')
      return
    }

    if (!slug.trim()) {
      setError('Slug is required')
      return
    }

    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
      setError('Slug must start and end with a letter or number')
      return
    }

    try {
      setIsPending(true)
      setError(null)

      const result = await authClient.organization.create({
        name: name.trim(),
        slug: slug.trim(),
        logo: logo.trim() || undefined,
      })

      if (result.data?.id) {
        // Set as active organization
        await authClient.organization.setActive({
          organizationId: result.data.id,
        })

        onSuccess?.(result.data.id)
        handleClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization')
    } finally {
      setIsPending(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    setName('')
    setSlug('')
    setSlugManuallyEdited(false)
    setLogo('')
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Building2 className="h-4 w-4 mr-2" />
            Create Organization
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Organization</DialogTitle>
          <DialogDescription>
            Create a new organization to collaborate with your team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="org-name">Organization Name *</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug *</Label>
            <Input
              id="org-slug"
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="acme-inc"
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Used in URLs. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-logo">Logo URL (Optional)</Label>
            <Input
              id="org-logo"
              value={logo}
              onChange={(e) => setLogo(e.target.value)}
              placeholder="https://example.com/logo.png"
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Creating...' : 'Create Organization'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Acceptance Criteria**:
- [ ] `src/components/organization/CreateOrganizationDialog.tsx` exists
- [ ] Name input with validation
- [ ] Slug auto-generates from name
- [ ] Slug can be manually edited
- [ ] Slug validation (alphanumeric and hyphens only)
- [ ] Optional logo URL input
- [ ] Creates organization via Better-Auth API
- [ ] Sets new org as active after creation
- [ ] Error handling and loading states

**Testing Instructions**:
1. Open create organization dialog
2. Enter name - slug should auto-generate
3. Manually edit slug - should stop auto-generating
4. Submit with empty name - should show error
5. Submit valid form - organization should be created
6. Verify new org appears in switcher and is active

**Definition of Done**: Create organization dialog works, org is created and set as active.

---

### Task 2.2: Integrate Create Organization in Switcher ✅ COMPLETE

**Complexity**: Medium (2-3 hours)

**Dependencies**: Task 2.1 complete

**Implemented**: `src/components/team-switcher.tsx` + `src/components/app-sidebar.tsx`
- `TeamSwitcher` now takes **no props** — it fetches its own data via Better-Auth hooks
- Uses `authClient.useListOrganizations()` for the org list and `authClient.useActiveOrganization()` for the current org
- **Loading state**: animated skeleton placeholder while hooks are pending
- **Empty state**: renders a `CreateOrganizationDialog` (trigger mode) that directly opens on click
- **Populated state**: dropdown menu listing all orgs, active one highlighted with "Active" label + bold name
- Switching org calls `authClient.organization.setActive()`
- "Add organization" menu item opens `CreateOrganizationDialog` in controlled mode
- `app-sidebar.tsx` updated: mock `teams` array removed, `<TeamSwitcher />` now called with no props

**Context**:
The organization switcher already has an "Add team" button. This needs to be wired up to open the CreateOrganizationDialog.

**Requirements**:
- **File to modify**: `src/components/team-switcher.tsx`
- Replace mock data with real Better-Auth data
- "Add team" button opens CreateOrganizationDialog
- Show current user's organizations
- Switch active organization on selection

**Reference**: Better-Auth docs: `authClient.useListOrganizations()`, `authClient.organization.setActive()`

**Implementation Steps**:

1. Update `src/components/team-switcher.tsx`:

```typescript
'use client'

import * as React from 'react'
import { ChevronsUpDown, Plus, Building2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import CreateOrganizationDialog from '@/components/organization/CreateOrganizationDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { data: organizations, isPending: isLoadingOrgs } = authClient.useListOrganizations()
  const { data: activeOrg, isPending: isLoadingActive } = authClient.useActiveOrganization()
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)

  const handleSelectOrg = async (orgId: string) => {
    try {
      await authClient.organization.setActive({ organizationId: orgId })
    } catch (err) {
      console.error('Failed to switch organization:', err)
    }
  }

  const handleOrgCreated = (orgId: string) => {
    setShowCreateDialog(false)
    // The new org is already set as active in the dialog
  }

  const isPending = isLoadingOrgs || isLoadingActive

  // Loading state
  if (isPending) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/20 animate-pulse" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold text-muted-foreground">
                Loading...
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  // No organizations state
  if (!organizations || organizations.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <CreateOrganizationDialog
            trigger={
              <SidebarMenuButton size="lg">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg border-2 border-dashed border-sidebar-primary/50">
                  <Plus className="size-4 text-sidebar-primary" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    Create Organization
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Get started
                  </span>
                </div>
              </SidebarMenuButton>
            }
            onSuccess={handleOrgCreated}
          />
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  {activeOrg?.logo ? (
                    <img
                      src={activeOrg.logo}
                      alt={activeOrg.name}
                      className="size-4 object-cover"
                    />
                  ) : (
                    <Building2 className="size-4" />
                  )}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {activeOrg?.name ?? 'Select Organization'}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {activeOrg?.slug ?? 'No organization selected'}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              align="start"
              side={isMobile ? 'bottom' : 'right'}
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Organizations
              </DropdownMenuLabel>
              {organizations.map((org, index) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => handleSelectOrg(org.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    {org.logo ? (
                      <img
                        src={org.logo}
                        alt={org.name}
                        className="size-4 object-cover"
                      />
                    ) : (
                      <Building2 className="size-4 shrink-0" />
                    )}
                  </div>
                  <span className={activeOrg?.id === org.id ? 'font-semibold' : ''}>
                    {org.name}
                  </span>
                  {activeOrg?.id === org.id && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Active
                    </span>
                  )}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => setShowCreateDialog(true)}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <Plus className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  Add organization
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <CreateOrganizationDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleOrgCreated}
      />
    </>
  )
}
```

2. Update CreateOrganizationDialog to support controlled open state:

```typescript
// Add to CreateOrganizationDialogProps:
open?: boolean
onOpenChange?: (open: boolean) => void

// Update Dialog:
<Dialog
  open={open ?? internalOpen}
  onOpenChange={(o) => {
    onOpenChange?.(o)
    if (o) setInternalOpen(true) else handleClose()
  }}
>
```

**Acceptance Criteria**:
- [ ] TeamSwitcher uses real Better-Auth data
- [ ] Shows all user's organizations
- [ ] Active organization is highlighted
- [ ] Clicking org switches active org
- [ ] "Add organization" opens create dialog
- [ ] Loading state shown while fetching
- [ ] Empty state shows "Create Organization" prompt

**Testing Instructions**:
1. Open sidebar, verify organizations list
2. Click different org - should switch
3. Click "Add organization" - dialog should open
4. Create org - should appear in list and become active
5. Refresh page - should maintain state

**Definition of Done**: Organization switcher uses real data, switching works, creation integrated.

---

## Phase 3: Organization Management UI

### Task 3.1: Create Organization Page Layout with Tabs

**Complexity**: Medium (3-4 hours)

**Dependencies**: Phase 1 complete

**Context**:
Replace the placeholder organization page with a full management interface using tabs for different sections.

**Requirements**:
- **File to modify**: `src/routes/_authed/app/organization.tsx`
- Create tabbed layout with: Overview, Members, Teams, Invitations, Settings
- Use Shadcn UI Tabs component (may need to install)

**Reference Pattern**: Check if tabs exist in `src/components/ui/`, if not, install with `npx shadcn@latest add tabs`

**Implementation Steps**:

1. First, check if Tabs component exists. If not, run:
   ```bash
   npx shadcn@latest add tabs
   ```

2. Open `src/routes/_authed/app/organization.tsx`
3. Replace content with:

```typescript
import { createFileRoute } from '@tanstack/react-router'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, UserCog, Mail, Settings } from 'lucide-react'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/_authed/app/organization')({
  component: OrganizationPage,
})

function OrganizationPage() {
  const { data: activeOrg, isPending } = authClient.useActiveOrganization()

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Organization Selected</CardTitle>
            <CardDescription>
              Please select or create an organization to manage.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{activeOrg.name}</h1>
        <p className="text-muted-foreground">Manage your organization settings and members</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Invitations
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Overview</CardTitle>
              <CardDescription>Quick stats and information</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Organization ID: {activeOrg.id}</p>
              <p>Slug: {activeOrg.slug}</p>
              {/* TODO: Add member count, team count stats */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Manage organization members</CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: MembersList component */}
              <p>Members list will go here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Teams</CardTitle>
              <CardDescription>Manage teams within this organization</CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: TeamsList component */}
              <p>Teams list will go here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Invitations</CardTitle>
              <CardDescription>Pending invitations and join requests</CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: Invitations management */}
              <p>Invitations will go here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
              <CardDescription>Organization settings and danger zone</CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: OrgSettings component */}
              <p>Settings will go here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

4. Save the file

**Acceptance Criteria**:
- [x] Page displays organization name and slug when org is active
- [x] Five tabs are visible: Overview, Members, Teams, Invitations, Settings
- [x] Clicking tabs switches content
- [x] Loading state shown while fetching org
- [x] "No Organization Selected" message when no active org
- [x] Uses existing Shadcn UI components

**Testing Instructions**:
1. Navigate to `/app/organization`
2. With no active org: should see "No Organization Selected"
3. Select an org (via switcher when ready): should see org details and tabs
4. Click each tab - content should switch

**Definition of Done**: Tabbed layout working, shows org info, all tabs clickable.

---

### Task 3.2: Create Members List Component

**Complexity**: Medium (3-4 hours)

**Dependencies**: Task 2.1 complete

**Context**:
The Members tab needs a proper component to display organization members with their roles, and allow admins to manage them (change roles, remove members). This is a core management feature.

**Requirements**:
- **File to create**: `src/components/organization/MembersList.tsx`
- Display all organization members with user info and role
- Allow admins/owners to change member roles
- Allow admins/owners to remove members (except owners)
- Show loading and error states

**Reference**:
- Better-Auth docs: `authClient.organization.listMembers()`, `authClient.organization.updateMemberRole()`, `authClient.organization.removeMember()`
- Table demo: `src/routes/demo/table.tsx`

**Implementation Steps**:

1. Create the organization components directory if it doesn't exist
2. Create `src/components/organization/MembersList.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Trash2 } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Member {
  id: string
  userId: string
  organizationId: string
  role: 'owner' | 'admin' | 'member'
  createdAt: Date
  user: {
    id: string
    email: string
    name: string
    image?: string
  }
}

export default function MembersList() {
  const { data: session } = authClient.useSession()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const queryClient = useQueryClient()
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  // Query: Fetch members using TanStack Query + Better-Auth API
  const {
    data: membersData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['organization-members', activeOrg?.id],
    queryFn: () => authClient.organization.listMembers({
      organizationId: activeOrg?.id,
    }),
    enabled: !!activeOrg?.id,
  })

  // Mutation: Remove member
  const removeMutation = useMutation({
    mutationFn: (memberIdOrEmail: string) =>
      authClient.organization.removeMember({ memberIdOrEmail }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organization-members', activeOrg?.id]
      })
      setRemovingMemberId(null)
    },
  })

  // Mutation: Change role
  const changeRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: 'admin' | 'member' }) =>
      authClient.organization.updateMemberRole({ memberId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organization-members', activeOrg?.id]
      })
    },
  })

  // Extract members array from response
  const members: Member[] = membersData?.data?.members ?? []

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  // Empty state
  if (members.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No members in this organization yet.</p>
      </div>
    )
  }

  const currentUserMember = members.find(m => m.userId === session?.user?.id)
  const isAdmin = currentUserMember?.role === 'admin' || currentUserMember?.role === 'owner'

  const handleRemoveMember = (memberIdOrEmail: string) => {
    removeMutation.mutate(memberIdOrEmail)
  }

  const handleChangeRole = (memberId: string, role: 'admin' | 'member') => {
    changeRoleMutation.mutate({ memberId, role })
  }

  // Combined error from query or mutations
  const errorMessage = error?.message ??
    removeMutation.error?.message ??
    changeRoleMutation.error?.message

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
          {errorMessage}
        </div>
      )}

      <div className="rounded-lg border">
        <div className="grid grid-cols-4 gap-4 p-4 font-semibold text-sm border-b bg-muted/50">
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div className="text-right">Actions</div>
        </div>

        {members.map((member) => (
          <div
            key={member.id}
            className="grid grid-cols-4 gap-4 p-4 border-b last:border-b-0 items-center"
          >
            <div className="text-sm font-medium">
              {member.user.name || 'Unknown'}
              {member.userId === session?.user?.id && (
                <span className="text-xs text-muted-foreground ml-1">(You)</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {member.user.email || '-'}
            </div>
            <div className="text-sm">
              <span className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">
                {member.role}
              </span>
            </div>
            <div className="flex justify-end gap-2">
              {isAdmin && member.role !== 'owner' && member.userId !== session?.user?.id && (
                <>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Change Role <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'admin')}>
                        Admin
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleChangeRole(member.id, 'member')}>
                        Member
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRemovingMemberId(member.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={!!removingMemberId} onOpenChange={() => setRemovingMemberId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovingMemberId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removingMemberId && handleRemoveMember(removingMemberId)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

3. Update the organization page to use the component (already imported in Task 2.1)

**Acceptance Criteria**:
- [ ] `src/components/organization/MembersList.tsx` exists
- [ ] Members are displayed with name, email, role
- [ ] Loading skeleton shown while fetching
- [ ] Empty state shown when no members
- [ ] Admins/owners can change roles (except owner role)
- [ ] Admins/owners can remove members (except owners)
- [ ] Confirmation dialog shown before removing
- [ ] Current user is marked with "(You)"
- [ ] Errors are displayed appropriately

**Testing Instructions**:
1. Navigate to `/app/organization` and select Members tab
2. Verify members are listed with correct information
3. As admin: test changing a member's role
4. As admin: test removing a member (with confirmation)
5. Verify you cannot remove owners or yourself
6. Test error handling by disconnecting network

**Definition of Done**: Members list displays, role changes work, member removal works with confirmation.

---

### Task 3.3: Create Invite Member Dialog ✅ COMPLETE

**Complexity**: Medium (2-3 hours)

**Dependencies**: Task 2.2 complete

**Context**:
Allow organization admins to invite new members by email. Since we're not using email infrastructure, invitations are stored in the database and shown via in-app notifications (to be implemented in Phase 4).

**Implemented**: `src/components/organization/InviteMemberDialog.tsx`
- Dialog with email input field and role selection dropdown
- Email validation using regex pattern
- Role selection: Member or Admin (defaults to Member)
- Loading state while sending invitation
- Success message on successful invite
- Error message display on failure
- Form resets when dialog closes
- Calls `authClient.organization.inviteMember()` API
- Integrated into MembersList with cache invalidation

**Requirements**:
- **File to create**: `src/components/organization/InviteMemberDialog.tsx` ✅
- Dialog with email input and role selection ✅
- Validate email format ✅
- Call Better-Auth invite API ✅
- Show success/error feedback ✅

**Reference**: Better-Auth docs: `authClient.organization.inviteMember()`

**Implementation Steps**:

1. Create `src/components/organization/InviteMemberDialog.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface InviteMemberDialogProps {
  onInviteSent?: () => void
}

export default function InviteMemberDialog({ onInviteSent }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleInvite = async () => {
    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    try {
      setIsPending(true)
      setError(null)

      await authClient.organization.inviteMember({
        email,
        role,
      })

      setSuccess(true)
      setEmail('')
      setRole('member')
      onInviteSent?.()

      // Close dialog after short delay
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setIsPending(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setEmail('')
      setRole('member')
      setError(null)
      setSuccess(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join this organization. The user will see the
            invitation in their notification center.
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
              Invitation sent successfully!
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'member')}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={isPending}>
            {isPending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

2. Note: The Select component may need to be installed:
   ```bash
   npx shadcn@latest add select
   ```

3. Update MembersList to include the invite button, or add to CardHeader in organization page

**Acceptance Criteria**:
- [x] `src/components/organization/InviteMemberDialog.tsx` exists
- [x] Dialog opens with email and role inputs
- [x] Email validation before submitting
- [x] Role selection between member and admin
- [x] Loading state while sending invitation
- [x] Success message shown on successful invite
- [x] Error message shown on failure
- [x] Dialog resets state when closed/reopened

**Testing Instructions**:
1. Click "Invite Member" button
2. Enter invalid email → should show validation error
3. Enter valid email, select role, submit
4. Verify invitation appears in Convex dashboard `invitation` table
5. Test inviting same email twice → should show error

**Definition of Done**: Invite dialog works, creates invitation in database, shows appropriate feedback. ✅ COMPLETE

---

### Task 3.4: Create Pending Invitations List Component ✅ COMPLETE

**Complexity**: Medium (2-3 hours)

**Dependencies**: Task 3.3 complete

**Context**:
The Invitations tab needs to show pending invitations that have been sent but not yet accepted, allowing admins to cancel them if needed.

**Implemented**: `src/components/organization/PendingInvitationsList.tsx`
- Fetches pending invitations via `authClient.organization.listInvitations()` using TanStack Query
- Filters to show only pending status invitations
- Displays email, role, and sent date in a table format
- Cancel button with confirmation dialog for each invitation
- Calls `authClient.organization.cancelInvitation()` to revoke invitations
- Automatically refreshes list after cancellation
- Loading skeleton while fetching
- Empty state with helpful message when no pending invitations
- Integrated into organization page Invitations tab

**Requirements**:
- **File to create**: `src/components/organization/PendingInvitationsList.tsx` ✅
- Display pending invitations with invitee email, role, date ✅
- Allow admins to cancel/revoke invitations ✅
- Show empty state when no pending invitations ✅

**Reference**: Better-Auth docs: `authClient.organization.listInvitations()`, `authClient.organization.cancelInvitation()`

**Implementation Steps**:

1. Create `src/components/organization/PendingInvitationsList.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, X } from 'lucide-react'
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

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  expiresAt: Date
  createdAt: Date
}

export default function PendingInvitationsList() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const queryClient = useQueryClient()
  const [cancelingId, setCancelingId] = useState<string | null>(null)

  // Query: Fetch invitations using TanStack Query + Better-Auth API
  const {
    data: invitationsData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['organization-invitations', activeOrg?.id],
    queryFn: () => authClient.organization.listInvitations({
      organizationId: activeOrg?.id,
    }),
    enabled: !!activeOrg?.id,
    select: (response) => {
      // Filter to only pending invitations
      return (response.data?.invitations ?? []).filter(
        (inv: Invitation) => inv.status === 'pending'
      )
    },
  })

  // Mutation: Cancel invitation
  const cancelMutation = useMutation({
    mutationFn: (invitationId: string) =>
      authClient.organization.cancelInvitation({ invitationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organization-invitations', activeOrg?.id]
      })
      setCancelingId(null)
    },
  })

  const invitations = invitationsData ?? []
  const errorMessage = error?.message ?? cancelMutation.error?.message

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No pending invitations.</p>
        <p className="text-sm text-muted-foreground">
          Use the "Invite Member" button to invite new members.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
          {errorMessage}
        </div>
      )}

      <div className="rounded-lg border">
        <div className="grid grid-cols-4 gap-4 p-4 font-semibold text-sm border-b bg-muted/50">
          <div>Email</div>
          <div>Role</div>
          <div>Sent</div>
          <div className="text-right">Actions</div>
        </div>

        {invitations.map((invitation) => (
          <div
            key={invitation.id}
            className="grid grid-cols-4 gap-4 p-4 border-b last:border-b-0 items-center"
          >
            <div className="text-sm font-medium">{invitation.email}</div>
            <div className="text-sm">
              <span className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">
                {invitation.role}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(invitation.createdAt).toLocaleDateString()}
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCancelingId(invitation.id)}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!cancelingId} onOpenChange={() => setCancelingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this invitation? The user will no
              longer be able to accept it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelingId(null)}>
              Keep Invitation
            </Button>
            <Button
              variant="destructive"
              disabled={cancelMutation.isPending}
              onClick={() => cancelingId && cancelMutation.mutate(cancelingId)}
            >
              {cancelMutation.isPending ? 'Canceling...' : 'Cancel Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

2. Update the organization page Invitations tab to include this component and the InviteMemberDialog

**Acceptance Criteria**:
- [x] `src/components/organization/PendingInvitationsList.tsx` exists
- [x] Pending invitations are displayed with email, role, sent date
- [x] Empty state shown when no pending invitations
- [x] Cancel button with confirmation dialog
- [x] List refreshes after canceling invitation
- [x] Loading skeleton while fetching

**Testing Instructions**:
1. Create some invitations using InviteMemberDialog
2. Navigate to Invitations tab
3. Verify invitations are displayed
4. Cancel an invitation, verify it's removed from list
5. Test with no invitations - should show empty state

**Definition of Done**: Invitations list displays pending invitations, cancel works with confirmation. ✅ COMPLETE

---

### Task 3.5: Create Organization Settings Component

**Complexity**: Medium (3-4 hours)

**Dependencies**: Task 2.1 complete

**Context**:
The Settings tab needs to allow organization owners/admins to update organization details and potentially delete the organization.

**Requirements**:
- **File to create**: `src/components/organization/OrgSettings.tsx`
- Form to update organization name, slug
- Logo upload (optional, stretch goal)
- Danger zone with delete organization button
- Only owners can delete organization

**Reference**: Better-Auth docs: `authClient.organization.update()`, `authClient.organization.delete()`

**Implementation Steps**:

1. Create `src/components/organization/OrgSettings.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { AlertTriangle, Save } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function OrgSettings() {
  const navigate = useNavigate()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const { data: session } = authClient.useSession()

  const [name, setName] = useState(activeOrg?.name ?? '')
  const [slug, setSlug] = useState(activeOrg?.slug ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Check if current user is owner
  const isOwner = activeOrg?.members?.some(
    (m) => m.userId === session?.user?.id && m.role === 'owner'
  )

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setError(null)
      setSuccess(null)

      await authClient.organization.update({
        data: {
          name,
          slug,
        },
      })

      setSuccess('Organization settings updated successfully!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update organization')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmation !== activeOrg?.name) {
      setError('Please type the organization name to confirm deletion')
      return
    }

    try {
      setIsDeleting(true)
      setError(null)

      await authClient.organization.delete({
        organizationId: activeOrg?.id,
      })

      // Navigate to app home after deletion
      navigate({ to: '/app' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete organization')
      setIsDeleting(false)
    }
  }

  if (!activeOrg) {
    return <p>No organization selected</p>
  }

  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update your organization's basic information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-md text-sm">
              {success}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Organization Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Organization"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-organization"
            />
            <p className="text-xs text-muted-foreground">
              Used in URLs. Only lowercase letters, numbers, and hyphens.
            </p>
          </div>

          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone - Only for owners */}
      {isOwner && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that affect your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Delete Organization</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this organization and all its data
                </p>
              </div>
              <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
                Delete Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Organization
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              organization <strong>{activeOrg.name}</strong>, remove all members,
              and delete all associated data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                Type <strong>{activeOrg.name}</strong> to confirm
              </Label>
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={activeOrg.name}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConfirmation('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirmation !== activeOrg.name}
            >
              {isDeleting ? 'Deleting...' : 'Delete Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

2. Update the organization page Settings tab to use this component

**Acceptance Criteria**:
- [ ] `src/components/organization/OrgSettings.tsx` exists
- [ ] Organization name and slug can be edited
- [ ] Save button updates organization
- [ ] Success/error messages displayed
- [ ] Danger zone only visible to owners
- [ ] Delete requires typing organization name
- [ ] After deletion, user is redirected

**Testing Instructions**:
1. Navigate to Settings tab
2. Change organization name, save
3. Verify name is updated (check in switcher)
4. As owner: test delete flow with confirmation
5. As non-owner: verify danger zone is hidden

**Definition of Done**: Settings form works, delete organization works with confirmation (owner only).

---

## Phase 4: Team Management UI

### Task 4.1: Create Teams List Component

**Complexity**: Medium (3-4 hours)

**Dependencies**: Phase 2.1 complete

**Context**:
Teams allow grouping members within an organization. The Teams tab needs a component to display existing teams, their member counts, and allow creation/management of teams.

**Requirements**:
- **File to create**: `src/components/organization/TeamsList.tsx`
- Display teams with name, member count, creation date
- Allow admins to create new teams
- Allow admins to delete teams
- Show empty state when no teams

**Reference**: Better-Auth docs: `authClient.organization.listTeams()`, `authClient.organization.deleteTeam()`

**Implementation Steps**:

1. Create `src/components/organization/TeamsList.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Users } from 'lucide-react'
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
import TeamDialog from './TeamDialog'

interface Team {
  id: string
  name: string
  organizationId: string
  createdAt: Date
}

interface TeamWithMembers extends Team {
  memberCount: number
}

export default function TeamsList() {
  const { data: session } = authClient.useSession()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const queryClient = useQueryClient()
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Query: Fetch teams using TanStack Query + Better-Auth API
  const {
    data: teamsData,
    isLoading,
    error
  } = useQuery({
    queryKey: ['organization-teams', activeOrg?.id],
    queryFn: () => authClient.organization.listTeams({
      organizationId: activeOrg?.id,
    }),
    enabled: !!activeOrg?.id,
    select: (response) => {
      // Map teams with member counts
      return (response.data?.teams ?? []).map((team: Team) => ({
        ...team,
        memberCount: 0, // Will be populated if API returns member info
      }))
    },
  })

  // Mutation: Delete team
  const deleteMutation = useMutation({
    mutationFn: (teamId: string) =>
      authClient.organization.deleteTeam({ teamId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organization-teams', activeOrg?.id]
      })
      setDeletingTeamId(null)
    },
  })

  const teams: TeamWithMembers[] = teamsData ?? []
  const errorMessage = error?.message ?? deleteMutation.error?.message

  // Check if current user is admin/owner
  const isAdmin = activeOrg?.members?.some(
    (m) => m.userId === session?.user?.id && ['owner', 'admin'].includes(m.role)
  )

  const handleTeamCreated = () => {
    setShowCreateDialog(false)
    // Invalidate to refetch teams
    queryClient.invalidateQueries({
      queryKey: ['organization-teams', activeOrg?.id]
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
          {errorMessage}
        </div>
      )}

      {/* Header with create button */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </div>
      )}

      {/* Empty state */}
      {(!teams || teams.length === 0) ? (
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No teams in this organization yet.</p>
          {isAdmin && (
            <p className="text-sm text-muted-foreground">
              Create a team to organize your members.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border">
          <div className="grid grid-cols-4 gap-4 p-4 font-semibold text-sm border-b bg-muted/50">
            <div>Name</div>
            <div>Members</div>
            <div>Created</div>
            <div className="text-right">Actions</div>
          </div>

          {teams.map((team) => (
            <div
              key={team.id}
              className="grid grid-cols-4 gap-4 p-4 border-b last:border-b-0 items-center"
            >
              <div className="text-sm font-medium">{team.name}</div>
              <div className="text-sm text-muted-foreground">
                {team.memberCount} member{team.memberCount !== 1 ? 's' : ''}
              </div>
              <div className="text-sm text-muted-foreground">
                {new Date(team.createdAt).toLocaleDateString()}
              </div>
              <div className="flex justify-end gap-2">
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeletingTeamId(team.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Team Dialog */}
      <TeamDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleTeamCreated}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTeamId} onOpenChange={() => setDeletingTeamId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this team? All team members will be
              removed from the team. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTeamId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deletingTeamId && deleteMutation.mutate(deletingTeamId)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

2. Update the organization page Teams tab to use this component

**Acceptance Criteria**:
- [ ] `src/components/organization/TeamsList.tsx` exists
- [ ] Teams are displayed with name, member count, created date
- [ ] Empty state shown when no teams
- [ ] Create button visible only for admins/owners
- [ ] Delete team with confirmation dialog
- [ ] Loading skeleton while fetching

**Testing Instructions**:
1. Navigate to Teams tab
2. With no teams: verify empty state
3. Create a team (via TeamDialog - next task)
4. Verify team appears in list
5. Delete team, verify removal

**Definition of Done**: Teams list displays, creation triggers dialog, delete works with confirmation.

---

### Task 4.2: Create Team Dialog Component

**Complexity**: Medium (2-3 hours)

**Dependencies**: Task 3.1 complete

**Context**:
Dialog for creating and editing teams within an organization. Includes name input and member selection.

**Requirements**:
- **File to create**: `src/components/organization/TeamDialog.tsx`
- Dialog with team name input
- Optional: member multi-select
- Create new team via Better-Auth API

**Reference**: Better-Auth docs: `authClient.organization.createTeam()`

**Implementation Steps**:

1. Create `src/components/organization/TeamDialog.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface TeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  editTeam?: {
    id: string
    name: string
  }
}

export default function TeamDialog({
  open,
  onOpenChange,
  onSuccess,
  editTeam,
}: TeamDialogProps) {
  const [name, setName] = useState(editTeam?.name ?? '')
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!editTeam

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Team name is required')
      return
    }

    try {
      setIsPending(true)
      setError(null)

      if (isEditing) {
        await authClient.organization.updateTeam({
          teamId: editTeam.id,
          data: { name },
        })
      } else {
        await authClient.organization.createTeam({
          name,
        })
      }

      setName('')
      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEditing ? 'update' : 'create'} team`)
    } finally {
      setIsPending(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      setName(editTeam?.name ?? '')
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Team' : 'Create Team'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the team name.'
              : 'Create a new team within this organization.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Engineering"
              disabled={isPending}
            />
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
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending
              ? isEditing
                ? 'Updating...'
                : 'Creating...'
              : isEditing
                ? 'Update Team'
                : 'Create Team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Acceptance Criteria**:
- [ ] `src/components/organization/TeamDialog.tsx` exists
- [ ] Dialog shows team name input
- [ ] Validation for empty name
- [ ] Creates team via Better-Auth API
- [ ] Supports edit mode for existing teams
- [ ] Loading state while submitting
- [ ] Calls onSuccess callback on completion

**Testing Instructions**:
1. Click "Create Team" from TeamsList
2. Enter empty name → should show validation error
3. Enter valid name, submit
4. Verify team appears in list
5. Test edit mode (if implemented)

**Definition of Done**: Create team dialog works, team is created in database.

---

### Task 4.3: Create Team Switcher Component

**Complexity**: Medium (3-4 hours)

**Dependencies**: Task 3.1 complete

**Context**:
Similar to the organization switcher, users need a way to switch between teams within the current organization. This appears below the organization switcher in the sidebar.

**Requirements**:
- **File to create**: `src/components/TeamSwitcherInOrg.tsx`
- Dropdown showing teams in current organization
- Show active team indicator
- Switch active team on selection

**Reference**:
- Existing pattern: `src/components/team-switcher.tsx`
- Better-Auth docs: `authClient.organization.setActiveTeam()`

**Implementation Steps**:

1. Create `src/components/TeamSwitcherInOrg.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ChevronsUpDown, Users } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

interface Team {
  id: string
  name: string
  organizationId: string
}

export function TeamSwitcherInOrg() {
  const { isMobile } = useSidebar()
  const { data: activeOrg } = authClient.useActiveOrganization()
  const [activeTeam, setActiveTeam] = useState<Team | null>(null)

  // Query: Fetch teams using TanStack Query + Better-Auth API
  const {
    data: teams = [],
    isLoading
  } = useQuery({
    queryKey: ['organization-teams', activeOrg?.id],
    queryFn: () => authClient.organization.listTeams({
      organizationId: activeOrg?.id,
    }),
    enabled: !!activeOrg?.id,
    select: (response) => response.data?.teams ?? [],
    // Set initial active team when data loads
    onSuccess: (teamsList: Team[]) => {
      if (teamsList.length > 0 && !activeTeam) {
        setActiveTeam(teamsList[0])
      }
    },
  })

  // Mutation: Set active team
  const setActiveTeamMutation = useMutation({
    mutationFn: (teamId: string) =>
      authClient.organization.setActiveTeam({ teamId }),
    onSuccess: (_, teamId) => {
      const team = teams.find((t: Team) => t.id === teamId)
      if (team) {
        setActiveTeam(team)
      }
    },
  })

  const handleSelectTeam = (team: Team) => {
    setActiveTeamMutation.mutate(team.id)
  }

  // Don't render if no active org or loading
  if (!activeOrg || isLoading) {
    return null
  }

  if (teams.length === 0) {
    return null
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary">
                <Users className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {activeTeam?.name ?? 'Select Team'}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  Team
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            align="start"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Teams
            </DropdownMenuLabel>
            {teams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                onClick={() => handleSelectTeam(team)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <Users className="size-4 shrink-0" />
                </div>
                <span className={activeTeam?.id === team.id ? 'font-semibold' : ''}>
                  {team.name}
                </span>
                {activeTeam?.id === team.id && (
                  <span className="ml-auto text-xs text-muted-foreground">Active</span>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 p-2 text-muted-foreground"
              onClick={() => {
                // Navigate to teams management
                window.location.href = '/app/organization?tab=teams'
              }}
            >
              Manage Teams
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
```

**Acceptance Criteria**:
- [ ] `src/components/TeamSwitcherInOrg.tsx` exists
- [ ] Shows list of teams in current organization
- [ ] Active team is highlighted
- [ ] Clicking team switches active team
- [ ] Not rendered when no teams or no active org
- [ ] "Manage Teams" link navigates to org settings

**Testing Instructions**:
1. With active organization and teams: team switcher should appear
2. Select a different team: should become active
3. Verify active team persists after refresh
4. With no teams: switcher should not appear

**Definition of Done**: Team switcher works, switching updates active team context.

---

### Task 4.4: Update App Sidebar with Team Switcher

**Complexity**: Small (1-2 hours)

**Dependencies**: Tasks 2.5 (org switcher with real data), 3.3 complete

**Context**:
Integrate the team switcher into the app sidebar, showing it below the organization switcher when an organization is active and has teams.

**Requirements**:
- **File to modify**: `src/components/app-sidebar.tsx`
- Add TeamSwitcherInOrg below organization switcher
- Only show when activeOrganization exists

**Implementation Steps**:

1. Open `src/components/app-sidebar.tsx`
2. Import the TeamSwitcherInOrg component
3. Add it below the existing team/org switcher in SidebarHeader:

```typescript
import { TeamSwitcherInOrg } from '@/components/TeamSwitcherInOrg'

// In the SidebarHeader section:
<SidebarHeader>
  <TeamSwitcher teams={data.teams} /> {/* Organization switcher */}
  <TeamSwitcherInOrg /> {/* Team switcher - self-handles visibility */}
</SidebarHeader>
```

**Acceptance Criteria**:
- [ ] TeamSwitcherInOrg imported in app-sidebar.tsx
- [ ] Team switcher appears below org switcher
- [ ] Team switcher only shows when org is active and has teams
- [ ] Visual separation between org and team switchers

**Testing Instructions**:
1. Open app sidebar with active organization
2. Verify team switcher appears below org switcher
3. Switch organizations: team switcher should update
4. With org that has no teams: team switcher should hide

**Definition of Done**: Team switcher integrated into sidebar, appears contextually.

---

## Phase 5: Invitation System - In-App Notifications

> **Architecture Note**: This phase leverages **Convex's native real-time reactivity** instead of TanStack Store with polling. Convex queries automatically subscribe to data changes and re-render components when data updates. This is simpler, more efficient, and provides instant updates.

### Task 5.1: Create Convex Invitation Queries ✅ COMPLETE

**Complexity**: Medium (2-3 hours)

**Dependencies**: Phase 1 complete

**Context**:
Better-Auth stores invitations in Convex tables via its Convex adapter. We need Convex queries to fetch pending invitations for the current user. These queries will use Convex's reactive subscription system for real-time updates without polling.

**Implemented**: `convex/invitations.ts`
- Query `listPendingForUser` lists pending invitations using `components.betterAuth.adapter.findMany`
- Query `getPendingCount` fetches only the count of pending invitations for a specific user.
- Query `getInvitation` fetches a single invitation by id using `components.betterAuth.adapter.findOne`
- Uses `requireAuth` from `auth_helpers.ts` for proper authentication.

**Requirements**:
- **File to create**: `convex/invitations.ts` ✅
- Query to list pending invitations for current user ✅
- Query to get invitation count (for badge) ✅
- Proper authentication and authorization ✅

**Why Convex over TanStack Store + Polling**:
- ✅ **Real-time**: Automatic updates when any invitation changes
- ✅ **Efficient**: No wasted polling cycles - only fetches when data changes
- ✅ **Simpler**: No store setup, no polling intervals, no manual state management
- ✅ **Consistent**: Same pattern as other Convex data in the app

**Implementation Steps**:

1. Create `convex/invitations.ts`:

```typescript
import { query } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth } from './auth'

/**
 * List pending invitations for the current user.
 * Uses Convex's real-time subscriptions - no polling needed.
 */
export const listPendingForUser = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx)

    // Query the invitation table for pending invitations matching user's email
    const invitations = await ctx.db
      .query('invitation')
      .filter((q) =>
        q.and(
          q.eq(q.field('email'), user.email),
          q.eq(q.field('status'), 'pending')
        )
      )
      .order('desc')
      .collect()

    // Enrich with organization names
    const enrichedInvitations = await Promise.all(
      invitations.map(async (inv) => {
        const org = await ctx.db
          .query('organization')
          .filter((q) => q.eq(q.field('id'), inv.organizationId))
          .first()

        const inviter = inv.inviterId
          ? await ctx.db
              .query('user')
              .filter((q) => q.eq(q.field('id'), inv.inviterId))
              .first()
          : null

        return {
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          organizationId: inv.organizationId,
          organizationName: org?.name ?? 'Unknown Organization',
          organizationSlug: org?.slug,
          inviterName: inviter?.name ?? 'Unknown',
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
        }
      })
    )

    return enrichedInvitations
  },
})

/**
 * Get count of pending invitations for badge display.
 * Lightweight query for just the count.
 */
export const getPendingCount = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx)

    const invitations = await ctx.db
      .query('invitation')
      .filter((q) =>
        q.and(
          q.eq(q.field('email'), user.email),
          q.eq(q.field('status'), 'pending')
        )
      )
      .collect()

    return invitations.length
  },
})

/**
 * Get a single invitation by ID (for accept/decline operations).
 */
export const getInvitation = query({
  args: {
    invitationId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx)

    const invitation = await ctx.db
      .query('invitation')
      .filter((q) => q.eq(q.field('id'), args.invitationId))
      .first()

    if (!invitation) {
      return null
    }

    const org = await ctx.db
      .query('organization')
      .filter((q) => q.eq(q.field('id'), invitation.organizationId))
      .first()

    return {
      ...invitation,
      organizationName: org?.name ?? 'Unknown',
    }
  },
})
```

2. Note: The `invitation` table is created by Better-Auth's Convex adapter. Check the schema to verify the table structure.

**Acceptance Criteria**:
- [x] `convex/invitations.ts` exists
- [x] `listPendingForUser` returns pending invitations with org details
- [x] `getPendingCount` returns integer count for badge
- [x] Queries require authentication
- [x] Real-time updates work (test by creating invitation in another tab)

**Testing Instructions**:
1. Log in as user
2. In another browser, invite the user to an organization
3. Verify the invitation appears instantly (no refresh needed)
4. Accept the invitation, verify it disappears from list instantly

**Definition of Done**: Convex invitation queries work with real-time reactivity. ✅ COMPLETE

---

### Task 5.2: Create useNotifications Hook

**Complexity**: Small (1-2 hours)

**Dependencies**: Task 4.1 complete

**Context**:
A custom React hook that combines invitation and join request data using Convex's reactive queries. This replaces the TanStack Store + polling approach with Convex's native reactivity.

**Requirements**:
- **File to create**: `src/hooks/useNotifications.ts`
- Combine pending invitations and join requests
- Compute total unread count
- All data automatically updates in real-time via Convex subscriptions

**Why a hook instead of a store + provider**:
- No separate store layer needed - Convex IS the store
- No provider required - `useQuery` works anywhere
- No polling setup - Convex handles subscriptions automatically

**Implementation Steps**:

1. Create `src/hooks/useNotifications.ts`:

```typescript
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { authClient } from '@/lib/auth-client'

/**
 * Hook for accessing notification data with real-time updates.
 * Uses Convex's reactive queries - no polling needed.
 */
export function useNotifications() {
  const { data: session } = authClient.useSession()
  const { data: activeOrg } = authClient.useActiveOrganization()

  // Pending invitations for current user - auto-updates via Convex subscription
  const pendingInvitations = useQuery(
    api.invitations.listPendingForUser,
    session?.user ? {} : 'skip'
  )

  // User's own join requests - auto-updates via Convex subscription
  const myJoinRequests = useQuery(
    api.joinRequests.listMyJoinRequests,
    session?.user ? {} : 'skip'
  )

  // For admins: pending join requests to review
  const isAdmin = activeOrg?.members?.some(
    (m) => m.userId === session?.user?.id && ['owner', 'admin'].includes(m.role)
  )

  const pendingJoinRequestsToReview = useQuery(
    api.joinRequests.listPendingJoinRequests,
    isAdmin && activeOrg?.id ? { organizationId: activeOrg.id } : 'skip'
  )

  // Computed values
  const invitationCount = pendingInvitations?.length ?? 0
  const joinRequestsToReviewCount = pendingJoinRequestsToReview?.length ?? 0
  const unreadCount = invitationCount + joinRequestsToReviewCount

  // Loading state
  const isLoading =
    pendingInvitations === undefined ||
    myJoinRequests === undefined ||
    (isAdmin && pendingJoinRequestsToReview === undefined)

  return {
    // Data
    pendingInvitations: pendingInvitations ?? [],
    myJoinRequests: myJoinRequests ?? [],
    pendingJoinRequestsToReview: pendingJoinRequestsToReview ?? [],

    // Counts
    invitationCount,
    joinRequestsToReviewCount,
    unreadCount,

    // State
    isLoading,
    isAdmin,
  }
}

/**
 * Lightweight hook for just the notification count (for badge).
 * Uses a separate optimized query.
 */
export function useNotificationCount() {
  const { data: session } = authClient.useSession()
  const { data: activeOrg } = authClient.useActiveOrganization()

  const invitationCount = useQuery(
    api.invitations.getPendingCount,
    session?.user ? {} : 'skip'
  )

  const isAdmin = activeOrg?.members?.some(
    (m) => m.userId === session?.user?.id && ['owner', 'admin'].includes(m.role)
  )

  const joinRequestCount = useQuery(
    api.joinRequests.countPendingJoinRequests,
    isAdmin && activeOrg?.id ? { organizationId: activeOrg.id } : 'skip'
  )

  const count = (invitationCount ?? 0) + (joinRequestCount ?? 0)

  return {
    count,
    isLoading: invitationCount === undefined,
  }
}
```

2. Add count query to joinRequests if not exists (`convex/joinRequests.ts`):

```typescript
export const countPendingJoinRequests = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx)
    // Add admin check here

    const requests = await ctx.db
      .query('joinRequest')
      .withIndex('by_organizationId', (q) =>
        q.eq('organizationId', args.organizationId)
      )
      .filter((q) => q.eq(q.field('status'), 'pending'))
      .collect()

    return requests.length
  },
})
```

**Acceptance Criteria**:
- [ ] `src/hooks/useNotifications.ts` exists
- [ ] `useNotifications` hook returns all notification data
- [ ] `useNotificationCount` hook returns just the count
- [ ] Data updates in real-time without polling
- [ ] Loading states handled correctly
- [ ] Proper handling when user is not logged in

**Testing Instructions**:
1. Use the hook in a test component
2. Verify data loads and displays correctly
3. Create an invitation from another browser - verify it appears instantly
4. Accept/decline invitation - verify list updates instantly

**Definition of Done**: Notification hooks work with Convex real-time reactivity.

---

### Task 5.3: Create Notification Center Component

**Complexity**: Medium (3-4 hours)

**Dependencies**: Tasks 4.1, 4.2 complete

**Context**:
A dropdown notification center accessible from the header, showing pending invitations with accept/decline actions. Uses the `useNotifications` hook which provides real-time data via Convex subscriptions. Notification center should show both pending invitations and pending join requests to review (for admins). 

**Requirements**:
- **File to create**: `src/components/NotificationCenter.tsx`
- Bell icon with unread count badge
- Dropdown with notification list
- Link to full invitations page(For admins, link to organization settings invitations tab)
- Accept/decline actions per invitation(for users - that are invited)

**Implementation Steps**:

1. Create `src/components/NotificationCenter.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Bell, Check, X, ChevronRight, Loader2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { useNotifications } from '@/hooks/useNotifications'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function NotificationCenter() {
  // Real-time data via Convex subscriptions - no polling needed!
  const {
    pendingInvitations,
    pendingJoinRequestsToReview,
    unreadCount,
    isLoading,
  } = useNotifications()

  const [processingId, setProcessingId] = useState<string | null>(null)

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      setProcessingId(invitationId)
      await authClient.organization.acceptInvitation({ invitationId })
      // No need to manually remove - Convex will auto-update the query!
    } catch (err) {
      console.error('Failed to accept invitation:', err)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      setProcessingId(invitationId)
      await authClient.organization.rejectInvitation({ invitationId })
      // No need to manually remove - Convex will auto-update the query!
    } catch (err) {
      console.error('Failed to decline invitation:', err)
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : unreadCount > 0 ? (
            <span className="text-xs text-muted-foreground">
              {unreadCount} pending
            </span>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {pendingInvitations.length === 0 &&
         pendingJoinRequestsToReview.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          <>
            {/* Pending Invitations */}
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="p-3 border-b last:border-b-0"
              >
                <p className="text-sm font-medium">
                  Invitation to {invitation.organizationName}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  {invitation.inviterName} invited you as {invitation.role}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={processingId === invitation.id}
                    onClick={() => handleDeclineInvitation(invitation.id)}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Decline
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={processingId === invitation.id}
                    onClick={() => handleAcceptInvitation(invitation.id)}
                  >
                    {processingId === invitation.id ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3 mr-1" />
                    )}
                    Accept
                  </Button>
                </div>
              </div>
            ))}

            {/* Join Requests to Review (for admins) */}
            {pendingJoinRequestsToReview.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs">
                  Join Requests
                </DropdownMenuLabel>
                {pendingJoinRequestsToReview.slice(0, 3).map((request) => (
                  <DropdownMenuItem key={request.id} asChild>
                    <Link
                      to="/app/organization"
                      search={{ tab: 'invitations' }}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">
                        Request from user to join
                      </span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            to="/app/invitations"
            className="w-full text-center text-sm"
          >
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Key Changes from Original**:
- Uses `useNotifications()` hook instead of `useNotificationStore()`
- No manual `removeInvitation()` calls - Convex auto-updates
- Added loading indicator in header
- Better loading states on buttons

**Acceptance Criteria**:
- [ ] `src/components/NotificationCenter.tsx` exists
- [ ] Bell icon with badge showing unread count
- [ ] Dropdown lists pending invitations
- [ ] Accept/decline buttons work for users
- [ ] Loading state while processing
- [ ] Empty state when no notifications
- [ ] Link to full invitations page (For admins, link to organization settings invitations tab)
- [ ] **Real-time updates** - invitation appears/disappears instantly

**Testing Instructions**:
1. Create invitation for test user (from another browser)
2. Log in as test user, verify bell shows badge **instantly** (no refresh)
3. Open dropdown, verify invitation shown
4. Accept invitation, verify it disappears from list **instantly**
5. Decline invitation, verify it's removed **instantly**

**Definition of Done**: Notification center shows invitations with working actions and real-time updates.

---

### Task 5.4: Create Full Notifications Page

**Complexity**: Medium (4-6 hours)

**Dependencies**: Task 4.3, 5.2 complete

**Context**:
Replace the originally planned invitations page with a comprehensive **Notification Page**. This page serves as a central hub for all actionable alerts the user receives: pending organization invitations, the current status of their own join requests, and a foundational structure for future "General Notifications."

**1. Data Layer & Backend Logic**
- **Pending Invitations**: The `useNotifications` hook already loads `pendingInvitations` via the real-time query `api.invitations.listPendingForUser`.
- **My Join Requests**: Also already loaded via `api.joinRequests.listMyJoinRequests`.
  - Actions on join requests: `cancelJoinRequest` is already defined in `convex/joinRequests.ts`.
- **Future Extensibility**: In `convex/schema.ts`, a `notifications` table isn't created *yet*, but leave a placeholder comment in the page for it.
- **Handling Accept/Decline**: 
  - To respect Better Auth's adapter integration (see `AGENTS.md`), we use the built-in Better Auth client method to accept/decline invitations, as this properly registers user membership. Avoid creating custom Convex mutations for this unless absolutely necessary.
  - When an invitation is accepted (`authClient.organization.acceptInvitation`), the user joins the org. If `authClient.useActiveOrganization()` returns `null`, the UI should immediately call `authClient.organization.setActive({ organizationId })` so they are contextually dropped into their new organization.

**2. Auth & Better Auth Integration API Usage**
- **Accept**: `authClient.organization.acceptInvitation({ invitationId: string })`
- **Decline**: `authClient.organization.rejectInvitation({ invitationId: string })`
- **Cancel Join Request**: `api.joinRequests.cancelJoinRequest` in Convex.
- **Join Request Action**: When a user's join request is "approved", they are technically already added as a member by the admin's `approveJoinRequest` flow. Their "action" here is simply "Switch to Org", which invokes `authClient.organization.setActive({ organizationId })` and redirects them to the app.

**3. UI/UX (Frontend)**

**Route & Navigation**:
- **Path**: `src/routes/_authed/app/notifications.tsx`
- **Link Update**: The "View all notifications" link inside `NotificationCenter.tsx` must point to `/app/notifications`.

**Page Layout Details**:
1. **Tabs or Sections**: Layout should clearly separate categories (or use tabs):
   - **Invitations** (Primary focus if any are pending)
   - **Join Requests** (Show all requests the user made: pending, approved, rejected)
   - **System Alerts** (A greyed-out or minimal placeholder section reading "No system alerts" for the future `notifications` table)

2. **Actions & Feedback**:
   - Create a reusable hook (e.g., `useNotificationActions`) that wraps the API calls for accept/decline/cancel, and manages a `processingId` state. Use this hook in *both* this page and the `NotificationCenter` component to keep it DRY.
   - For an **approved join request**, display a **"Switch to Organization"** button that invokes `setActive(orgId)` and navigates to `/app`.
   - Provide loaders and empty states ("You have no pending invitations").

**4. Implementation Order**:
1. **Refactoring Shared Actions**: Extract the accept/decline logic currently residing in `NotificationCenter.tsx` into a reusable custom hook `src/hooks/useNotificationActions.ts`. Ensure the hook automatically checks if the user has an active org, and handles `setActive` upon accepting an invite.
2. **Update Notification Center**: Update `NotificationCenter.tsx` to use the new `useNotificationActions` hook and correct the "View all notifications" link to `/app/notifications`.
3. **Route Setup**: Create the basic route structure in `src/routes/_authed/app/notifications.tsx`.
4. **Build UI Sections**: Build out the cards and lists for "Organization Invitations", "My Join Requests", and the "System Alerts" placeholder.
5. **Wire Up Actions**: Attach the action hook methods to the respective buttons on the new page.

**Implementation Steps (Code Guide)**:

1. Create `src/hooks/useNotificationActions.ts` (Example outline):
```typescript
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { useMutation as useConvexMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useNavigate } from '@tanstack/react-router'

export function useNotificationActions() {
  const [processingId, setProcessingId] = useState<string | null>(null)
  const { data: activeOrg } = authClient.useActiveOrganization()
  const cancelJoinRequest = useConvexMutation(api.joinRequests.cancelJoinRequest)
  const navigate = useNavigate()

  const acceptInvitation = async (invitationId: string, orgId: string) => {
    try {
      setProcessingId(invitationId)
      await authClient.organization.acceptInvitation({ invitationId })
      
      // Auto switch if no active org
      if (!activeOrg) {
        await authClient.organization.setActive({ organizationId: orgId })
        navigate({ to: '/app' })
      }
    } finally {
      setProcessingId(null)
    }
  }

  const declineInvitation = async (invitationId: string) => { /* logic */ }
  const handleCancelRequest = async (requestId: string) => { /* logic */ }
  const switchToOrg = async (orgId: string) => { /* setActive & nav */ }

  return { processingId, acceptInvitation, declineInvitation, handleCancelRequest, switchToOrg }
}
```

2. Replace the old Invitations page structure by creating `src/routes/_authed/app/notifications.tsx`:
```typescript
import { createFileRoute } from '@tanstack/react-router'
import { useNotifications } from '@/hooks/useNotifications'
import { useNotificationActions } from '@/hooks/useNotificationActions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// ...

export const Route = createFileRoute('/_authed/app/notifications')({
  component: NotificationsPage,
})

function NotificationsPage() {
  const { pendingInvitations, myJoinRequests, isLoading } = useNotifications()
  const actions = useNotificationActions()

  // Render the Tabs for "Invitations", "Join Requests", and "System Alerts (Coming Soon)"
  // Wire up actions.acceptInvitation(inv.id, inv.organizationId) on Accept buttons
  // Wire up actions.switchToOrg() for approved Join Requests
  // ...
}
```

**Acceptance Criteria**:
- [ ] `src/hooks/useNotificationActions.ts` works and is shared between the page and `NotificationCenter.tsx`.
- [ ] Accepting an invite securely uses Better Auth APIs, making the user a member.
- [ ] Accepting an invite automatically switches the active organization if none is active.
- [ ] `src/routes/_authed/app/notifications.tsx` exists and renders correctly.
- [ ] Approved join requests present a "Switch to Organization" button.
- [ ] Placeholder section for "System Alerts/Other" is present.
- [ ] Link inside `NotificationCenter` successfully navigates to `/app/notifications`.

**Testing Instructions**:
1. Open the app, view the notification dropdown and use "View all notifications" to jump to the new page.
2. Accept an invitation with no active organization — ensure it auto-navigates or switches properly.
3. Test canceling a join request from the new page.
4. Verify code is DRY (using `useNotificationActions` everywhere).

**Definition of Done**: Notification page lives at `/app/notifications`, efficiently aggregates all real-time Convex requests via Better Auth UI actions, and unifies logic with the Nav component.

---

### Task 5.5: Update Nav User with Notification Center

**Complexity**: Small (1-2 hours)

**Dependencies**: Task 4.3 complete

**Context**:
Integrate the notification center into the navigation, making it easily accessible from anywhere in the app.

**Requirements**:
- **File to modify**: `src/components/nav-user.tsx`
- Add NotificationCenter next to user menu
- Ensure proper spacing and alignment

**Implementation Steps**:

1. Open `src/components/nav-user.tsx`
2. Import and add NotificationCenter component:

```typescript
import { NotificationCenter } from '@/components/NotificationCenter'

// In the component render, add next to user avatar/menu:
<div className="flex items-center gap-2">
  <NotificationCenter />
  {/* Existing user menu dropdown */}
</div>
```

**Acceptance Criteria**:
- [ ] NotificationCenter imported in nav-user.tsx
- [ ] Bell icon visible in navigation
- [ ] Proper spacing between notification and user menu
- [ ] Responsive on mobile

**Testing Instructions**:
1. Verify notification bell appears in navigation
2. Click bell, verify dropdown opens
3. Test on mobile viewport

**Definition of Done**: Notification center visible in navigation, works on all viewports.

---

## Phase 6: Join Request System

### Task 6.1: Extend Join Request API with Organization Discovery

**Complexity**: Medium (2-3 hours)

**Dependencies**: Task 1.4, 1.5, 1.6 complete

**Context**:
For users to request joining organizations, they need a way to discover organizations that accept join requests. This task extends the join request API with discovery functionality.

**Requirements**:
- **File to modify**: `convex/joinRequests.ts`
- Add query to search/list public organizations
- Add organization visibility/discoverability settings support

**Implementation Steps**:

1. Open `convex/joinRequests.ts`
2. Add organization search function:

```typescript
/**
 * Search for organizations that are publicly discoverable.
 * Returns organizations matching the search query.
 */
export const searchPublicOrganizations = query({
  args: {
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx)

    const limit = args.limit ?? 20

    // Get all organizations
    // Note: In production, you'd want to filter by a 'isPublic' or 'allowJoinRequests' field
    let orgs = await ctx.db
      .query('organization')
      .order('desc')
      .take(limit * 2) // Take more to account for filtering

    // Filter by search query if provided
    if (args.query && args.query.trim()) {
      const searchLower = args.query.toLowerCase()
      orgs = orgs.filter(
        (org) =>
          org.name.toLowerCase().includes(searchLower) ||
          (org.slug && org.slug.toLowerCase().includes(searchLower))
      )
    }

    // Return limited results
    return orgs.slice(0, limit).map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      createdAt: org.createdAt,
    }))
  },
})

/**
 * Get public profile of an organization for join request.
 */
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
- [ ] `searchPublicOrganizations` query exists
- [ ] Search filters by name and slug
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

  const organizations = useQuery(api.joinRequests.searchPublicOrganizations, {
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
