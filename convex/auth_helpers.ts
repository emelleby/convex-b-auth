import { authComponent } from './auth'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'
import { ConvexError } from 'convex/values'

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
/**
 * Returns true when the error is `ConvexError: Unauthenticated`, which
 * `getAuthUser` throws (not returns null) when the Convex JWT is absent
 * or expired. This is expected behaviour during:
 *   - Tab wake-up after inactivity: the Convex WebSocket reconnects and
 *     the runtime re-runs server-side query subscriptions before
 *     ConvexBetterAuthProvider has completed its JWT refresh.
 *   - Brief token-refresh races on reconnect.
 *
 * Any other error type (schema bug, adapter misconfiguration, network
 * partition) is NOT matched and will propagate to the caller.
 */
function isUnauthenticatedError(err: unknown): boolean {
  if (!(err instanceof ConvexError)) return false
  const data = err.data
  const msg =
    typeof data === 'string'
      ? data
      : ((data as { message?: string } | null)?.message ?? '')
  return msg.toLowerCase().includes('unauthenticated')
}

export async function getOptionalAuth(ctx: GenericCtx<DataModel>) {
  try {
    return await authComponent.getAuthUser(ctx)
  } catch (err) {
    // getAuthUser throws ConvexError: Unauthenticated — it does NOT return
    // null. Catching it here returns null instead so reactive subscriptions
    // degrade gracefully (return [], 0, null) during the JWT refresh window
    // rather than crashing into the error boundary with a spurious redirect.
    //
    // All other errors are re-thrown so real problems remain visible.
    if (isUnauthenticatedError(err)) return null
    throw err
  }
}
