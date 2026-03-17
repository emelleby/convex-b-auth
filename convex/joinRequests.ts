import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth } from './auth_helpers'

// Generate a unique ID (Better-Auth style)
function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Create a join request for an organization.
 * Users can only have one pending request per organization.
 */
export const createJoinRequest = mutation({
  args: {
    organizationId: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    if (!user.userId) {
      throw new Error('User ID is required')
    }
    const userId = user.userId as string

    // Check if user already has a pending request for this org
    const existingRequest = await ctx.db
      .query('joinRequest')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .filter((q) =>
        q.and(
          q.eq(q.field('organizationId'), args.organizationId),
          q.eq(q.field('status'), 'pending')
        )
      )
      .first()

    if (existingRequest) {
      throw new Error('You already have a pending request for this organization')
    }

    // Check if user is already a member
    const existingMember = await ctx.db
      .query('member')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('organizationId'), args.organizationId))
      .first()

    if (existingMember) {
      throw new Error('You are already a member of this organization')
    }

    // Create the join request
    const id = generateId()
    await ctx.db.insert('joinRequest', {
      id,
      userId,
      organizationId: args.organizationId,
      message: args.message,
      status: 'pending',
      createdAt: Date.now(),
    })

    return { id }
  },
})

/**
 * List all join requests made by the current user.
 */
export const listMyJoinRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx)
    if (!user.userId) {
      throw new Error('User ID is required')
    }
    const userId = user.userId as string

    const requests = await ctx.db
      .query('joinRequest')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()

    // Enrich with organization names
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const org = await ctx.db
          .query('organization')
          .filter((q) => q.eq(q.field('id'), request.organizationId))
          .first()

        return {
          ...request,
          organizationName: org?.name ?? 'Unknown Organization',
        }
      })
    )

    return enrichedRequests
  },
})

/**
 * List pending join requests for an organization.
 * Only org admins/owners can view this.
 */
export const listPendingJoinRequests = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    if (!user.userId) {
      throw new Error('User ID is required')
    }
    const userId = user.userId as string

    // Verify user is admin/owner of this organization
    const membership = await ctx.db
      .query('member')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('organizationId'), args.organizationId))
      .first()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only organization admins can view join requests')
    }

    const requests = await ctx.db
      .query('joinRequest')
      .withIndex('by_status_and_organizationId', (q) =>
        q.eq('status', 'pending').eq('organizationId', args.organizationId)
      )
      .order('desc')
      .collect()

    return requests
  },
})

/**
 * Approve a join request and add user as member.
 * Only org admins/owners can approve.
 */
export const approveJoinRequest = mutation({
  args: {
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    if (!user.userId) {
      throw new Error('User ID is required')
    }
    const userId = user.userId as string

    // Find the request
    const request = await ctx.db
      .query('joinRequest')
      .filter((q) => q.eq(q.field('id'), args.requestId))
      .first()

    if (!request) {
      throw new Error('Join request not found')
    }

    if (request.status !== 'pending') {
      throw new Error('Request has already been processed')
    }

    // Verify user is admin/owner
    const membership = await ctx.db
      .query('member')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('organizationId'), request.organizationId))
      .first()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only organization admins can approve join requests')
    }

    // Update request status
    await ctx.db.patch(request._id, {
      status: 'approved',
      reviewedBy: userId,
      reviewedAt: Date.now(),
    })

    // Add user as member with 'member' role
    const memberId = generateId()
    await ctx.db.insert('member', {
      id: memberId,
      organizationId: request.organizationId,
      userId: request.userId,
      role: 'member',
      createdAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Reject a join request.
 * Only org admins/owners can reject.
 */
export const rejectJoinRequest = mutation({
  args: {
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    if (!user.userId) {
      throw new Error('User ID is required')
    }
    const userId = user.userId as string

    const request = await ctx.db
      .query('joinRequest')
      .filter((q) => q.eq(q.field('id'), args.requestId))
      .first()

    if (!request) {
      throw new Error('Join request not found')
    }

    if (request.status !== 'pending') {
      throw new Error('Request has already been processed')
    }

    // Verify user is admin/owner
    const membership = await ctx.db
      .query('member')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('organizationId'), request.organizationId))
      .first()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only organization admins can reject join requests')
    }

    await ctx.db.patch(request._id, {
      status: 'rejected',
      reviewedBy: userId,
      reviewedAt: Date.now(),
    })

    return { success: true }
  },
})

/**
 * Cancel own pending join request.
 */
export const cancelJoinRequest = mutation({
  args: {
    requestId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    if (!user.userId) {
      throw new Error('User ID is required')
    }
    const userId = user.userId as string

    const request = await ctx.db
      .query('joinRequest')
      .filter((q) => q.eq(q.field('id'), args.requestId))
      .first()

    if (!request) {
      throw new Error('Join request not found')
    }

    if (request.userId !== userId) {
      throw new Error('You can only cancel your own requests')
    }

    if (request.status !== 'pending') {
      throw new Error('Only pending requests can be cancelled')
    }

    await ctx.db.delete(request._id)

    return { success: true }
  },
})

