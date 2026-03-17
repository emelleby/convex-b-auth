# Auth Integration Review

This document consolidates findings from a structured comparison of the official Better Auth documentation (TanStack Start integration and Convex integration) against the actual implementation in this repository. It is intended to be self-contained: an agent or developer with no prior context from the review session should be able to read this document and understand what is correct, what needs changing, and why.

---

## 1. Executive Summary

The repository implements authentication using Better Auth as the auth framework, Convex as the backend database and function runtime, and TanStack Start as the SSR framework. The integration spans three distinct layers — a Better Auth browser client, a TanStack Start SSR bridge, and a Convex backend component — that must cooperate to produce consistent auth state across server rendering, client hydration, and backend authorization.

The core integration is structurally sound and follows the recommended patterns for TanStack Start. Route protection, session hydration, and Convex backend authorization all work correctly. The main gaps are: a likely-missing `BETTER_AUTH_SECRET` environment variable that affects cryptographic signing, missing infrastructure for the Better Auth CLI toolchain, and several minor production-readiness items (debug logs, an inconsistent sign-out path, and an unreviewed security default on email verification). None of the issues represent a complete failure of auth, but the `BETTER_AUTH_SECRET` gap is the only one with a direct security implication.

---

## 2. Current Architecture Overview

Authentication is split across three cooperating layers.

**Layer 1 — Better Auth client (`src/lib/auth-client.ts`)**
Creates `authClient` via `createAuthClient({ plugins: [convexClient()] })`. The `convexClient()` plugin is what bridges the Better Auth session lifecycle with the Convex token system. All sign-in, sign-up, sign-out, and client-side session state operations go through this client.

**Layer 2 — TanStack Start SSR bridge**
- `src/lib/auth-server.ts`: exports `handler`, `getToken`, and `fetchAuth*` helpers from `convexBetterAuthReactStart(...)`. `handler` is the HTTP handler mounted at `/api/auth/$`. `getToken` retrieves a Convex-compatible JWT for the current request during SSR.
- `src/routes/api/auth/$.ts`: mounts `handler` for both `GET` and `POST`.
- `src/routes/__root.tsx`: calls `getToken()` in `beforeLoad`, injects the token into the Convex SSR client via `serverHttpClient?.setAuth(token)`, and propagates `{ token, isAuthenticated }` through route context.
- `src/routes/_authed/route.tsx`: pathless layout route that redirects to `/login` when `context.isAuthenticated` is false, and prefetches `api.auth.getCurrentUser` in its loader.
- `src/integrations/convex/provider.tsx`: wraps the app in `ConvexBetterAuthProvider` with `initialToken`, connecting the server-derived token to the browser-side Convex client on hydration.

**Layer 3 — Convex backend (`convex/`)**
- `convex/convex.config.ts`: registers the Better Auth component from the NPM package.
- `convex/auth.config.ts`: configures Better Auth as a Convex auth provider via `getAuthConfigProvider()`.
- `convex/auth.ts`: creates `authComponent` (the Convex component client) and `createAuth(ctx)` (the per-request Better Auth instance using `authComponent.adapter(ctx)`). Also exports `getCurrentUser`, which returns the full database user via `authComponent.getAuthUser(ctx)`.
- `convex/http.ts`: registers Better Auth's HTTP routes on the Convex HTTP router via `authComponent.registerRoutes(http, createAuth)`.
- `convex/todos.ts`: defines a local `requireAuth(ctx)` helper that calls `authComponent.getAuthUser(ctx)` and throws on unauthenticated access. Every protected query and mutation calls it first.

---

## 3. Consolidated Findings

### 🔴 High Priority

**H1. `BETTER_AUTH_SECRET` is not wired into the auth instance.**
The Convex integration docs explicitly require setting `BETTER_AUTH_SECRET` via `npx convex env set` and passing it as `secret: process.env.BETTER_AUTH_SECRET` in the `betterAuth({...})` options. Our `createAuth(ctx)` in `convex/auth.ts` does not read this variable. If the secret is absent or ignored, Better Auth falls back to implementation-defined behavior for signing tokens and hashing, which may not be stable across redeployments. This is the only finding with a direct security implication.

