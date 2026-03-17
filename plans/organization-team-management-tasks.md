# Organization & Team Management - Developer Task Specifications

**Project**: Convex + Better-Auth Organization Plugin Implementation
**Created**: 2026-03-17
**Total Estimated Time**: ~80-100 hours
**Phases**: 6

---

## Progress Tracking

### Phase 1: Schema & Backend Foundation
- ✅ Task 1.1: Add joinRequest Table to Convex Schema - **COMPLETE**
- ✅ Task 1.2: Update Invitation Table with teamId Field - **COMPLETE**
- ✅ Task 1.3: Update Auth Client with Teams Configuration - **COMPLETE**
- ✅ Task 1.4: Update Auth Server with Member Limits and Invitation Hooks - **COMPLETE**
- ✅ Task 1.5: Create Join Request Convex Functions - Part 1 (Create & List) - **COMPLETE**
- ✅ Task 1.6: Create Join Request Convex Functions - Part 2 (Approve/Reject/Cancel) - **COMPLETE**

### Phase 2: Organization Management UI
- ✅ Task 2.1: Create Organization Page Layout with Tabs - **COMPLETE** (2026-03-17)
  - Installed Shadcn UI Tabs component
  - Implemented tabbed layout with 5 tabs: Overview, Members, Teams, Invitations, Settings
  - Added loading and empty states
  - File: `src/routes/_authed/app/organization.tsx`
  - All acceptance criteria met ✓
- ⏳ Task 2.2: Create Members List Component - **PENDING**
- ⏳ Task 2.3: Create Teams List Component - **PENDING**
- ⏳ Task 2.4: Implement Invitations Management - **PENDING**
- ⏳ Task 2.5: Create Organization Settings Component - **PENDING**

---

## Table of Contents

1. [Phase 1: Schema & Backend Foundation](#phase-1-schema--backend-foundation)
2. [Phase 2: Organization Management UI](#phase-2-organization-management-ui)
3. [Phase 3: Team Management UI](#phase-3-team-management-ui)
4. [Phase 4: Invitation System](#phase-4-invitation-system---in-app-notifications)
5. [Phase 5: Join Request System](#phase-5-join-request-system)
6. [Phase 6: Create Organization Flow](#phase-6-create-organization-flow)

---

## Reference Documentation

- **Better-Auth Organization Plugin**: `/home/eivind/emelleby/convex-b-auth/docs/better-auth-docs/organization-plugin.md`
- **Convex Schema Pattern**: `convex/schema.ts`
- **Auth Client Usage**: `src/lib/auth-client.ts`
- **Auth Server Config**: `convex/auth.ts`
- **Team Switcher Pattern**: `src/components/team-switcher.tsx`
- **Convex Function Patterns**: `convex/todos.ts`, `convex/people.ts`
- **Auth Helper Pattern**: `convex/auth_helpers.ts`

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

## Phase 2: Organization Management UI

### Task 2.1: Create Organization Page Layout with Tabs

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

