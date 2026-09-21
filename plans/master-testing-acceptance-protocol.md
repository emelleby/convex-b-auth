# Master Testing and Acceptance Protocol

**Project**: Convex + Better-Auth Organization Plugin Implementation
**Created**: 2026-05-07
**Purpose**: Centralized checklist for QA verification across all project phases

---

## How to Use This Document

- Each phase section contains **Acceptance Criteria** (checkboxes) and **Test Checklists** (manual test steps).
- Mark items as you verify them during QA.
- This document covers **all phases** — both completed and upcoming — so nothing is missed.

---

## Phase 1: Schema & Backend Foundation

### Task 1.1: Add joinRequest Table to Convex Schema

- [ ] `joinRequest` table exists in schema with all fields (`id`, `userId`, `organizationId`, `message`, `status`, `reviewedBy`, `reviewedAt`, `createdAt`)
- [ ] Three indexes are defined: `by_organizationId`, `by_userId`, `by_status_and_organizationId`
- [ ] `npx convex dev` runs without errors
- [ ] Schema follows existing patterns in the file

**Test Steps**:
1. Run `npx convex dev` — should complete without errors
2. Check Convex dashboard — `joinRequest` table should appear

---

### Task 1.2: Update Invitation Table with teamId Field

- [ ] `invitation` table has `teamId` field of type `v.optional(v.string())`
- [ ] Existing invitation functionality is not broken
- [ ] Schema syncs without errors

**Test Steps**:
1. Run `npx convex dev`
2. Verify in Convex dashboard that invitation table has the new `teamId` field

---

### Task 1.3: Update Auth Client with Teams Configuration

- [ ] `organizationClient` has `teams: { enabled: true }` configuration
- [ ] No TypeScript errors
- [ ] App still compiles and runs

**Test Steps**:
1. Run `npm run dev`
2. Open browser console, type `authClient.organization` — should see team methods available

---

### Task 1.4: Update Auth Server with Member Limits and Invitation Hooks

- [ ] `organization()` plugin has `membershipLimit` configured
- [ ] `sendInvitationEmail` hook is defined (empty/no-op implementation)
- [ ] `teams.maximumTeams` is set to 10
- [ ] Schema syntax is correct
- [ ] Server compiles without errors

**Test Steps**:
1. Run `npx convex dev` — should complete without errors
2. Create a test invitation through the app — should not send email, should log to console

---

### Task 1.5: Create Join Request Convex Functions - Part 1 (Create & List)

- [ ] File `convex/joinRequests.ts` exists
- [ ] `createJoinRequest` mutation validates no duplicate pending requests
- [ ] `createJoinRequest` mutation validates user is not already a member
- [ ] `listMyJoinRequests` returns user's requests with org names
- [ ] `listPendingJoinRequests` only accessible to admins/owners
- [ ] All functions use `requireAuth()` helper
- [ ] No TypeScript errors

**Test Steps**:
1. Run `npx convex dev`
2. In app, create a test join request
3. Verify request appears in `joinRequest` table
4. Verify `listMyJoinRequests` returns the request

---

### Task 1.6: Create Join Request Convex Functions - Part 2 (Approve/Reject/Cancel)

- [ ] `approveJoinRequest` adds user as member with 'member' role
- [ ] `approveJoinRequest` updates request status to 'approved'
- [ ] `rejectJoinRequest` updates request status to 'rejected'
- [ ] `cancelJoinRequest` deletes the request (only owner can cancel)
- [ ] All mutations verify appropriate permissions
- [ ] All mutations handle edge cases (not found, already processed)

**Test Steps**:
1. Create a join request (from Task 1.5)
2. Test approve flow — user should become member
3. Create another request, test reject flow
4. Create another request, test cancel flow (as requesting user)

---

## Phase 2: Create Organization Flow

### Task 2.1: Create Organization Dialog

- [ ] `src/components/organization/CreateOrganizationDialog.tsx` exists
- [ ] Name input with validation (required)
- [ ] Slug auto-generates from name
- [ ] Slug can be manually edited
- [ ] Slug validation (alphanumeric and hyphens only, must start/end with alphanumeric)
- [ ] Optional logo URL input
- [ ] Creates organization via Better-Auth API (`authClient.organization.create`)
- [ ] Sets new org as active after creation (`authClient.organization.setActive`)
- [ ] Error handling and loading states during submission
- [ ] Form resets on close

