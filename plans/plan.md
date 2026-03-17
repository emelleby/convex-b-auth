
This is a top-level plan for the organization and team management feature. 

Your task is to continue working on the developer task specifications document(`organization-team-management-tasks.md`). I've already created the initial tasks for Phase 1 and started Phase 2. Looking at the document, you need to continue adding more tasks to complete all 6 phases:

Phase 1: Schema & Backend Foundation - Tasks 1.1-1.6 (done)
Phase 2: Organization Management UI - Task 2.1 done, need more tasks
Phase 3: Team Management UI
Phase 4: Invitation System
Phase 5: Join Request System
Phase 6: Create Organization Flow

Please continue adding the remaining tasks to complete the developer task specifications document. I'll add more tasks for Phase 2 and then continue with Phases 3-6.

---

# Implementation Plan: Organization & Team Management with Better-Auth

## Overview

Implement comprehensive organization and team management using the Better-Auth organization plugin in a TanStack Start + Convex application. This includes creating/managing organizations, team management within organizations, in-app invitation notifications, and join request workflows—all without email sending infrastructure.

## Requirements Summary

| Requirement | Details |
|-------------|---------|
| **Organizations** | Create, manage settings, member limits (unlimited = Pro feature) |
| **Teams** | Create/manage teams within orgs, users can be in multiple teams |
| **Memberships** | Multi-org, multi-team per user |
| **Invitations** | No email, in-app notifications only |
| **Join Requests** | Users request to join, admins approve/reject |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│ Org Switcher│ Team Switch │ Org Settings│ Invitation  │  Join   │
│ (existing)  │ (new)       │ Page        │ Center      │ Requests│
└──────┬──────┴──────┬──────┴──────┬──────┴──────┬──────┴────┬────┘
       │             │             │             │           │
       ▼             ▼             ▼             ▼           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Better-Auth Client API                        │
│  authClient.organization.* / authClient.useListOrganizations()  │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Convex Backend + Better-Auth                  │
│         Organization Plugin APIs + Custom Join Requests          │
└─────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Convex Database                          │
│   organization │ member │ invitation │ team │ teamMember │       │
│                │        │            │      │            │       │
│            joinRequest (NEW) │ session (updated)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Phase 1: Schema & Backend Foundation (4 files)

#### 1.1 **Update Convex Schema** (File: `convex/schema.ts`)
- **Action**: Add `joinRequest` table and update `invitation` table with `teamId`
- **Why**: Better-Auth organization plugin handles org/member/team/invitation tables, but join requests need custom implementation
- **Dependencies**: None
- **Risk**: Low

```typescript
// Add to schema.ts
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

// Update invitation table - add teamId
invitation: defineTable({
  // ... existing fields
  teamId: v.optional(v.string()), // Add this for team invitations
})
```

#### 1.2 **Update Auth Configuration** (File: `convex/auth.ts`)
- **Action**: Enhance organization plugin config with member limits, team settings, and invitation hooks
- **Why**: Enable member limit restrictions, team functionality, and custom invitation behavior
- **Dependencies**: Step 1.1
- **Risk**: Medium - must preserve existing auth functionality

```typescript
organization({
  teams: {
    enabled: true,
    maximumTeams: 10,
  },
  // Member limit hook (Pro feature check)
  membershipLimit: async (organizationId) => {
    // Check if org has Pro plan
    const org = await getOrganization(organizationId);
    const metadata = org?.metadata ? JSON.parse(org.metadata) : {};
    return metadata.plan === 'pro' ? Infinity : 5; // 5 members for free, unlimited for Pro
  },
  // No email sending - just store invitation
  sendInvitationEmail: async (data) => {
    // Intentionally empty - no email infrastructure
    // Invitations are handled via in-app notifications
    console.log(`Invitation created for ${data.email} to ${data.organization.name}`);
  },
})
```

#### 1.3 **Update Auth Client** (File: `src/lib/auth-client.ts`)
- **Action**: Enable teams in organizationClient plugin
- **Why**: Client needs to know teams are enabled for proper API access
- **Dependencies**: Step 1.2
- **Risk**: Low

```typescript
import { organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [
    convexClient(),
    organizationClient({
      teams: { enabled: true }
    })
  ]
})
```

