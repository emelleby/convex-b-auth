# Auth System: Production Grade Audit & Roadmap

**Date**: 2026-05-05
**Status**: Draft — for senior engineer review
**Scope**: Better Auth + Convex adapter, TanStack Start (SSR), TanStack Router

---

## 1. Current Architecture

### Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Auth library | `better-auth` | `1.5.3` |
| Convex adapter | `@convex-dev/better-auth` | `^0.11.2` |
| Convex SDK | `convex` | `^1.33.1` |
| SSR framework | `@tanstack/react-start` | `latest` |
| Router | `@tanstack/react-router` | `latest` |

### Auth Flow (Current)

```
┌─────────────────────────────────────────────────────────┐
│  SSR (initial load)                                     │
│                                                         │
│  __root.tsx beforeLoad                                  │
│    └─ getToken() → cookie → token                       │
│    └─ setAuth(token) on serverHttpClient                │
│    └─ return { isAuthenticated, token }                 │
│                                                         │
│  ConvexProvider receives initialToken                    │
│  ConvexBetterAuthProvider bridges token → Convex client  │
│  _authed/route.tsx beforeLoad checks isAuthenticated     │
│  _authed/route.tsx loader calls getCurrentUser           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Client-side navigation (after login)                   │
│                                                         │
│  authClient.signIn.email() → cookie set                 │
│  navigate({ to: '/app' })                               │
│  _authed/route.tsx beforeLoad: isAuthenticated = true   │
│  Route renders → Convex queries subscribe               │
│  ConvexBetterAuthProvider fetches /api/auth/convex/token │
│    └─ 401 if session cookie not propagated yet           │
│  Queries fire with no Convex token → Unauthenticated    │
└─────────────────────────────────────────────────────────┘
```

### Key Files

| File | Role |
|------|------|
| `convex/betterAuth/auth.ts` | Backend auth config, plugins, hooks |
| `convex/betterAuth/schema.ts` | 17-table schema (user, session, org, team, etc.) |
| `convex/http.ts` | HTTP route registration for Better Auth |
| `convex/auth.ts` | Re-exports + `getCurrentUser` query |
| `convex/auth_helpers.ts` | `requireAuth()` helper |
| `src/lib/auth-client.ts` | Client-side Better Auth instance |
| `src/lib/auth-server.ts` | SSR token extraction (`getToken`, `handler`) |
| `src/integrations/convex/provider.tsx` | `ConvexBetterAuthProvider` + `expectAuth: true` |
| `src/routes/__root.tsx` | SSR auth resolution, token propagation |
| `src/routes/_authed/route.tsx` | Auth guard + user pre-fetch |
| `src/routes/_public/login.tsx` | Login/signup form |
| `src/hooks/useNotifications.ts` | Query gating with `'skip'` |

---

## 2. Problems Identified

### P1. Race Condition: Better Auth Session vs Convex Token (Critical)

**Problem**: After login, `authClient.useSession()` resolves immediately (cookie-based), but the Convex auth token is not yet available. Client-side queries see `session?.user` as truthy, skip the `'skip'` guard, and fire unauthenticated Convex queries.

**Evidence**:
- `ConvexError: Unauthenticated` from `invitations:listPendingForUser` during login
- `GET /api/auth/convex/token` returns `401 Unauthorized` during login transition
- Both errors resolve on their own after the token becomes available

**Current workaround**: try-catch in server-side query handlers returns empty defaults.

**Why this is a problem**:
- Silent data loss: queries return `[]` during the transition window, then correctly populate later. React renders empty state → data, causing UI flicker.
- Error noise: 401s in network tab and console undermine confidence and can trigger alerting.
- Not a fix: the try-catch treats a symptom, not the cause. If `getAuthUser` throws for any other reason (misconfiguration, schema migration), it's silently swallowed.

---

### P2. `expectAuth: true` Without Client-Side Auth Readiness Gate (High)

**Problem**: `ConvexQueryClient` is initialized with `expectAuth: true`, which is designed for SSR where the token is guaranteed before queries run. On client-side navigation after login, this guarantee doesn't hold.

**Why this is a problem**:
- `expectAuth: true` tells Convex "auth will always be available", so the client doesn't gracefully handle the transition period.
- The assumption is only valid during SSR, not during client-side auth state changes.

---

### P3. No Global Auth Error Boundary (High)