**Test Steps**:
1. Open create organization dialog
2. Enter name — slug should auto-generate
3. Manually edit slug — should stop auto-generating
4. Submit with empty name — should show error
5. Submit valid form — organization should be created
6. Verify new org appears in switcher and is active

---

### Task 2.2: Integrate Create Organization in Switcher

- [ ] TeamSwitcher uses real Better-Auth data (`useListOrganizations`, `useActiveOrganization`)
- [ ] Shows all user's organizations in dropdown
- [ ] Active organization is highlighted with "Active" label
- [ ] Clicking org switches active org (`setActive`)
- [ ] "Add organization" opens CreateOrganizationDialog
- [ ] Loading state (animated skeleton) shown while fetching
- [ ] Empty state shows "Create Organization" prompt

**Test Steps**:
1. Open sidebar, verify organizations list loads
2. Click different org — should switch active org
3. Click "Add organization" — dialog should open
4. Create org — should appear in list and become active
5. Refresh page — should maintain state

---

## Phase 3: Organization Management UI

### Task 3.1: Create Organization Page Layout with Tabs

- [ ] Page displays organization name and slug when org is active
- [ ] Five tabs are visible: Overview, Members, Teams, Invitations, Settings
- [ ] Clicking tabs switches content
- [ ] Loading state shown while fetching org
- [ ] "No Organization Selected" message when no active org
- [ ] Uses existing Shadcn UI components

**Test Steps**:
1. Navigate to `/app/organization`
2. With no active org: should see "No Organization Selected"
3. Select an org (via switcher): should see org details and tabs
4. Click each tab — content should switch

---

### Task 3.2: Create Members List Component

- [ ] `src/components/organization/MembersList.tsx` exists
- [ ] Members are displayed with name, email, role
- [ ] Loading skeleton shown while fetching
- [ ] Empty state shown when no members
- [ ] Admins/owners can change roles (except owner role)
- [ ] Admins/owners can remove members (except owners)
- [ ] Confirmation dialog shown before removing
- [ ] Current user is marked with "(You)"
- [ ] Errors are displayed appropriately

**Test Steps**:
1. Navigate to `/app/organization` and select Members tab
2. Verify members are listed with correct information
3. As admin: test changing a member's role
4. As admin: test removing a member (with confirmation)
5. Verify you cannot remove owners or yourself
6. Test error handling by disconnecting network

---

### Task 3.3: Create Invite Member Dialog

- [ ] `src/components/organization/InviteMemberDialog.tsx` exists
- [ ] Dialog opens with email and role inputs
- [ ] Email validation before submitting
- [ ] Role selection between member and admin
- [ ] Loading state while sending invitation
- [ ] Success message shown on successful invite
- [ ] Error message shown on failure
- [ ] Dialog resets state when closed/reopened

**Test Steps**:
1. Click "Invite Member" button
2. Enter invalid email — should show validation error
3. Enter valid email, select role, submit
4. Verify invitation appears in Convex dashboard `invitation` table
5. Test inviting same email twice — should show error

---

### Task 3.4: Create Pending Invitations List Component

- [ ] `src/components/organization/PendingInvitationsList.tsx` exists
- [ ] Pending invitations are displayed with email, role, sent date
- [ ] Empty state shown when no pending invitations
- [ ] Cancel button with confirmation dialog
- [ ] List refreshes after canceling invitation
- [ ] Loading skeleton while fetching

**Test Steps**:
1. Create some invitations using InviteMemberDialog
2. Navigate to Invitations tab
3. Verify invitations are displayed
4. Cancel an invitation, verify it's removed from list
5. Test with no invitations — should show empty state

---

### Task 3.5: Create Organization Settings Component

- [ ] `src/components/organization/OrgSettings.tsx` exists
- [ ] Organization name and slug can be edited
- [ ] Save button updates organization
- [ ] Success/error messages displayed
- [ ] Danger zone only visible to owners
- [ ] Delete requires typing organization name to confirm
- [ ] After deletion, user is redirected to `/app`