#### 1.4 **Create Join Request Mutations** (File: `convex/joinRequests.ts` - NEW)
- **Action**: Create Convex functions for join request CRUD operations
- **Why**: Better-Auth doesn't have built-in join requests, need custom implementation
- **Dependencies**: Step 1.1
- **Risk**: Low

```typescript
// Functions to create:
// - createJoinRequest(organizationId, message?)
// - listJoinRequests(organizationId) - for admins
// - listMyJoinRequests() - for users
// - approveJoinRequest(requestId)
// - rejectJoinRequest(requestId)
// - cancelJoinRequest(requestId)
```

---

### Phase 2: Organization Management UI (5 files)

#### 2.1 **Create Organization Page Layout** (File: `src/routes/_authed/app/organization.tsx`)
- **Action**: Replace placeholder with tabbed organization management page
- **Why**: Central hub for organization settings, members, teams, invitations
- **Dependencies**: Phase 1 complete
- **Risk**: Low

**Tabs Structure:**
- Overview (org info, quick stats)
- Members (list, invite, roles)
- Teams (list, create, manage)
- Invitations (pending, sent)
- Settings (name, logo, delete org)

#### 2.2 **Create Organization Settings Component** (File: `src/components/organization/OrgSettings.tsx` - NEW)
- **Action**: Build settings form with org name, slug, logo upload, delete option
- **Why**: Admins need to manage organization details
- **Dependencies**: Step 2.1
- **Risk**: Low

#### 2.3 **Create Members Management Component** (File: `src/components/organization/MembersList.tsx` - NEW)
- **Action**: Display members with role badges, remove/update role actions
- **Why**: Core member management functionality
- **Dependencies**: Step 2.1
- **Risk**: Low

#### 2.4 **Create Invite Member Dialog** (File: `src/components/organization/InviteMemberDialog.tsx` - NEW)
- **Action**: Dialog to invite by email with role selection
- **Why**: Trigger Better-Auth invitation flow
- **Dependencies**: Step 2.3
- **Risk**: Low

#### 2.5 **Update OrganizationSwitcher** (File: `src/components/team-switcher.tsx`)
- **Action**: Connect to real Better-Auth data, add "Create Organization" action
- **Why**: Currently using mock data, needs real org switching
- **Dependencies**: Phase 1 complete
- **Risk**: Medium - core navigation component

```typescript
// Use Better-Auth hooks:
const { data: organizations } = authClient.useListOrganizations()
const { data: activeOrg } = authClient.useActiveOrganization()
// Switch organization:
await authClient.organization.setActive({ organizationId })
```

---

### Phase 3: Team Management UI (4 files)

#### 3.1 **Create Teams List Component** (File: `src/components/organization/TeamsList.tsx` - NEW)
- **Action**: Display teams within organization with member counts
- **Why**: Users need to see and manage teams
- **Dependencies**: Phase 2.1
- **Risk**: Low

#### 3.2 **Create Team Management Dialog** (File: `src/components/organization/TeamDialog.tsx` - NEW)
- **Action**: Create/edit team dialog with name input, member selection
- **Why**: Allow team CRUD operations
- **Dependencies**: Step 3.1
- **Risk**: Low

#### 3.3 **Create Team Switcher Component** (File: `src/components/TeamSwitcher.tsx` - NEW)
- **Action**: Dropdown to switch between teams within current organization
- **Why**: Requirement: second switcher for team selection
- **Dependencies**: Step 3.1
- **Risk**: Low

```typescript
// Similar pattern to organization switcher
// Uses: authClient.organization.listTeams()
// Uses: authClient.organization.setActiveTeam()
```

#### 3.4 **Update App Sidebar** (File: `src/components/app-sidebar.tsx`)
- **Action**: Add TeamSwitcher below organization switcher, show only when org is active
- **Why**: Users need quick team switching in sidebar
- **Dependencies**: Steps 2.5, 3.3
- **Risk**: Low

```tsx
<SidebarHeader>
  <TeamSwitcher teams={organizations} />  {/* Organization switcher */}
  {activeOrganization && <TeamSwitcherInOrg />}  {/* Team switcher */}
</SidebarHeader>
```

---

