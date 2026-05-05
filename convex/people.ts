import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth, getOptionalAuth } from './auth_helpers'

// Local requireAuth removed — use the canonical version from auth_helpers.ts
// to ensure consistent error messages and a single point of maintenance (P4).

export const list = query({
  args: {},
  handler: async (ctx) => {
    // READ QUERY — getOptionalAuth returns null instead of throwing, which is
    // safe for reactive subscriptions. See auth_helpers.ts for the convention.
    const user = await getOptionalAuth(ctx)
    if (!user) return []
    return await ctx.db
      .query('people')
      .withIndex('by_creation_time')
      .order('asc')
      .collect()
  },
})

export const add = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx)
    return await ctx.db.insert('people', { name: args.name })
  },
})

export const update = mutation({
  args: { id: v.id('people'), name: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx)
    const person = await ctx.db.get(args.id)
    if (!person) {
      throw new Error('Person not found')
    }
    return await ctx.db.patch(args.id, { name: args.name })
  },
})

export const remove = mutation({
  args: { id: v.id('people') },
  handler: async (ctx, args) => {
    await requireAuth(ctx)
    return await ctx.db.delete(args.id)
  },
})