**Test Steps**:
1. Navigate to Settings tab
2. Change organization name, save
3. Verify name is updated (check in switcher)
4. As owner: test delete flow with confirmation
5. As non-owner: verify danger zone is hidden

---

## Phase 4: Team Management UI

### Task 4.1: Create Teams List Component

- [ ] `src/components/organization/TeamsList.tsx` exists
- [ ] Teams are displayed with name, member count, created date
- [ ] Empty state shown when no teams
- [ ] Create button visible only for admins/owners
- [ ] Delete team with confirmation dialog
- [ ] Loading skeleton while fetching

**Test Steps**:
1. Navigate to Teams tab
2. With no teams: verify empty state
3. Create a team (via TeamDialog)
4. Verify team appears in list
5. Delete team, verify removal

---

### Task 4.2: Create Team Dialog Component

- [ ] `src/components/organization/TeamDialog.tsx` exists
- [ ] Dialog shows team name input
- [ ] Validation for empty name
- [ ] Creates team via Better-Auth API (`authClient.organization.createTeam`)
- [ ] Supports edit mode for existing teams (`authClient.organization.updateTeam`)
- [ ] Loading state while submitting
- [ ] Calls `onSuccess` callback on completion
- [ ] API call uses `data: { name }` wrapper correctly

**Test Steps**:
1. Click "Create Team" from TeamsList
2. Enter empty name — should show validation error
3. Enter valid name, submit
4. Verify team appears in list
5. Test edit mode — existing team name populates, edit saves correctly

---

### Task 4.3: Create Team Switcher Component

- [ ] `src/components/TeamSwitcherInOrg.tsx` exists
- [ ] Shows list of teams in current organization
- [ ] Active team is highlighted
- [ ] Clicking team switches active team
- [ ] Not rendered when no teams or no active org
- [ ] "Manage Teams" link navigates to org settings

**Test Steps**:
1. With active organization and teams: team switcher should appear in sidebar
2. Select a different team: should become active
3. Verify active team persists after refresh
4. With no teams: switcher should not appear

---

### Task 4.4: Update App Sidebar with Team Switcher

- [ ] TeamSwitcherInOrg imported in `app-sidebar.tsx`
- [ ] Team switcher appears below org switcher
- [ ] Team switcher only shows when org is active and has teams
- [ ] Visual separation between org and team switchers

**Test Steps**:
1. Open app sidebar with active organization
2. Verify team switcher appears below org switcher
3. Switch organizations: team switcher should update
4. With org that has no teams: team switcher should hide

---

## Phase 5: Invitation System — In-App Notifications

### Task 5.1: Create Convex Invitation Queries

- [ ] `convex/invitations.ts` exists
- [ ] `listPendingForUser` returns pending invitations with org details (org name, inviter name)
- [ ] `getPendingCount` returns integer count for badge
- [ ] `getInvitation` fetches single invitation by ID
- [ ] Queries require authentication (`requireAuth`)
- [ ] Real-time updates work (test by creating invitation in another tab)

**Test Steps**:
1. Log in as user
2. In another browser, invite the user to an organization
3. Verify the invitation appears instantly (no refresh needed)
4. Accept the invitation, verify it disappears from list instantly

---

### Task 5.2: Create useNotifications Hook

- [ ] `src/hooks/useNotifications.ts` exists
- [ ] `useNotifications` hook returns all notification data (pending invitations, my join requests, pending join requests to review, counts)
- [ ] `useNotificationCount` hook returns just the count
- [ ] Data updates in real-time without polling (via Convex subscriptions)
- [ ] Loading states handled correctly
- [ ] Proper handling when user is not logged in

**Test Steps**:
1. Use the hook in a test component
2. Verify data loads and displays correctly
3. Create an invitation from another browser — verify it appears instantly
4. Accept/decline invitation — verify list updates instantly

---

### Task 5.3: Create Notification Center Component

- [ ] `src/components/NotificationCenter.tsx` exists
- [ ] Bell icon with badge showing unread count
- [ ] Badge caps at "9+" for counts over 9
- [ ] Dropdown lists pending invitations with accept/decline buttons
- [ ] Shows join requests to review for admins (links to org invitations tab)
- [ ] Loading state while processing actions
- [ ] Empty state when no notifications
- [ ] Link to full notifications page at `/app/notifications`
- [ ] Real-time updates — invitation appears/disappears instantly

