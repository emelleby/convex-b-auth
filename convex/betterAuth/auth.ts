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
            // Get all teams associated with this organization
            const teamsPaginated = (await actionCtx.runQuery(components.betterAuth.adapter.findMany, {
              model: "team",
              where: [{ field: "organizationId", value: organization.id }],
              paginationOpts: { numItems: 100, cursor: null }
            } as any)) as any;
            const teams = teamsPaginated.page || [];
            
            if (teams && teams.length > 0) {
              // Delete teamMember records for each team to avoid orphans
              for (const team of teams) {
                await actionCtx.runMutation(components.betterAuth.adapter.deleteMany, {
                  input: {
                    model: "teamMember",
                    where: [{ field: "teamId", value: team._id as any }]
                  },
                  paginationOpts: { numItems: 100, cursor: null }
                } as any);
              }
              // Delete the teams
              await actionCtx.runMutation(components.betterAuth.adapter.deleteMany, {
                input: {
                  model: "team",
                  where: [{ field: "organizationId", value: organization.id as any }]
                },
                paginationOpts: { numItems: 100, cursor: null }
              } as any);
            }
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

