import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { getOptionalAuth, requireAuth } from './auth_helpers'

/**
 * Returns all notifications for the current user (read and unread).
 * Uses the by_userId index, newest first.
 */
export const listForUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalAuth(ctx)
    if (!user || !user._id) return []
    const userId = user._id as string

    return await ctx.db
      .query('notification')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .take(50)
  },
})

/**
 * Marks a single notification as read.
 * Only the owning user may mark their own notifications.
 */
export const markRead = mutation({
  args: {
    notificationId: v.id('notification'),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const notification = await ctx.db.get(args.notificationId)
    if (!notification || notification.userId !== (user._id as string)) {
      throw new Error('Notification not found')
    }
    await ctx.db.patch(args.notificationId, { read: true })
  },
})

/**
 * Marks all unread notifications as read for the current user.
 */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx)
    const userId = user._id as string

    const unread = await ctx.db
      .query('notification')
      .withIndex('by_userId_and_read', (q) =>
        q.eq('userId', userId).eq('read', false)
      )
      .collect()

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })))

    return { markedCount: unread.length }
  },
})