**Test Steps**:
1. Create invitation for test user (from another browser)
2. Log in as test user, verify bell shows badge instantly (no refresh)
3. Open dropdown, verify invitation shown
4. Accept invitation, verify it disappears from list instantly
5. Decline invitation, verify it's removed instantly

---

### Task 5.4: Create Full Notifications Page

- [ ] `src/hooks/useNotificationActions.ts` works and is shared between the page and `NotificationCenter.tsx`
- [ ] Accepting an invite uses Better Auth APIs (`authClient.organization.acceptInvitation`), making the user a member
- [ ] Accepting an invite automatically switches the active organization if none is active
- [ ] `src/routes/_authed/app/notifications.tsx` exists and renders correctly
- [ ] Page has tabs for Invitations, Join Requests, and System Alerts (placeholder)
- [ ] Approved join requests present a "Switch to Organization" button
- [ ] Cancel join request action works
- [ ] Placeholder section for "System Alerts/Other" is present
- [ ] Link inside `NotificationCenter` navigates to `/app/notifications`

**Test Steps**:
1. Open the app, view the notification dropdown and use "View all notifications" to jump to the new page
2. Accept an invitation with no active organization — ensure it auto-navigates or switches properly
3. Test canceling a join request from the new page
4. Verify code is DRY (using `useNotificationActions` everywhere)

---

### Task 5.5: Update Nav User with Notification Center

- [ ] NotificationCenter imported in `nav-user.tsx`
- [ ] Bell icon with badge visible in navigation (next to user avatar)
- [ ] Proper spacing between notification bell and user menu
- [ ] Responsive on mobile
- [ ] Link to `/app/notifications` works (not just plain link)

**Test Steps**:
1. Verify notification bell appears in navigation
2. Click bell, verify dropdown opens
3. Test on mobile viewport

---

## Phase 6: Organization Discovery & Join Request System

### Task 6.1: Organization Search API with Privacy Filters

- [ ] `convex/orgDiscovery.ts` exists as a dedicated module
- [ ] `searchPublicOrganizations` query exists with privacy filter (`metadata.allowJoinRequests !== false`)
- [ ] Search filters by name and slug (with search index or fallback)
- [ ] Orgs the user is already a member of are excluded
- [ ] Returns limited, safe public data only (no internal IDs, no member list)
- [ ] `getPublicOrganizationProfile` returns org details with member count
- [ ] All queries require authentication

**Test Steps**:
1. Call `searchPublicOrganizations` with no query — should return orgs
2. Call with search query — should filter results
3. Call `getPublicOrganizationProfile` with valid org ID
4. Verify member count is accurate
5. Verify private orgs (with `allowJoinRequests: false`) are excluded

---

### Task 6.2: Browse Organizations Page

- [ ] `src/routes/_authed/app/browse-organizations.tsx` exists
- [ ] Search input filters organizations (300ms debounce)
- [ ] Organization cards display name, slug, logo
- [ ] "Request to Join" button opens JoinRequestDialog
- [ ] "Request Pending" shown if already requested
- [ ] Loading and empty states handled
- [ ] Sidebar navigation link to this page

**Test Steps**:
1. Navigate to `/app/browse-organizations`
2. Verify organizations are displayed
3. Search for organization by name — results filter
4. Click "Request to Join" — dialog should open
5. After submitting request, button should show "Request Pending"
6. Verify empty state when no orgs match

---

### Task 6.3: Join Request Dialog

- [ ] `src/components/organization/JoinRequestDialog.tsx` exists
- [ ] Shows organization name
- [ ] Optional message textarea
- [ ] Submit creates join request via `api.joinRequests.createJoinRequest`
- [ ] Success/error messages shown
- [ ] Handles duplicate-pending and already-member errors gracefully
- [ ] Dialog resets on close

**Test Steps**:
1. Open dialog from browse page
2. Submit without message — should work
3. Submit with message — should include message
4. Try submitting duplicate — should show error
5. Try when already member — should show error

---

### Task 6.4: Join Requests Admin Component