**Problem**: If a user's session expires while on an authenticated page, subsequent Convex queries throw `Unauthenticated`. There is no global error boundary to catch this and redirect to login.

**Current protection**: `beforeLoad` in `_authed/route.tsx` only checks auth at navigation time. It does not protect against mid-session expiry.

**Why this is a problem**:
- Users see raw error UI ("Something went wrong!") instead of being redirected to login.
- Requires manual page refresh to recover.

---

### P4. Duplicate `requireAuth` Implementation (Medium)

**Problem**: `convex/people.ts` defines its own local `requireAuth` function instead of importing from `convex/auth_helpers.ts`.

**Why this is a problem**:
- Divergent behavior if one is updated without the other.
- Inconsistent error messages.

---

### P5. Inconsistent Auth Patterns in Server Queries (Medium)

**Problem**: Three different patterns are used for auth in Convex query handlers:

1. **`requireAuth` from `auth_helpers.ts`** — throws on unauthenticated (correct for mutations)
2. **try-catch with graceful fallback** — catches `getAuthUser` errors, returns default (current workaround for P1)
3. **Direct `getAuthUser` call without try-catch** — will throw on unauthenticated (e.g., `people.ts` list query)

**Why this is a problem**:
- Pattern 2 masks real errors.
- Pattern 3 will break during auth transitions.
- No clear convention for which pattern to use where.

---

### P6. `sendInvitationEmail` Is DEV-Only (Medium)

**Problem**: Organization invitation emails are `console.log` only.

```typescript
sendInvitationEmail: async ({ email, url }) => {
  console.log(`[DEV] Send invitation email to ${email}: ${url}`)
}
```

**Why this is a problem**: Users invited to organizations never receive emails in production.

---

### P7. `beforeDeleteOrganization` Hook Has Pagination Limit (Low)

**Problem**: Uses `deleteMany` with `paginationOpts: { numItems: 100 }`. Organizations with >100 team members or >100 teams will have orphan records after deletion.

---

### P8. ORPC API Routes Are Not Authenticated (Low)

**Problem**: `src/routes/api.$.ts` defines bearer auth in its OpenAPI spec but passes `context: {}` — auth is not enforced.

---

### P9. Excessive `as any` Type Casts (Low)

**Problem**: Pervasive `as any` casts in hooks and adapter queries weaken type safety. Documented in AGENTS.md as a known caveat, but should be tracked for improvement as the adapter types mature.

---

### P10. No Session Cleanup or Expiry Management (Low)

**Problem**: No cron jobs or scheduled functions to clean up expired sessions. Over time, the `session` table will grow unbounded.

---

## 3. Proposed Solutions

### S1. Introduce a Client-Side "Convex Auth Ready" Gate (Addresses P1, P2)

**Goal**: Queries must not fire until the Convex auth token is confirmed available.

**Approach A — Auth readiness hook**:

Create a hook that combines Better Auth session state with Convex token availability:

```typescript
// src/hooks/useConvexAuth.ts
export function useConvexAuth() {
  const session = authClient.useSession()
  // ConvexBetterAuthProvider sets the token asynchronously.
  // Expose a signal when the Convex client has a valid token.
  const isConvexReady = /* derived from Convex token state */

  return {
    isAuthenticated: !!session.data?.user && isConvexReady,
    isPending: session.isPending || !isConvexReady,
    user: session.data?.user,
  }
}
```

All hooks that gate Convex queries (`useNotifications`, etc.) should use this instead of `authClient.useSession()` directly.

**Approach B — Provider-level query suspension**:

Wrap `ConvexBetterAuthProvider` in a custom provider that delays rendering children until the Convex token is confirmed. This prevents any child component from subscribing to Convex queries prematurely.

```typescript
// src/integrations/convex/provider.tsx
export default function AppConvexProvider({ children, initialToken }) {
  return (
    <ConvexBetterAuthProvider ...>
      <ConvexAuthGate>{children}</ConvexAuthGate>
    </ConvexBetterAuthProvider>
  )
}

function ConvexAuthGate({ children }) {
  // If no initialToken (client-side nav after login), wait for token
  // If initialToken exists (SSR), render immediately
  // Show loading spinner while waiting
}
```

**Recommendation**: Start with Approach A for explicit control, then consider Approach B as a safety net.

---

### S2. Remove try-catch from Server Queries (Addresses P5)

Once S1 is in place, the server-side try-catch workarounds become unnecessary.

