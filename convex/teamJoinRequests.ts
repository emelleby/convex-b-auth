import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth, getOptionalAuth } from './auth_helpers'
import { isTeamLeader, requireTeamLeader } from './teamPermissions'
import { components } from './_generated/api'
import { ConvexError } from 'convex/values'

/**
 * Create a join request for a team.
 * Prevents duplicate pending requests and rejects existing members.
 */
export const createTeamJoinRequest = mutation({
  args: {
    teamId: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const userId = user._id as string

    // Check not already a member via BA adapter
    const existingMember = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'teamMember',
      where: [
        { field: 'userId', value: userId },
        { field: 'teamId', value: args.teamId, connector: 'AND' as const },
      ],
    })) as object | null
    if (existingMember) throw new Error('You are already a member of this team')

    // Check no duplicate pending request
    const duplicate = await ctx.db
      .query('teamJoinRequest')
      .withIndex('by_status_and_teamId', (q) =>
        q.eq('status', 'pending').eq('teamId', args.teamId)
      )
      .filter((q) => q.eq(q.field('userId'), userId))
      .first()
    if (duplicate) throw new Error('You already have a pending request for this team')

    await ctx.db.insert('teamJoinRequest', {
      teamId: args.teamId,
      userId,
      status: 'pending',
      message: args.message,
      createdAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * List all team join requests made by the current user (all statuses), newest first.
 */
export const listMyTeamJoinRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await getOptionalAuth(ctx)
    if (!user?._id) return []
    return ctx.db
      .query('teamJoinRequest')
      .withIndex('by_userId', (q) => q.eq('userId', user._id as string))
      .order('desc')
      .collect()
  },
})

/**
 * List pending join requests for a team.
 * Returns [] for non-leaders (safe for reactive query context — never throws).
 * Enriches each request with the requester's name and email.
 */
export const listPendingTeamJoinRequests = query({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    const user = await getOptionalAuth(ctx)
    if (!user?._id) return []

    if (!(await isTeamLeader(ctx, user._id as string, args.teamId))) return []

    const requests = await ctx.db
      .query('teamJoinRequest')
      .withIndex('by_status_and_teamId', (q) =>
        q.eq('status', 'pending').eq('teamId', args.teamId)
      )
      .collect()

    return Promise.all(
      requests.map(async (req) => {
        const userDoc = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: 'user',
          where: [{ field: '_id', value: req.userId as any }],
        })) as { name?: string; email?: string } | null
        return {
          ...req,
          userName: userDoc?.name ?? 'Unknown',
          userEmail: userDoc?.email ?? '',
        }
      })
    )
  },
})

/**
 * Approve a team join request (team leaders only).
 * Atomically: updates request status + adds user to team via BA adapter + sends notification.
 */
export const approveTeamJoinRequest = mutation({
  args: { requestId: v.id('teamJoinRequest') },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const request = await ctx.db.get(args.requestId)
    if (!request) throw new Error('Request not found')
    if (request.status !== 'pending') throw new Error('Request already processed')

    await requireTeamLeader(ctx, request.teamId)

    await ctx.db.patch(args.requestId, {
      status: 'approved',
      reviewedBy: user._id as string,
      reviewedAt: Date.now(),
    })

    // Add user to the team via BA adapter
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: 'teamMember',
        data: {
          teamId: request.teamId,
          userId: request.userId,
          role: null,
          createdAt: Date.now(),
        },
      },
    })

    // Fetch team name for the notification message
    const team = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'team',
      where: [{ field: '_id', value: request.teamId as any }],
    })) as { name?: string } | null

    await ctx.db.insert('notification', {
      userId: request.userId,
      type: 'team_join_approved',
      message: `Your request to join ${team?.name ?? 'the team'} has been approved`,
      read: false,
      createdAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Reject a team join request (team leaders only).
 * Sends a notification to the requester.
 */
export const rejectTeamJoinRequest = mutation({
  args: { requestId: v.id('teamJoinRequest') },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const request = await ctx.db.get(args.requestId)
    if (!request) throw new Error('Request not found')
    if (request.status !== 'pending') throw new Error('Request already processed')

    await requireTeamLeader(ctx, request.teamId)

    await ctx.db.patch(args.requestId, {
      status: 'rejected',
      reviewedBy: user._id as string,
      reviewedAt: Date.now(),
    })

    const team = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'team',
      where: [{ field: '_id', value: request.teamId as any }],
    })) as { name?: string } | null

    await ctx.db.insert('notification', {
      userId: request.userId,
      type: 'team_join_rejected',
      message: `Your request to join ${team?.name ?? 'the team'} has been rejected`,
      read: false,
      createdAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Cancel own pending team join request (soft-delete preserving audit trail).
 */
export const cancelTeamJoinRequest = mutation({
  args: { requestId: v.id('teamJoinRequest') },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const request = await ctx.db.get(args.requestId)
    if (!request) throw new Error('Request not found')
    if (request.userId !== (user._id as string)) throw new Error('Unauthorized')
    if (request.status !== 'pending') throw new Error('Only pending requests can be cancelled')

    await ctx.db.patch(args.requestId, { status: 'cancelled', reviewedAt: Date.now() })
    return { success: true }
  },
})

/**
 * Leave a team. Enforces server-side last-leader guard so the invariant
 * cannot be bypassed by calling the Better Auth API directly.
 */
export const leaveTeam = mutation({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const userId = user._id as string

    const membership = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'teamMember',
      where: [
        { field: 'userId', value: userId },
        { field: 'teamId', value: args.teamId, connector: 'AND' as const },
      ],
    })) as { _id: string; role: string | null } | null

    if (!membership) throw new ConvexError('You are not a member of this team')

    // Prevent the last leader from leaving without appointing a replacement
    if (membership.role === 'leader') {
      const allMembers = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: 'teamMember',
        where: [{ field: 'teamId', value: args.teamId }],
        paginationOpts: { numItems: 500, cursor: null },
      })) as { page: Array<{ role: string | null }> }
      const leaderCount = allMembers.page.filter((m) => m.role === 'leader').length
      if (leaderCount <= 1) {
        throw new ConvexError(
          'Cannot leave: you are the only team leader. Appoint another leader first.'
        )
      }
    }

    await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
      input: {
        model: 'teamMember',
        where: [{ field: '_id', value: membership._id as any }],
      },
    } as any)

    return { success: true }
  },
})