- [ ] `src/components/organization/JoinRequestsAdmin.tsx` exists
- [ ] Shows pending requests with user info and date
- [ ] Displays request message if present
- [ ] Approve button adds user to organization
- [ ] Reject button with confirmation dialog
- [ ] Real-time updates via Convex subscriptions
- [ ] Loading and empty states handled
- [ ] Only visible to admins/owners
- [ ] Integrated in Invitations tab of org page

**Test Steps**:
1. Create join request from another user
2. As admin, navigate to Invitations tab
3. See pending request with message (if any)
4. Approve request — user should become member
5. Create another, reject it
6. Verify request is removed after action

---

### Task 6.5: Join Request Lifecycle Enhancements

- [ ] `cancelJoinRequest` updates status to `cancelled` instead of deleting (soft-delete for audit trail)
- [ ] `expireStaleRequests` mutation exists for auto-expiry (configurable period, default 30 days)
- [ ] `listMyJoinRequests` returns all statuses including `cancelled` and `expired`
- [ ] UI shows appropriate labels for each status

**Test Steps**:
1. Create a join request, cancel it — verify status is `cancelled` (not deleted)
2. Run `expireStaleRequests` — verify old requests become `expired`
3. View join requests list — verify cancelled/expired are shown with labels

---

## Phase 7: Subscription-Gated Organization Creation

### Task 7.1: Subscription Schema & Backend

- [ ] `subscription` table exists in schema with all fields (`userId`, `plan`, `status`, `stripeCustomerId`, `stripeSubscriptionId`, `currentPeriodStart`, `currentPeriodEnd`)
- [ ] Indexes on `userId` and `stripeCustomerId`
- [ ] Schema syncs without errors

**Test Steps**:
1. Run `npx convex dev` — should complete without errors
2. Check Convex dashboard — `subscription` table should appear with correct fields

---

### Task 7.2: Subscription Check Helpers

- [ ] `convex/subscription.ts` exists with `getUserSubscription` and `canCreateOrganization` queries
- [ ] `src/hooks/useSubscription.ts` exists
- [ ] Returns `isPro: true` only when plan is 'pro' and status is 'active'
- [ ] Defaults to free plan when no subscription record exists

**Test Steps**:
1. Query `getUserSubscription` with no subscription record — should return `{ plan: 'free', status: 'active', isPro: false }`
2. Query `canCreateOrganization` with no subscription — should return `false`
3. Verify hook returns correct values

---

### Task 7.3: Gate CreateOrganizationDialog

- [ ] Non-Pro users see upgrade prompt instead of creation form
- [ ] Pro users see normal creation form
- [ ] Loading state while checking subscription
- [ ] Backend validates Pro status in `beforeCreateOrganization` hook
- [ ] Cannot bypass gate via direct API call

**Test Steps**:
1. As free user, open CreateOrganizationDialog — should see upgrade prompt
2. As Pro user (manually set in DB), open dialog — should see creation form
3. Attempt direct API call as free user — should be rejected by backend
4. Verify loading skeleton shows during subscription check

---

### Task 7.4: Payment Gateway Placeholder

- [ ] `src/components/organization/UpgradePlanDialog.tsx` exists
- [ ] Shows Pro plan features and "coming soon" message
- [ ] "Upgrade to Pro" in nav-user opens the dialog
- [ ] Modular: easy to swap placeholder for Stripe Checkout
- [ ] Used in `CreateOrganizationDialog` when user is not Pro

**Test Steps**:
1. Open UpgradePlanDialog — verify Pro features listed and "coming soon" message
2. Click "Upgrade to Pro" in nav-user — dialog should open
3. Verify from CreateOrganizationDialog non-Pro flow — upgrade dialog appears

---

## Phase 8: Enhanced RBAC & Permissions

### Task 8.1: Permission Model & Backend Helpers

- [ ] `convex/permissions.ts` exists with all helper functions
- [ ] `requireOrgRole` validates user has required role in org
- [ ] `canInviteMembers`, `canManageJoinRequests`, `canManageTeams`, `canDeleteOrganization` exist
- [ ] Existing join request functions refactored to use shared helpers
- [ ] All existing role checks still work after refactor

**Permission Matrix to Verify**:

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
| Cancel own join request | self | self | self |
| Browse organizations | ✅ | ✅ | ✅ |
| Create organization | plan-gated | plan-gated | plan-gated |

