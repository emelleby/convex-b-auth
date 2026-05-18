import { ConvexError } from 'convex/values'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireAuth } from './auth_helpers'
import { components } from './_generated/api'

/**
 * Internal helper: fetch the caller's teamMember record.
 * Uses the BA adapter since teamMember is BA-managed, not in the main schema.
 */
async function fetchTeamMembership(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  teamId: string
): Promise<{ _id: string; role: string | null } | null> {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: 'teamMember',
    where: [
      { field: 'userId', value: userId },
      { field: 'teamId', value: teamId, connector: 'AND' as const },
    ],
  })) as { _id: string; role: string | null } | null
}

/**
 * FOR READ QUERIES — returns true if the user is any kind of team member.
 * Does NOT throw; callers handle false by returning null/empty.
 */
export async function isTeamMember(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  teamId: string
): Promise<boolean> {
  return !!(await fetchTeamMembership(ctx, userId, teamId))
}

/**
 * FOR READ QUERIES — returns true if the user has the 'leader' role in the team.
 * Does NOT throw.
 */
export async function isTeamLeader(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  teamId: string
): Promise<boolean> {
  const m = await fetchTeamMembership(ctx, userId, teamId)
  return m?.role === 'leader'
}

/**
 * FOR MUTATIONS — throws ConvexError if the authenticated user is not a team leader.
 */
export async function requireTeamLeader(
  ctx: MutationCtx,
  teamId: string
): Promise<void> {
  const user = await requireAuth(ctx)
  if (!(await isTeamLeader(ctx, user._id as string, teamId))) {
    throw new ConvexError('Only team leaders can perform this action')
  }
}

/**
 * FOR MUTATIONS — throws ConvexError if the authenticated user is not a team member.
 */
export async function requireTeamMember(
  ctx: MutationCtx,
  teamId: string
): Promise<void> {
  const user = await requireAuth(ctx)
  if (!(await isTeamMember(ctx, user._id as string, teamId))) {
    throw new ConvexError('You are not a member of this team')
  }
}
