import { betterAuth } from 'better-auth/minimal'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { organization } from 'better-auth/plugins'
import authConfig from '../auth.config'
import { components } from '../_generated/api'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from '../_generated/dataModel'
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

