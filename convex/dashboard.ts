import { query } from './_generated/server'
import { v } from 'convex/values'
import { getOptionalAuth } from './auth_helpers'
import { components } from './_generated/api'

/**
 * Returns a map of userId -> team names for all members in an organization.
 * Used by MembersList to display team badges per member.
 */
export const getOrgMembersTeamMemberships = query({
	args: {
		organizationId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getOptionalAuth(ctx)
		if (!user) return {}

		// Get all teams for the org
		const teamsResult = await ctx.runQuery(
			components.betterAuth.adapter.findMany,
			{
				model: 'team',
				where: [{ field: 'organizationId', value: args.organizationId }],
				paginationOpts: { numItems: 100, cursor: null },
			}
		)
		const teams = teamsResult.page as any[]

		// Build a userId -> [{id, name}] map from all team memberships
		const teamMembershipsMap: Record<string, Array<{ id: string; name: string }>> = {}

		await Promise.all(
			teams.map(async (team: any) => {
				const membersResult = await ctx.runQuery(
					components.betterAuth.adapter.findMany,
					{
						model: 'teamMember',
						where: [{ field: 'teamId', value: team._id }],
						paginationOpts: { numItems: 100, cursor: null },
					}
				)
				const teamMembers = membersResult.page as any[]

				for (const tm of teamMembers) {
					if (!teamMembershipsMap[tm.userId]) {
						teamMembershipsMap[tm.userId] = []
					}
					teamMembershipsMap[tm.userId].push({ id: team._id, name: team.name })
				}
			})
		)

		return teamMembershipsMap
	},
})

export const getUserTeamMemberships = query({
	args: {
		organizationId: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getOptionalAuth(ctx)
		if (!user) return []

		const teamsResult = await ctx.runQuery(
			components.betterAuth.adapter.findMany,
			{
				model: 'team',
				where: [{ field: 'organizationId', value: args.organizationId }],
				paginationOpts: { numItems: 100, cursor: null },
			}
		)

		const teams = teamsResult.page

		const memberships = await Promise.all(
			(teams as any[]).map(async (team: any) => {
				const membership = await ctx.runQuery(
					components.betterAuth.adapter.findOne,
					{
						model: 'teamMember',
						where: [
							{ field: 'teamId', value: team._id },
							{ field: 'userId', value: user._id },
						],
					}
				)

				return {
					teamId: team._id,
					teamName: team.name,
					teamCreatedAt: team.createdAt,
					role: membership?.role ?? null,
					isMember: !!membership,
				}
			})
		)

		return memberships
	},
})
