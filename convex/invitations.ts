import { query } from './_generated/server'
import { v } from 'convex/values'
import { authComponent } from './auth'
import { components } from './_generated/api'

// We avoid requireAuth throwing for these read-only subscription queries
// when the user is transitioning between states on the client.
export const listPendingForUser = query({
  args: {},
  handler: async (ctx) => {
    let user
    try {
      user = await authComponent.getAuthUser(ctx)
    } catch {
      return []
    }
    if (!user) return []

    // Query the invitation table for pending invitations matching user's email
    const result = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: 'invitation',
        where: [
          { field: 'email', value: user.email },
          { field: 'status', value: 'pending' }
        ],
        paginationOpts: {
          numItems: 1000,
          cursor: null
        }
      }
    )

    const invitations = result.page

    // Enrich with organization names
    const enrichedInvitations = await Promise.all(
      invitations.map(async (inv: any) => {
        const org = await ctx.runQuery(
          components.betterAuth.adapter.findOne,
          {
            model: 'organization',
            where: [{ field: '_id', value: inv.organizationId as any }]
          }
        )

        let inviter = null
        if (inv.inviterId) {
          inviter = await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: 'user',
              where: [{ field: '_id', value: inv.inviterId as any }]
            }
          )
        }

        return {
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          organizationId: inv.organizationId,
          organizationName: org?.name ?? 'Unknown',
          inviterName: inviter?.name ?? inviter?.email ?? 'Unknown user',
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
        }
      })
    )

    return enrichedInvitations
  },
})

export const getPendingCount = query({
  args: {},
  handler: async (ctx) => {
    let user
    try {
      user = await authComponent.getAuthUser(ctx)
    } catch {
      return 0
    }
    if (!user) return 0

    const result = await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: 'invitation',
        where: [
          { field: 'email', value: user.email },
          { field: 'status', value: 'pending' }
        ],
        paginationOpts: {
          numItems: 1000,
          cursor: null
        }
      }
    )

    return result.page.length
  },
})

export const getInvitation = query({
  args: {
    invitationId: v.string(),
  },
  handler: async (ctx, args) => {
    let user
    try {
      user = await authComponent.getAuthUser(ctx)
    } catch {
      return null
    }
    if (!user) return null

    const invitation = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: 'invitation',
        where: [{ field: '_id', value: args.invitationId as any }]
      }
    )

    if (!invitation) return null

    const org = await ctx.runQuery(
      components.betterAuth.adapter.findOne,
      {
        model: 'organization',
        where: [{ field: '_id', value: invitation.organizationId as any }]
      }
    )

    return {
      ...invitation,
      organizationName: org?.name ?? 'Unknown',
    }
  },
})
