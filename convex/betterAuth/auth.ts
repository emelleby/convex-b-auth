import { betterAuth } from 'better-auth/minimal'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { organization } from 'better-auth/plugins'
import authConfig from '../auth.config'
import { components } from '../_generated/api'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from '../_generated/dataModel'
import type { GenericActionCtx } from 'convex/server'
import schema from './schema'

// Use the local schema so the component adapter validators include
// organization plugin tables (member, organization, invitation, team, teamMember).
export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  {
    local: { schema },
    verbose: false,
  }
)

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => ({
  baseURL: process.env.SITE_URL!,
  database: authComponent.adapter(ctx),
  secret: process.env.BETTER_AUTH_SECRET!,
  appName: 'Sailing Club App',
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    convex({ authConfig }),
    organization({
      teams: {
        enabled: true,
        maximumTeams: 10,
      },
      membershipLimit: 100,
      organizationHooks: {
        afterCreateOrganization: async ({ organization }) => {
          if ('runMutation' in ctx) {
            const actionCtx = ctx as unknown as GenericActionCtx<DataModel>;
            // Get all teams for this org to find the auto-created default one
            const teamsPaginated = (await actionCtx.runQuery(components.betterAuth.adapter.findMany, {
              model: "team", 
              where: [{ field: "organizationId", value: organization.id }],
              paginationOpts: { numItems: 100, cursor: null }
            } as any)) as any;
            const teams = teamsPaginated.page || [];
            const defaultTeam = teams.find((t: any) => t.name === organization.name);
            if (defaultTeam) {
              await actionCtx.runMutation(components.betterAuth.adapter.updateOne, {
                input: {
                  model: "team",
                  where: [{ field: "_id", value: defaultTeam._id as any }],
                  update: { name: `${organization.name}-org` }
                }
              } as any);
            }
          }
        },
        beforeDeleteOrganization: async ({ organization }) => {
          if ('runMutation' in ctx) {
            const actionCtx = ctx as unknown as GenericActionCtx<DataModel>;

            // Collect ALL teams for this org using a paginated loop.
            // Note: this app limits orgs to maximumTeams:10, so a single page
            // is always sufficient in practice. The loop guards against that
            // limit being raised without updating this code.
            const allTeams: any[] = [];
            let teamCursor: string | null = null;
            do {
              const teamPage = (await actionCtx.runQuery(
                components.betterAuth.adapter.findMany,
                {
                  model: 'team',
                  where: [{ field: 'organizationId', value: organization.id }],
                  paginationOpts: { numItems: 100, cursor: teamCursor },
                } as any,
              )) as any;
              allTeams.push(...(teamPage.page ?? []));
              teamCursor = teamPage.continueCursor ?? null;
            } while (teamCursor);

            // For each team, delete ALL teamMember records using a paginated
            // loop. A team could exceed 100 members, so a single deleteMany
            // call is insufficient.
            for (const team of allTeams) {
              let memberCursor: string | null = null;
              do {
                const result = (await actionCtx.runMutation(
                  components.betterAuth.adapter.deleteMany,
                  {
                    input: {
                      model: 'teamMember',
                      where: [{ field: 'teamId', value: team._id as any }],
                    },
                    paginationOpts: { numItems: 100, cursor: memberCursor },
                  } as any,
                )) as any;
                memberCursor = result.continueCursor ?? null;
              } while (memberCursor);
            }

            // Delete ALL teams for this org using a paginated loop.
            let deleteCursor: string | null = null;
            do {
              const result = (await actionCtx.runMutation(
                components.betterAuth.adapter.deleteMany,
                {
                  input: {
                    model: 'team',
                    where: [{ field: 'organizationId', value: organization.id as any }],
                  },
                  paginationOpts: { numItems: 100, cursor: deleteCursor },
                } as any,
              )) as any;
              deleteCursor = result.continueCursor ?? null;
            } while (deleteCursor);
          }
        },
      },
      sendInvitationEmail: async (data) => {
        console.log(
          `[DEV] Invitation created: ${data.email} invited to ${data.organization.name}`
        )
      },
    }),
  ],
})

// For `@better-auth/cli generate`
export const options = createAuthOptions({} as GenericCtx<DataModel>)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx))
}

