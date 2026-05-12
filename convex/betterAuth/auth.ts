import { betterAuth } from 'better-auth/minimal'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { organization } from 'better-auth/plugins'
import authConfig from '../auth.config'
import { components, internal } from '../_generated/api'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from '../_generated/dataModel'
import type { GenericActionCtx } from 'convex/server'
import schema from './schema'
import type { User } from 'better-auth'

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
      /**
       * Server-side gate: only Pro subscribers may create organizations.
       * The user.id here is the Convex _id (mapped by the Better Auth adapter).
       */
      allowUserToCreateOrganization: async (user: User): Promise<boolean> => {
        if (!('runQuery' in ctx)) return true // CLI/test mode: allow
        const actionCtx = ctx as unknown as GenericActionCtx<DataModel>
        return actionCtx.runQuery(
          internal.subscription.canCreateOrganizationInternal,
          { userId: user.id }
        )
      },
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
            await actionCtx.scheduler.runAfter(
              0,
              internal.orgCleanup.cleanupOrgTeams,
              { organizationId: organization.id },
            );
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

