import { internalAction } from './_generated/server'
import { v } from 'convex/values'
import { components } from './_generated/api'

export const cleanupOrgTeams = internalAction({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const { organizationId } = args
    const allTeamIds: string[] = []

    let teamCursor: string | null = null
    let teamIsDone = false
    while (!teamIsDone) {
      const teamPage = (await ctx.runQuery(
        components.betterAuth.adapter.findMany,
        {
          model: 'team',
          where: [{ field: 'organizationId', value: organizationId }],
          paginationOpts: { numItems: 100, cursor: teamCursor },
        } as any,
      )) as any
      for (const team of teamPage.page ?? []) {
        allTeamIds.push(team._id)
      }
      teamIsDone = teamPage.isDone ?? true
      teamCursor = teamPage.continueCursor ?? null
    }

    for (const teamId of allTeamIds) {
      let memberCursor: string | null = null
      let memberIsDone = false
      while (!memberIsDone) {
        const result = (await ctx.runMutation(
          components.betterAuth.adapter.deleteMany,
          {
            input: {
              model: 'teamMember',
              where: [{ field: 'teamId', value: teamId }],
            },
            paginationOpts: { numItems: 100, cursor: memberCursor },
          } as any,
        )) as any
        memberIsDone = result.isDone ?? true
        memberCursor = result.continueCursor ?? null
      }
    }

    let deleteCursor: string | null = null
    let deleteIsDone = false
    while (!deleteIsDone) {
      const result = (await ctx.runMutation(
        components.betterAuth.adapter.deleteMany,
        {
          input: {
            model: 'team',
            where: [{ field: 'organizationId', value: organizationId }],
          },
          paginationOpts: { numItems: 100, cursor: deleteCursor },
        } as any,
      )) as any
      deleteIsDone = result.isDone ?? true
      deleteCursor = result.continueCursor ?? null
    }

    console.log(
      `[cleanupOrgTeams] Deleted ${allTeamIds.length} teams (and their members) for org ${organizationId}`,
    )
  },
})
