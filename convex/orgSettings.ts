import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth } from './auth_helpers'
import { components } from './_generated/api'

/**
 * Get organization settings.
 * Returns defaults when no row exists yet.
 */
export const getSettings = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('orgSettings')
      .withIndex('by_organizationId', (q) =>
        q.eq('organizationId', args.organizationId)
      )
      .first()

    return {
      invitationValidityDays: row?.invitationValidityDays ?? 365,
      joinRequestExpiryDays: row?.joinRequestExpiryDays ?? 30,
    }
  },
})

/**
 * Upsert organization settings.
 * Only admins and owners can modify settings.
 */
export const upsertSettings = mutation({
  args: {
    organizationId: v.string(),
    invitationValidityDays: v.optional(v.number()),
    joinRequestExpiryDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    if (!user._id) {
      throw new Error('User ID is required')
    }
    const userId = user._id as string

    // Verify user is admin/owner
    const membership = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: 'member',
        where: [
          { field: 'userId', value: userId },
          { field: 'organizationId', value: args.organizationId, connector: 'AND' as const },
        ],
      }
    )) as { role: string } | null

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only organization admins can update settings')
    }

    const existing = await ctx.db
      .query('orgSettings')
      .withIndex('by_organizationId', (q) =>
        q.eq('organizationId', args.organizationId)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        invitationValidityDays: args.invitationValidityDays,
        joinRequestExpiryDays: args.joinRequestExpiryDays,
      })
    } else {
      await ctx.db.insert('orgSettings', {
        organizationId: args.organizationId,
        invitationValidityDays: args.invitationValidityDays ?? 365,
        joinRequestExpiryDays: args.joinRequestExpiryDays ?? 30,
      })
    }

    return { success: true }
  },
})

/**
 * Patch the expiresAt of a newly created invitation to match
 * the organization's configured validity period.
 */
export const patchInvitationExpiry = mutation({
  args: {
    invitationId: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    if (!user._id) {
      throw new Error('User ID is required')
    }
    const userId = user._id as string

    // Look up the invitation
    const invitation = (await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: 'invitation',
        where: [{ field: '_id', value: args.invitationId as any }],
      }
    )) as { organizationId?: string; inviterId?: string } | null

    if (!invitation) {
      throw new Error('Invitation not found')
    }

    // Verify caller is the inviter or an admin of the org
    const isInviter = invitation.inviterId === userId
    if (!isInviter) {
      if (!invitation.organizationId) {
        throw new Error('Invitation has no organization')
      }
      const membership = (await ctx.runQuery(
        components.betterAuth.adapter.findOne,
        {
          model: 'member',
          where: [
            { field: 'userId', value: userId },
            { field: 'organizationId', value: invitation.organizationId, connector: 'AND' as const },
          ],
        }
      )) as { role: string } | null

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        throw new Error('Unauthorized')
      }
    }

    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: 'invitation',
        where: [{ field: '_id', value: args.invitationId as any }],
        update: { expiresAt: args.expiresAt },
      },
    } as any)

    return { success: true }
  },
})