**Before (current workaround)**:
```typescript
let user
try {
  user = await authComponent.getAuthUser(ctx)
} catch {
  return []
}
```

**After (with client-side gate)**:
```typescript
const user = await authComponent.getAuthUser(ctx)
if (!user) return []
```

If `getAuthUser` still throws, it indicates a real problem (misconfiguration, expired session) and should surface as an error, not be silently swallowed.

---

### S3. Add Global Auth Error Boundary (Addresses P3)

Create a boundary at the `_authed` layout level that catches `ConvexError: Unauthenticated` and redirects to login:

```typescript
// In _authed/route.tsx
<ErrorBoundary
  fallback={(error) => {
    if (isAuthError(error)) {
      // Redirect to login
      window.location.href = '/login'
      return <LoadingSpinner />
    }
    throw error // Re-throw non-auth errors
  }}
>
  <RouteComponent />
</ErrorBoundary>
```

Alternatively, use a Convex `onError` callback at the provider level to globally handle auth failures.

---

### S4. Consolidate `requireAuth` (Addresses P4)

Remove the duplicate in `convex/people.ts` and import from `convex/auth_helpers.ts`.

---

### S5. Establish Auth Pattern Conventions (Addresses P5)

Document and enforce:

| Context | Pattern | Example |
|---------|---------|---------|
| Mutations (write operations) | `requireAuth(ctx)` — throws | `createJoinRequest`, `addTodo` |
| Read queries (subscriptions) | `getAuthUser` + null check — returns default | `listPendingForUser`, `getCurrentUser` |
| Public/optional auth queries | `getAuthUser` + null check — returns default | Same as above |

---

### S6. Implement Email Sending for Invitations (Addresses P6)

Replace the `console.log` in `sendInvitationEmail` with a real email provider (Resend, SendGrid, etc.). Consider using a Convex action for async email delivery.

---

### S7. Fix Pagination in `beforeDeleteOrganization` (Addresses P7)

Replace fixed `numItems: 100` with a loop that pages through all records:

```typescript
let cursor = null
do {
  const result = await ctx.runMutation(
    components.betterAuth.adapter.deleteMany,
    { model: 'teamMember', where: [...], paginationOpts: { numItems: 100, cursor } }
  )
  cursor = result.continueCursor
} while (cursor)
```

---

### S8. Add Session Cleanup Cron (Addresses P10)

```typescript
// convex/crons.ts
import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()
crons.monthly('cleanup expired sessions', '0 3 1 * *', internal.auth.cleanupSessions)
export default crons
```

---

## 4. Implementation Priority

| Priority | Item | Effort | Impact |
|----------|------|-------|--------|
| **P0** | S1: Convex auth readiness gate | M | Eliminates race condition, 401s, error noise |
| **P0** | S3: Global auth error boundary | S | Handles mid-session expiry gracefully |
| **P1** | S2: Remove server-side try-catch | S | Restores proper error visibility |
| **P1** | S5: Document auth pattern conventions | S | Developer consistency |
| **P2** | S4: Consolidate `requireAuth` | XS | Code hygiene |
| **P2** | S6: Email sending for invitations | M | Required for production org features |
| **P3** | S7: Fix pagination in delete hook | S | Correctness for large orgs |
| **P3** | S8: Session cleanup cron | S | Long-term hygiene |
| **P3** | S8: Enforce auth on ORPC API | S | Security |

---

## 5. Open Questions for Review

1. **`expectAuth: true`**: Should we keep this and fix the client-side gating, or remove it and handle auth absence gracefully in every query? Keeping it gives better SSR performance (queries wait for auth rather than firing immediately).

2. **`ConvexBetterAuthProvider` internals**: Does `@convex-dev/better-auth` expose any hook or callback for "token ready" state? If so, S1 Approach A becomes trivial. If not, we may need to monitor the token fetch response.

3. **Error boundary granularity**: Should the auth error boundary be at the `_authed` layout level, or at the root level (to also catch errors during the login→app transition)?

4. **Token refresh**: What happens when the Convex token expires mid-session? Does `ConvexBetterAuthProvider` handle refresh automatically, or do we need a refresh mechanism?

5. **SSR vs client auth split**: The current architecture uses SSR `getToken()` for initial auth check and client-side `authClient` for session management. Is there a risk of these getting out of sync (e.g., session invalidated server-side but cookie still present)?
