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
    // Require authentication to view todos
    await requireAuth(ctx)

    return await ctx.db
      .query('todos')
      .withIndex('by_creation_time')
      .order('desc')
      .collect()
  },
})

export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    // Require authentication to add todos
    await requireAuth(ctx)

    return await ctx.db.insert('todos', {
      text: args.text,
      completed: false,
    })
  },
})

export const toggle = mutation({
  args: { id: v.id('todos') },
  handler: async (ctx, args) => {
    // Require authentication to toggle todos
    await requireAuth(ctx)

    const todo = await ctx.db.get(args.id)
    if (!todo) {
      throw new Error('Todo not found')
    }
    return await ctx.db.patch(args.id, {
      completed: !todo.completed,
    })
  },
})

export const remove = mutation({
  args: { id: v.id('todos') },
  handler: async (ctx, args) => {
    // Require authentication to remove todos
    await requireAuth(ctx)

    return await ctx.db.delete(args.id)
  },
})
