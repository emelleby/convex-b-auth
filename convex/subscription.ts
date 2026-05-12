import { internalQuery, query } from './_generated/server'
import { v } from 'convex/values'
import { getOptionalAuth } from './auth_helpers'

/**
 * Returns the current user's subscription plan and status.
 * Defaults to { plan: 'free', status: 'active', isPro: false } when no record exists.
 * Uses getOptionalAuth so reactive subscriptions degrade gracefully.
 */
export const getUserSubscription = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalAuth(ctx)
    if (!user || !user._id) {
      return { plan: 'free', status: 'active', isPro: false }
    }
    const userId = user._id as string

    const subscription = await ctx.db
      .query('subscription')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()

    if (!subscription) {
      return { plan: 'free', status: 'active', isPro: false }
    }

    return {
      plan: subscription.plan,
      status: subscription.status,
      isPro: subscription.plan === 'pro' && subscription.status === 'active',
      currentPeriodEnd: subscription.currentPeriodEnd,
    }
  },
})

/**
 * Returns true only when the current user has an active Pro subscription.
 */
export const canCreateOrganization = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalAuth(ctx)
    if (!user || !user._id) return false
    const userId = user._id as string

    const subscription = await ctx.db
      .query('subscription')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first()

    if (!subscription) return false
    return subscription.plan === 'pro' && subscription.status === 'active'
  },
})

/**
 * Internal query used by the allowUserToCreateOrganization auth hook.
 * Accepts a userId string directly (Better Auth passes user.id from its session).
 */
export const canCreateOrganizationInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query('subscription')
      .withIndex('by_userId', (q) => q.eq('userId', args.userId))
      .first()

    if (!subscription) return false
    return subscription.plan === 'pro' && subscription.status === 'active'
  },
})
