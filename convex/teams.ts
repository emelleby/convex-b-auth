import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { getOptionalAuth, requireAuth } from './auth_helpers'
import { isTeamMember, isTeamLeader } from './teamPermissions'
import { hasOrgRole } from './permissions'
import { components } from './_generated/api'

/**
 * Returns the current user's role in a specific team.
 * Single-row lookup — efficient alternative to fetching the entire member list.
 * Returns null if the user is not a member.
 */
export const getMyTeamRole = query({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    const user = await getOptionalAuth(ctx)
    if (!user?._id) return null
    const m = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'teamMember',
      where: [
        { field: 'userId', value: user._id as string },
        { field: 'teamId', value: args.teamId, connector: 'AND' as const },
      ],
    })) as { role: string | null } | null
    if (!m) return null
    return m.role === 'leader' ? 'leader' : ('member' as 'leader' | 'member')
  },
})

/**
 * Returns the full member list for a team.
 * Returns null (not empty array) for non-members so the UI can distinguish
 * "no members" from "access denied" — no data leaks to non-members.
 */
export const getTeamMembers = query({
  args: { teamId: v.string() },
  handler: async (ctx, args) => {
    const user = await getOptionalAuth(ctx)
    if (!user?._id) return null
    if (!(await isTeamMember(ctx, user._id as string, args.teamId))) return null

    const rows = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
      model: 'teamMember',
      where: [{ field: 'teamId', value: args.teamId }],
      paginationOpts: { numItems: 500, cursor: null },
    })) as { page: Array<{ _id: string; userId: string; role: string | null }> }

    return Promise.all(
      rows.page.map(async (m) => {
        const u = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: 'user',
          where: [{ field: '_id', value: m.userId as any }],
        })) as { name?: string; email?: string } | null
        return {
          memberId: m._id,
          userId: m.userId,
          role: m.role,
          name: u?.name ?? 'Unknown',
          email: u?.email ?? '',
        }
      })
    )
  },
})

/**
 * Batch-fetch membership statuses for multiple teams in one call.
 * Used by TeamsList to avoid N+1 queries when rendering membership badges per row.
 * Returns a record keyed by teamId with values: 'leader' | 'member' | 'pending' | 'none'.
 */
export const getTeamMembershipStatuses = query({
  args: { teamIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const user = await getOptionalAuth(ctx)
    if (!user?._id) return {} as Record<string, 'leader' | 'member' | 'pending' | 'none'>

    const userId = user._id as string
    const result: Record<string, 'leader' | 'member' | 'pending' | 'none'> = {}

    await Promise.all(
      args.teamIds.map(async (teamId) => {
        const membership = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
          model: 'teamMember',
          where: [
            { field: 'userId', value: userId },
            { field: 'teamId', value: teamId, connector: 'AND' as const },
          ],
        })) as { role: string | null } | null

        if (membership) {
          result[teamId] = membership.role === 'leader' ? 'leader' : 'member'
        } else {
          const pending = await ctx.db
            .query('teamJoinRequest')
            .withIndex('by_status_and_teamId', (q) =>
              q.eq('status', 'pending').eq('teamId', teamId)
            )
            .filter((q) => q.eq(q.field('userId'), userId))
            .first()
          result[teamId] = pending ? 'pending' : 'none'
        }
      })
    )

    return result
  },
})

/**
 * Update a team member's role ('leader' or 'member').
 * Requires caller to be an org admin OR a team leader.
 * Enforces the last-leader invariant server-side.
 */
export const updateTeamMemberRole = mutation({
  args: {
    teamId: v.string(),
    userId: v.string(),
    newRole: v.union(v.literal('leader'), v.literal('member')),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const actorId = user._id as string

    // Fetch team to resolve the org ID for org-level permission check
    const team = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'team',
      where: [{ field: '_id', value: args.teamId as any }],
    })) as { organizationId: string } | null
    if (!team) throw new Error('Team not found')

    const actorIsOrgAdmin = await hasOrgRole(ctx, actorId, team.organizationId, ['owner', 'admin'])
    const actorIsTeamLeader = await isTeamLeader(ctx, actorId, args.teamId)
    if (!actorIsOrgAdmin && !actorIsTeamLeader) {
      throw new Error('Only org admins or team leaders can change team roles')
    }

    // Prevent demoting the only remaining leader
    if (args.newRole === 'member') {
      const allMembers = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: 'teamMember',
        where: [{ field: 'teamId', value: args.teamId }],
        paginationOpts: { numItems: 500, cursor: null },
      })) as { page: Array<{ userId: string; role: string | null }> }
      const leaderCount = allMembers.page.filter((m) => m.role === 'leader').length
      // Only block if the target is currently a leader and they're the last one
      const targetIsLeader = allMembers.page.some(
        (m) => m.userId === args.userId && m.role === 'leader'
      )
      if (targetIsLeader && leaderCount <= 1) {
        throw new Error('Cannot demote the only team leader')
      }
    }

    // Find the teamMember record for the target user
    const memberRecord = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: 'teamMember',
      where: [
        { field: 'userId', value: args.userId },
        { field: 'teamId', value: args.teamId, connector: 'AND' as const },
      ],
    })) as { _id: string } | null
    if (!memberRecord) throw new Error('User is not a member of this team')

    // Update the role (null = regular member, 'leader' = leader)
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: 'teamMember',
        where: [{ field: '_id', value: memberRecord._id as any }],
        update: { role: args.newRole === 'member' ? null : 'leader' },
      },
    } as any)

    return { success: true }
  },
})
