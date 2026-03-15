import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const syncUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    betterAuthId: v.string(),
    isSignUp: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('users')
      .withIndex('by_betterAuthId', (q) => q.eq('betterAuthId', args.betterAuthId))
      .unique()

    const now = Date.now()

    if (args.isSignUp || !existing) {
      // On signup or if user doesn't exist yet, create a new record
      if (!existing) {
        await ctx.db.insert('users', {
          email: args.email,
          name: args.name,
          betterAuthId: args.betterAuthId,
          lastLogin: now,
        })
      } else {
        // User already exists (e.g. duplicate signup attempt), just update
        await ctx.db.patch(existing._id, {
          lastLogin: now,
        })
      }
    } else {
      // On login, update the lastLogin timestamp
      await ctx.db.patch(existing._id, {
        lastLogin: now,
      })
    }

    return null
  },
})

