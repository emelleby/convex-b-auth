import { useConvexAuth } from 'convex/react'
import { authClient } from '@/lib/auth-client'

/**
 * Combines Better Auth session state with the Convex client's JWT readiness
 * into a single, authoritative "is the user fully authenticated?" signal.
 *
 * WHY THIS EXISTS — the race condition:
 *   After login, `authClient.useSession()` becomes truthy immediately because
 *   it reads the cookie that was just set. However, `ConvexBetterAuthProvider`
 *   still needs to fetch a Convex JWT from /api/auth/convex/token (~100-200ms).
 *   During that window, any Convex query gated only on `session?.user` will fire
 *   without a token, producing `ConvexError: Unauthenticated` on the server.
 *
 * HOW IT WORKS:
 *   `useConvexAuth()` from `convex/react` reports the Convex client's own
 *   token state. `isAuthenticated` is only true once the JWT has been fetched
 *   and set on the WebSocket connection. Combining both guards eliminates the
 *   race.
 *
 * SSR NOTE:
 *   When `initialToken` is passed to `ConvexBetterAuthProvider` (SSR path),
 *   the Convex client sets auth synchronously, so `isLoading` starts as false
 *   and `isAuthenticated` starts as true — zero overhead on server-rendered pages.
 *
 * PRIMARY PROTECTION: the `_authed/route.tsx` RouteComponent gate (Approach B)
 * blocks the entire authed layout tree until `useConvexAuth().isLoading` is false.
 * This hook is a defense-in-depth layer for any Convex query hooks that are
 * rendered outside that layout, or in future hooks written by other developers.
 *
 * @example
 *   function useMyFeature() {
 *     const { isAuthenticated, user } = useConvexAuthReady()
 *     const data = useQuery(api.feature.list, isAuthenticated ? {} : 'skip')
 *     return data
 *   }
 */
export function useConvexAuthReady() {
  // Convex client's view of auth: isLoading=true while fetching the JWT.
  const { isLoading: isConvexLoading, isAuthenticated: isConvexAuthenticated } =
    useConvexAuth()

  // Better Auth's view of auth: reads from the session cookie, near-instant.
  const { data: session, isPending: isSessionPending } = authClient.useSession()

  return {
    /**
     * True only when BOTH the Better Auth session AND the Convex JWT are confirmed.
     * Use this to gate `useQuery` calls: `isAuthenticated ? args : 'skip'`
     */
    isAuthenticated: isConvexAuthenticated && !!session?.user,

    /**
     * True while either auth system is still resolving.
     * Use this to show loading skeletons on first render.
     */
    isPending: isSessionPending || isConvexLoading,

    /** The Better Auth user object, or undefined while loading / unauthenticated. */
    user: session?.user,
  }
}
