// Re-export from the local component so existing importers (http.ts, auth_helpers.ts, etc.)
// continue to work without changes.
export { authComponent, createAuth, options } from './betterAuth/auth'

import { internalMutation, query } from './_generated/server'
import { authComponent } from './betterAuth/auth'
import { components } from './_generated/api'

// ---------------------------------------------------------------------------
// getCurrentUser
// ---------------------------------------------------------------------------

// Convenience query for fetching the current authenticated user.
// This is called by the _authed/route.tsx loader BEFORE the RouteComponent
// gate runs, so it intentionally uses try-catch to return null gracefully
// during SSR when no token has been set yet. Do NOT remove the try-catch here.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await authComponent.getAuthUser(ctx)
    } catch {
      return null
    }
  },
})

// ---------------------------------------------------------------------------
// cleanupExpiredSessions — called by the monthly cron in convex/crons.ts
// ---------------------------------------------------------------------------

/**
 * Deletes expired sessions from the Better Auth session table in batches.
 *
 * Sessions accumulate unboundedly because Better Auth does not run its own
 * cleanup. This mutation pages through ALL sessions and removes those whose
 * `expiresAt` timestamp is in the past.
 *
 * Design notes:
 *   - Uses findMany pagination to avoid hitting Convex's document-read limits.
 *   - Deletes one session at a time via deleteOne to stay within mutation
 *     write limits per execution. For very large deployments (> ~10 k expired
 *     sessions), consider splitting into a scheduled chain of actions.
 *   - Runs as an internalMutation so it cannot be called from the client.
 */
export const cleanupExpiredSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    let cursor: string | null = null
    let totalDeleted = 0
    let isDone = false

    while (!isDone) {
      const result = (await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: 'session',
          paginationOpts: { numItems: 100, cursor },
        } as any,
      )) as any

      const expiredSessions: any[] = (result.page ?? []).filter(
        (s: any) => typeof s.expiresAt === 'number' && s.expiresAt < now,
      )

      for (const session of expiredSessions) {
        await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
          input: {
            model: 'session',
            where: [{ field: '_id', value: session._id as any }],
          },
        } as any)
        totalDeleted++
      }

      isDone = result.isDone ?? true
      cursor = result.continueCursor ?? null
    }

    console.log(`[cleanupExpiredSessions] Deleted ${totalDeleted} expired sessions.`)
    return { deleted: totalDeleted }
  },
})