**Test Steps**:
1. Test each permission as owner — all actions should succeed
2. Test each permission as admin — all except delete org should succeed
3. Test each permission as member — only browse and own join request cancel should work
4. Verify `requireOrgRole` throws appropriate error for unauthorized roles

---

### Task 8.2: useOrgRole Hook & Conditional UI

- [ ] `src/hooks/useOrgRole.ts` exists
- [ ] Returns `role`, `isOwner`, `isAdmin`, `isMember`
- [ ] At least 2 components refactored to use the hook (MembersList, TeamsList, OrgSettings, etc.)
- [ ] No regression in existing permission-enforced UI

**Test Steps**:
1. Import `useOrgRole` in a component
2. Verify correct values for owner, admin, and member roles
3. Verify admin-only UI elements are hidden for members
4. Verify owner-only UI elements (danger zone) are hidden for admins

---

### Task 8.3: Invitation Token System

- [ ] Invitation tokens are generated when invitations are created
- [ ] `/app/invitations?token=<token>` shows invitation details
- [ ] Accept/decline works from the token URL
- [ ] Expired/invalid tokens show appropriate error
- [ ] Works for logged-in users (unauthenticated users redirected to login first)
- [ ] `getInvitationByToken` query exists in `convex/invitations.ts`

**Test Steps**:
1. Create an invitation, retrieve its token
2. Open `/app/invitations?token=<token>` in another browser
3. Verify invitation details are displayed
4. Accept invitation from token URL — user should become member
5. Test expired/invalid token — should show error message
6. Test as unauthenticated user — should redirect to login

---

### Task 8.4: Refactor Existing Role Checks

- [ ] No inline `['owner', 'admin'].includes(membership.role)` patterns remain in component code
- [ ] No inline `activeOrg?.members?.some(...)` patterns remain outside `useOrgRole.ts`
- [ ] All backend role checks use `permissions.ts` helpers
- [ ] All frontend role checks use `useOrgRole()` hook
- [ ] No regression in existing functionality

**Test Steps**:
1. Search codebase for `['owner', 'admin'].includes` — should find no results outside `permissions.ts`
2. Search codebase for `activeOrg?.members?.some` — should find no results outside `useOrgRole.ts`
3. Run through all existing UI flows (members, teams, settings, invitations) — verify no regressions

---

## Cross-Phase Integration Tests

These tests verify end-to-end workflows that span multiple phases:

### Workflow A: Discover & Join Organization (Phases 1, 5, 6)

- [ ] User can browse organizations via search
- [ ] User can submit join request with optional message
- [ ] Admin receives real-time notification of join request
- [ ] Admin can approve — user becomes member
- [ ] Admin can reject — user sees rejected status
- [ ] User can cancel their own pending request

### Workflow B: Invitation-Based Onboarding (Phases 1, 3, 5)

- [ ] Admin can invite user by email with role selection
- [ ] Invited user sees invitation in notification center (real-time)
- [ ] User can accept invitation — becomes member
- [ ] User can decline invitation — removed from pending
- [ ] Accepting with no active org auto-switches to new org
- [ ] Invitation can be accepted via URL token (Phase 8)

### Workflow C: Pro-Gated Organization Creation (Phases 2, 7)

- [ ] Free user sees upgrade prompt when creating org
- [ ] Pro user can create organization normally
- [ ] Backend blocks direct API calls from free users
- [ ] Upgrade dialog is modular and consistent across the app

### Workflow D: Organization & Team Management (Phases 2, 3, 4, 8)

- [ ] User can create org and become owner
- [ ] Owner can invite members and assign roles
- [ ] Admin can manage members (change roles, remove)
- [ ] Teams can be created within organizations
- [ ] Team switcher works in sidebar
- [ ] Owner can delete organization with confirmation
- [ ] Member cannot access admin-only features

### Workflow E: Notification System (Phase 5)

- [ ] Bell badge shows correct unread count
- [ ] Bell badge caps at "9+"
- [ ] Dropdown shows invitations and join requests to review
- [ ] Actions (accept/decline) update instantly
- [ ] Full notifications page shows all categories
- [ ] Real-time updates without polling
