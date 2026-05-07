import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth, getOptionalAuth } from './auth_helpers'
import { components } from './_generated/api'

// Generate a unique ID for joinRequest (which stores a custom id field)
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
    if (!user._id) {
      throw new Error('User ID is required')
    }
    const userId = user._id as string

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

    // Check if user is already a member (via betterAuth component)
    const existingMember = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'member',
      where: [
        { field: 'userId', value: userId },
        { field: 'organizationId', value: args.organizationId, connector: 'AND' as const },
      ],
    })

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
    const user = await getOptionalAuth(ctx)
    if (!user || !user._id) return []
    const userId = user._id as string

    const requests = await ctx.db
      .query('joinRequest')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()

    // Enrich with organization names via the Better Auth adapter.
    // Use `_id` (not `id`) and cast to `any` per AGENTS.md conventions.
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const org = await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: 'organization',
          where: [{ field: '_id', value: request.organizationId as any }],
        })

        return {
          ...request,
          organizationName: (org as { name?: string } | null)?.name ?? 'Unknown Organization',
        }
      })
    )

    return enrichedRequests
  },
})

/**
 * List pending join requests for an organization.
 * Only org admins/owners can view this.
 *
 * Auth pattern: not authenticated → return [] (graceful, subscription safety).
 *               authenticated but wrong role → throw (authorization error).
 */
export const listPendingJoinRequests = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOptionalAuth(ctx)
    if (!user || !user._id) return []
    const userId = user._id as string

    // Verify user is admin/owner of this organization (via betterAuth component)
    const membership = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'member',
      where: [
        { field: 'userId', value: userId },
        { field: 'organizationId', value: args.organizationId, connector: 'AND' as const },
      ],
    })) as { role: string } | null

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return []
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
    if (!user._id) {
      throw new Error('User ID is required')
    }
    const userId = user._id as string

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

    // Verify user is admin/owner (via betterAuth component)
    const membership = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'member',
      where: [
        { field: 'userId', value: userId },
        { field: 'organizationId', value: request.organizationId, connector: 'AND' as const },
      ],
    })) as { role: string } | null

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Only organization admins can approve join requests')
    }

    // Update request status
    await ctx.db.patch(request._id, {
      status: 'approved',
      reviewedBy: userId,
      reviewedAt: Date.now(),
    })

    // Add user as member with 'member' role (via betterAuth component)
    await ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: 'member',
        data: {
          organizationId: request.organizationId,
          userId: request.userId,
          role: 'member',
          createdAt: Date.now(),
        },
      },
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
    if (!user._id) {
      throw new Error('User ID is required')
    }
    const userId = user._id as string

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

    // Verify user is admin/owner (via betterAuth component)
    const membership = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'member',
      where: [
        { field: 'userId', value: userId },
        { field: 'organizationId', value: request.organizationId, connector: 'AND' as const },
      ],
    })) as { role: string } | null

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
    if (!user._id) {
      throw new Error('User ID is required')
    }
    const userId = user._id as string

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


export const countPendingJoinRequests = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getOptionalAuth(ctx)
    if (!user || !user._id) return 0
    
    const requests = await ctx.db
      .query('joinRequest')
      .withIndex('by_status_and_organizationId', (q) =>
        q.eq('status', 'pending').eq('organizationId', args.organizationId)
      )
      .collect()
      
    return requests.length
  },
})