**H2. No redirect-back URL on protected-route redirect.**
`src/routes/_authed/route.tsx` redirects unauthenticated users to `/login` without preserving the originally requested URL. The official TanStack Start docs pass `search: { redirect: location.href }` in the redirect. Without this, users who land on a deep link while unauthenticated are sent to the login page but dropped at the app root after sign-in, losing their original destination.

### 🟡 Medium Priority

**M1. NPM Convex component used instead of the recommended local component.**
`convex/convex.config.ts` imports `@convex-dev/better-auth/convex.config` (NPM). The official docs state: *"this guide uses a local folder setup to unlock the full potential of Better Auth."* The local component enables schema introspection, `npx auth generate` schema regeneration, and custom schema field extensions. The NPM component bundles the schema opaquely, making it impossible to add custom fields to Better Auth tables (e.g., extending the user record) without switching. This is a one-way door: migrating later is disruptive.

**M2. `createAuthOptions` is not extracted; `options` export is missing.**
The docs separate auth configuration into `createAuthOptions(ctx)` and export a static `options = createAuthOptions({} as GenericCtx<DataModel>)` alongside `createAuth`. The static `options` export is the entry point for the `npx auth generate` CLI, which regenerates the Convex schema when plugins or options change. Without it, schema regeneration requires a manual workaround. This is immediately relevant if any new plugin (e.g., `organization`, `twoFactor`, `passkey`) is added.

**M3. Inconsistent sign-out behavior in the demo route.**
`src/components/AuthButton.tsx` correctly calls `authClient.signOut()` followed by `location.reload()`. The full reload is required because `ConvexQueryClient` is created with `expectAuth: true`, meaning auth state only resets properly on a fresh SSR cycle. `src/routes/demo/auth.tsx` calls `authClient.signOut()` without the reload, leaving the Convex client in a stale authenticated state after sign-out on that path.

### 🟢 Low Priority

**L1. `verbose: false` is not set on `createClient`.**
The docs pass `{ verbose: false }` as the second argument to `createClient`. Its absence may produce debug-level log output from the Convex Better Auth component in production.

**L2. `console.log` debug statement in `_authed/route.tsx`.**
`beforeLoad` logs `"redirecting to /sign-in"` on every unauthenticated access to a protected route. This is a development artifact that will appear in production server logs.

**L3. `appName` is absent from `createAuth` options.**
The docs include `appName: "My App"` in the Better Auth options. This value populates auth-related emails and the Better Auth dashboard. Its absence means the app name defaults to a generic value in all auth-generated communication.

**L4. `requireEmailVerification: false` is an unreviewed security default.**
`convex/auth.ts` sets `emailAndPassword: { enabled: true, requireEmailVerification: false }` with a comment noting it is "to get started." Email verification is a standard security control. This configuration is fine for development but should be an explicit production decision, not a leftover default.

**L5. `requireAuth` is defined locally in `convex/todos.ts`.**
As the application grows and more Convex files need auth protection, a locally defined helper will need to be duplicated or imported from a file it doesn't belong to. The pattern is correct; its location will become a maintenance problem.

---

## 4. Recommendation Task List

Tasks are ordered: resolve blockers first, then architectural items, then cleanup.

---

**Task 1 — Wire `BETTER_AUTH_SECRET` into the auth instance**
Priority: **High** | File: `convex/auth.ts`

Verify the secret is set on the Convex deployment:
```
npx convex env list
```
If `BETTER_AUTH_SECRET` is absent, generate and set it:
```
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
```
Then add `secret: process.env.BETTER_AUTH_SECRET` to the options object inside `createAuth(ctx)`.

*Why:* Without an explicit secret, Better Auth's token signing is non-deterministic across deployments.

*Answer:* We will implement this. The secret is already set. Both in envs and in convex auth config.

---

**Task 2 — Add redirect-back URL to the protected-route redirect**
Priority: **High** | File: `src/routes/_authed/route.tsx`

Change the redirect in `beforeLoad` from:
```ts
throw redirect({ to: "/login" });
```
to:
```ts
throw redirect({ to: "/login", search: { redirect: location.href } });
```
Then update `src/routes/login.tsx` to read `Route.useSearch().redirect` after successful sign-in and navigate there instead of hardcoding `/app`.

