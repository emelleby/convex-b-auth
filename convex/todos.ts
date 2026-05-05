import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth, getOptionalAuth } from './auth_helpers'

export const list = query({
  args: {},
  handler: async (ctx) => {
    // READ QUERY — use getOptionalAuth (returns null) not requireAuth (throws).
    // Throwing from a Convex subscription propagates to the React error boundary
    // during auth transitions, which is worse UX than returning an empty list.
    // The _authed/route.tsx gate ensures this only returns [] in edge cases
    // (SSR pre-render, token refresh gaps), not during normal authed use.
    const user = await getOptionalAuth(ctx)
    if (!user) return []

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