### Phase 4: Invitation System - In-App Notifications (5 files)

#### 4.1 **Create Invitation Notification Store** (File: `src/stores/notifications.ts` - NEW)
- **Action**: TanStack Store for managing invitation notifications state
- **Why**: Need reactive state for notification badge, invitation list
- **Dependencies**: None
- **Risk**: Low

```typescript
import { Store } from '@tanstack/store'

interface NotificationState {
  pendingInvitations: Invitation[]
  pendingJoinRequests: JoinRequest[]
  unreadCount: number
}

export const notificationStore = new Store<NotificationState>({
  pendingInvitations: [],
  pendingJoinRequests: [],
  unreadCount: 0,
})
```

#### 4.2 **Create Notifications Provider** (File: `src/components/NotificationsProvider.tsx` - NEW)
- **Action**: Provider that polls/subscribes for new invitations and join requests
- **Why**: Keep notification state in sync with backend
- **Dependencies**: Steps 1.4, 4.1
- **Risk**: Medium - needs efficient polling strategy

```typescript
// Fetch invitations for current user
const { data: invitations } = await authClient.organization.listUserInvitations()
// Update store with new invitations
```

#### 4.3 **Create Notification Center Component** (File: `src/components/NotificationCenter.tsx` - NEW)
- **Action**: Dropdown showing pending invitations with accept/decline actions
- **Why**: Users need to see and act on invitations
- **Dependencies**: Steps 4.1, 4.2
- **Risk**: Low

**Features:**
- Bell icon with unread count badge
- List of pending org/team invitations
- Accept / Decline buttons per invitation
- Link to full invitation management page

#### 4.4 **Create Invitations Page** (File: `src/routes/_authed/app/invitations.tsx` - NEW)
- **Action**: Full page listing all invitations and join request statuses
- **Why**: Detailed view for managing all pending actions
- **Dependencies**: Step 4.3
- **Risk**: Low

#### 4.5 **Update Nav User Component** (File: `src/components/nav-user.tsx`)
- **Action**: Add notification bell with badge next to user menu
- **Why**: Prominent placement for notification access
- **Dependencies**: Step 4.3
- **Risk**: Low

---

### Phase 5: Join Request System (4 files)

#### 5.1 **Create Join Request API** (File: `convex/joinRequests.ts` - extend from 1.4)
- **Action**: Add organization discovery and public profile endpoints
- **Why**: Users need to find organizations to request joining
- **Dependencies**: Step 1.4
- **Risk**: Medium - security consideration for org visibility

```typescript
// Additional functions:
// - searchPublicOrganizations(query) - find orgs accepting join requests
// - getPublicOrganizationProfile(slug) - view org details before requesting
```

#### 5.2 **Create Browse Organizations Page** (File: `src/routes/_authed/app/browse-organizations.tsx` - NEW)
- **Action**: Page to search/browse organizations and request to join
- **Why**: Users need discovery mechanism for organizations
- **Dependencies**: Step 5.1
- **Risk**: Low

#### 5.3 **Create Join Request Dialog** (File: `src/components/organization/JoinRequestDialog.tsx` - NEW)
- **Action**: Dialog with optional message for join request
- **Why**: Clean UX for requesting membership
- **Dependencies**: Step 5.2
- **Risk**: Low

#### 5.4 **Create Admin Join Requests Tab** (File: `src/components/organization/JoinRequestsAdmin.tsx` - NEW)
- **Action**: Tab in org settings showing pending join requests with approve/reject
- **Why**: Admins need to manage incoming requests
- **Dependencies**: Steps 1.4, 2.1
- **Risk**: Low

---

### Phase 6: Create Organization Flow (2 files)

#### 6.1 **Create Organization Dialog** (File: `src/components/organization/CreateOrganizationDialog.tsx` - NEW)
- **Action**: Dialog with name, slug, logo inputs for creating new org
- **Why**: Users need to create organizations
- **Dependencies**: Phase 1 complete
- **Risk**: Low

**Fields:**
- Organization name (required)
- Slug (auto-generated, editable)
- Logo upload (optional)
- Description/metadata (optional)