*Why:* Users who follow a protected deep link lose their destination after authenticating.

*Answer:* We will implement this. We will store the redirect URL in session storage. See decision C below.

---

**Task 3 — Fix sign-out in the demo route**
Priority: **Medium** | File: `src/routes/demo/auth.tsx`

Find the `signOut()` call and add a `location.reload()` in its `onSuccess` callback, matching the pattern in `src/components/AuthButton.tsx`.

*Why:* The Convex client's `expectAuth: true` setting means auth state only resets correctly after a full SSR cycle triggered by a reload.

---

**Task 4 — Extract `createAuthOptions` and add the `options` export**
Priority: **Medium** | File: `convex/auth.ts`

Refactor `createAuth(ctx)` to delegate to a separate `createAuthOptions(ctx)` function, then add:
```ts
export const options = createAuthOptions({} as GenericCtx<DataModel>);
```
Pass this function (not the instance) to any CLI commands via `--config`.

*Why:* Without `options`, the `npx auth generate` CLI cannot introspect the configuration to regenerate the Convex schema when plugins are added.

---

**Task 5 — Add `verbose: false` to `createClient`**
Priority: **Low** | File: `convex/auth.ts`

Change:
```ts
export const authComponent = createClient<DataModel>(components.betterAuth)
```
to:
```ts
export const authComponent = createClient<DataModel>(components.betterAuth, { verbose: false })
```
*Why:* Suppresses debug output that would otherwise appear in production Convex logs.

---

**Task 6 — Remove the `console.log` from `_authed/route.tsx`**
Priority: **Low** | File: `src/routes/_authed/route.tsx`

Remove the `console.log("redirecting to /sign-in")` line from `beforeLoad`.

*Why:* It is a development artifact that will appear in production server logs on every unauthenticated route access.

---

**Task 7 — Add `appName` to the auth options**
Priority: **Low** | File: `convex/auth.ts`

Add `appName: "Sailing Club App"` to the options object inside `createAuth(ctx)`.

*Why:* Populates auth-generated emails and the Better Auth dashboard with the correct product name instead of a generic default.

*Comment:* The app name is "Sailing Club App" for now. We can change it later if we want.

---

**Task 8 — Make a deliberate decision on `requireEmailVerification`**
Priority: **Low** | File: `convex/auth.ts`

Either remove the `requireEmailVerification: false` flag (to enable verification) and implement an email provider, or add a code comment explicitly recording the decision to leave verification disabled and under what conditions it should be revisited.

*Why:* The current value is a placeholder that will be forgotten. It should be an explicit, documented choice.

*Decision:* Is described in Decision B below. Add a code comment explicitly recording the decision to leave verification disabled and under what conditions it should be revisited.

---

**Task 9 — Extract `requireAuth` to a shared module**
Priority: **Low** | File: `convex/todos.ts` → new location `convex/auth-helpers.ts` (or similar)

Move the `requireAuth(ctx)` function out of `todos.ts` and into a shared module. Update `todos.ts` to import it from the new location.

*Why:* The pattern is correct, but its definition in a domain file means every new protected Convex file must either duplicate it or import from an unrelated module.

---

## 5. What Is Already Correct

The following parts of the implementation match or exceed the official documentation. They should not be changed as part of this review.

