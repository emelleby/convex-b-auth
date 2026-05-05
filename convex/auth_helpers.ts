import { authComponent } from './auth'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'

/**
 * FOR MUTATIONS — write operations where unauthenticated access is exceptional.
 *
 * Throws 'Authentication required' if no session token is present.
 * Use this in every mutation handler as the first line.
 *
 * @example
 *   const user = await requireAuth(ctx)
 */
export async function requireAuth(ctx: GenericCtx<DataModel>) {
  const user = await authComponent.getAuthUser(ctx)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * FOR READ QUERIES / SUBSCRIPTIONS — reactive queries that run continuously.
 *
 * Returns null when no session token is present rather than throwing.
 * This is the correct pattern for Convex subscriptions because:
 *   1. Queries re-run whenever their inputs change (including auth state).
 *   2. During the post-login token-fetch window, Convex may execute a query
 *      before the JWT has been confirmed, even with the _authed route gate.
 *   3. The _authed/route.tsx gate (useConvexAuth) covers the common case;
 *      this helper is the server-side safety net.
 *
 * Callers MUST handle the null case explicitly:
 *
 * @example
 *   const user = await getOptionalAuth(ctx)
 *   if (!user) return []   // or return null / return 0
 */
export async function getOptionalAuth(ctx: GenericCtx<DataModel>) {
  // Does NOT throw — returns null when unauthenticated.
  // Let real infrastructure errors (network, misconfiguration) propagate
  // naturally instead of being swallowed by a try-catch.
  return authComponent.getAuthUser(ctx)
}
