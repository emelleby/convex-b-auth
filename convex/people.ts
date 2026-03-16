import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { authComponent } from './auth'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'

// Helper to require authentication
async function requireAuth(ctx: GenericCtx<DataModel>) {
  const user = await authComponent.getAuthUser(ctx)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx)
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