#### 6.2 **Integrate Create Org in Switcher** (File: `src/components/team-switcher.tsx` - update)
- **Action**: Wire up "Add team" button to open CreateOrganizationDialog
- **Why**: Seamless org creation from switcher
- **Dependencies**: Steps 2.5, 6.1
- **Risk**: Low

---

## File Summary

| Phase | New Files | Modified Files |
|-------|-----------|----------------|
| 1 | `convex/joinRequests.ts` | `convex/schema.ts`, `convex/auth.ts`, `src/lib/auth-client.ts` |
| 2 | `src/components/organization/OrgSettings.tsx`, `MembersList.tsx`, `InviteMemberDialog.tsx` | `src/routes/_authed/app/organization.tsx`, `src/components/team-switcher.tsx` |
| 3 | `src/components/TeamSwitcher.tsx`, `organization/TeamsList.tsx`, `organization/TeamDialog.tsx` | `src/components/app-sidebar.tsx` |
| 4 | `src/stores/notifications.ts`, `src/components/NotificationsProvider.tsx`, `NotificationCenter.tsx`, `src/routes/_authed/app/invitations.tsx` | `src/components/nav-user.tsx` |
| 5 | `src/routes/_authed/app/browse-organizations.tsx`, `src/components/organization/JoinRequestDialog.tsx`, `organization/JoinRequestsAdmin.tsx` | `convex/joinRequests.ts` |
| 6 | `src/components/organization/CreateOrganizationDialog.tsx` | `src/components/team-switcher.tsx` |

**Total: 15 new files, 8 modified files**

---

## Testing Strategy

### Unit Tests
- `convex/joinRequests.ts` - Test all CRUD operations, permission checks
- Notification store - Test state updates, count calculations
- Organization/team switcher logic - Test switching, loading states

### Integration Tests
- Better-Auth organization flows: create org → invite member → accept → verify membership
- Join request flow: request → approve → verify membership
- Team management: create team → add members → verify team membership

### E2E Tests (Playwright/Cypress)
1. **Organization Creation Flow**
   - User creates organization → becomes owner → sees in switcher

2. **Invitation Flow**
   - Admin invites user → invitee sees notification → accepts → joins org

3. **Join Request Flow**
   - User finds org → requests to join → admin approves → user joins

4. **Team Management Flow**
   - Admin creates team → adds members → users see in team switcher

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Better-Auth schema conflicts with Convex** | High | Generate schema with `npx auth generate`, carefully merge with existing schema |
| **Notification polling performance** | Medium | Use efficient polling interval (30s), consider WebSocket upgrade later |
| **Member limit bypass** | Medium | Server-side validation in `membershipLimit` hook, never trust client |
| **Join request spam** | Medium | Rate limiting, one pending request per user per org |
| **Data inconsistency between Better-Auth tables and custom joinRequest** | Medium | Use transactions where possible, implement cleanup jobs |

---

## Success Criteria

- [ ] Users can create organizations and become owner
- [ ] Users can be invited to organizations (in-app, no email)
- [ ] Users see pending invitations in notification center
- [ ] Users can accept/decline invitations
- [ ] Users can request to join organizations
- [ ] Admins can approve/reject join requests
- [ ] Teams can be created within organizations
- [ ] Users can belong to multiple teams within an org
- [ ] Team switcher appears when organization is active
- [ ] Organization switcher works with real data
- [ ] Member limits enforced (5 free, unlimited Pro)
- [ ] All CRUD operations have proper permission checks

---

## Implementation Order Recommendation

**Week 1: Foundation**
- Phase 1 (Schema & Backend) - 2 days
- Phase 2.5 (Org Switcher with real data) - 1 day
- Phase 6 (Create Org Flow) - 1 day

**Week 2: Organization Management**
- Phase 2 (Org Management UI) - 3 days
- Phase 3 (Team Management) - 2 days

**Week 3: Invitations & Join Requests**
- Phase 4 (Invitation System) - 3 days
- Phase 5 (Join Request System) - 2 days

**Week 4: Polish & Testing**
- Integration testing - 2 days
- Bug fixes & polish - 2 days
- Documentation - 1 day

---

This plan provides a comprehensive, phased approach that builds incrementally—each phase produces working functionality that can be tested before proceeding to the next. Would you like me to start implementing any specific phase?