- **`/api/auth/$.ts` handler structure**: Both `GET` and `POST` delegate to `handler(request)`. This matches the docs exactly.
- **`auth.config.ts`**: `getAuthConfigProvider()` wrapped in `satisfies AuthConfig`. Byte-for-byte identical to the docs.
- **`convex/http.ts`**: `authComponent.registerRoutes(http, createAuth)` is the correct and complete registration pattern.
- **`convex.config.ts`**: `app.use(betterAuth)` is correct for the NPM component installation path.
- **`createAuth(ctx)` factory pattern**: Using a per-request factory (rather than a static instance) is the correct design for Convex, because the database adapter requires an injected `ctx`. The docs confirm this.
- **`authComponent.adapter(ctx)` in the database field**: Correct. This is how the Better Auth instance is connected to the Convex database for the current request.
- **`convexClient()` plugin in `auth-client.ts`**: Required for Convex token synchronization. Present and correct.
- **`convexBetterAuthReactStart` in `auth-server.ts`**: The correct TanStack Start adapter (the docs show the Next.js version; we correctly use the TanStack Start equivalent).
- **`_authed` layout route pattern**: Functionally equivalent to the docs' `_protected` pathless layout pattern. The use of `context.isAuthenticated` (derived at the root) is more efficient than calling a second server function in the layout's `beforeLoad`.
- **`getCurrentUser` using `authComponent.getAuthUser(ctx)`**: This returns the full database user record, which is richer than the docs' minimal `ctx.auth.getUserIdentity()` example. This is a deliberate and correct improvement.
- **`requireAuth(ctx)` pattern in `convex/todos.ts`**: The pattern (get user, throw if null, return user) is correct and consistent. Its location is the only concern (see Task 9), not the implementation.
- **SSR token injection via `serverHttpClient?.setAuth(token)`**: Correct mechanism for making authenticated Convex queries during SSR. Not described in the Convex integration docs (which are Next.js focused), but implemented correctly for TanStack Start.
- **`expectAuth: true` and full-reload sign-out in `AuthButton`**: Intentional and documented. The reload is required given the `expectAuth` setting, and `AuthButton` implements it correctly.
- **`loader` prefetching `api.auth.getCurrentUser` in `_authed`**: Goes beyond what either set of docs describes. Improves perceived performance on protected routes by warming the query cache before the component renders.

---

## 6. Decision Points

These items cannot be resolved by code changes alone. Each requires a human architectural decision before implementation.

---

**Decision A — NPM component vs. local Convex component**

*Question:* Should the `@convex-dev/better-auth` Convex component be migrated from the NPM package to a locally installed component?

*Tradeoffs:*
- **Stay on NPM:** Zero migration cost, simpler setup, works for the current feature set (email/password auth with no custom schema fields). Schema regeneration is not possible; adding plugins that require schema changes (e.g., `organization`, `twoFactor`, `passkey`) will require this migration anyway.
- **Migrate to local:** Unlocks the full Better Auth plugin ecosystem, enables `npx auth generate` schema management, allows custom fields on user/session tables. Requires restructuring the `convex/` directory, regenerating types, and re-wiring imports. The migration is disruptive but well-defined; the docs provide a step-by-step path.

*Recommendation trigger:* Migrate if any of the following is planned — organization/team support, two-factor authentication, passkey/WebAuthn, or custom user profile fields stored in Convex.

*Answer:* Migrate to local component. We are planning to implement most of the features mentioned in the recommendation trigger.

---

**Decision B — Email verification**

*Question:* Should email verification be enabled for new accounts?

*Tradeoffs:*
- **Enable verification (`requireEmailVerification: true`):** Standard security practice; prevents account creation with unowned email addresses. Requires configuring an email provider (e.g., Resend, SendGrid) and implementing a verification flow in the UI.
- **Keep disabled:** No email infrastructure needed; simpler onboarding. Acceptable for internal tools or invite-only applications where email ownership is assumed.

*Action required if enabling:* Configure `emailVerification` options in `createAuth`, add an email provider, and build a `/verify-email` route.

*Answer:* Enable email verification for production. We are planning to implement a secure and user-friendly verification flow, which aligns with standard security practices and our commitment to user account security.

For development we will not have email verification as this is problematic for testing purposes. We can disable it for the development environment. It must be an easy on-off switch for the development environment.

---

**Decision C — Redirect-back URL storage format**

*Question:* Should the post-login redirect destination be stored as a URL search parameter (`?redirect=...`) or in session storage?

*Tradeoffs:*
- **Search parameter (`?redirect=...`):** Stateless, shareable, works across browser tabs. Requires sanitizing the redirect URL to prevent open redirect attacks (must verify the destination is same-origin before redirecting).
- **Session storage:** Not exposed in the URL, no open redirect risk. Does not survive if the user opens the login page in a new tab.

*Note:* Whichever approach is chosen, the open-redirect risk must be addressed. Do not redirect to an arbitrary URL from the `redirect` parameter without verifying it is a relative path or a known same-origin URL.

*Answer:* Use search parameter for redirect-back URL storage. We will sanitize the redirect URL to prevent open redirect attacks.
