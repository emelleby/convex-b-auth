import { internalMutation, internalQuery, query } from './_generated/server'
import { v } from 'convex/values'
import { getOptionalAuth } from './auth_helpers'

const FREE_DEFAULT = { plan: 'free', status: 'active', isPro: false } as const

/**
 * Returns the subscription for a given organization.
 * Defaults to free/active when no record exists.
 * Requires the caller to be authenticated.
 */
export const getOrgSubscription = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const user = await getOptionalAuth(ctx)
    if (!user) return FREE_DEFAULT

    const subscription = await ctx.db
      .query('subscription')
      .withIndex('by_organizationId', (q) =>
        q.eq('organizationId', args.organizationId)
      )
      .first()

    if (!subscription) return FREE_DEFAULT

    return {
      plan: subscription.plan,
      status: subscription.status,
      isPro: subscription.plan === 'pro' && subscription.status === 'active',
      currentPeriodEnd: subscription.currentPeriodEnd,
    }
  },
})

/**
 * Internal query: check if an org has an active Pro subscription.
 * Used by server-side hooks that already know the organizationId.
 */
export const isOrgProInternal = internalQuery({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query('subscription')
      .withIndex('by_organizationId', (q) =>
        q.eq('organizationId', args.organizationId)
      )
      .first()

    if (!subscription) return false
    return subscription.plan === 'pro' && subscription.status === 'active'
  },
})

/**
 * Internal mutation: idempotently seeds a free subscription when a new org
 * is created. Called from the afterCreateOrganization hook in auth.ts.
 */
export const createFreeSubscription = internalMutation({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('subscription')
      .withIndex('by_organizationId', (q) =>
        q.eq('organizationId', args.organizationId)
      )
      .first()

    if (existing) return // idempotent

    const now = Date.now()
    await ctx.db.insert('subscription', {
      organizationId: args.organizationId,
      plan: 'free',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: now + 365 * 24 * 60 * 60 * 1000, // 1 year
    })
  },
})
