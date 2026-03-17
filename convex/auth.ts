import { betterAuth } from 'better-auth/minimal'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import authConfig from './auth.config'
import { components } from './_generated/api'
import { query } from './_generated/server'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'

const siteUrl = process.env.SITE_URL!

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth, { verbose: false })

const createAuthOptions = (ctx: GenericCtx<DataModel>) => ({
  baseURL: siteUrl,
  database: authComponent.adapter(ctx),
  secret: process.env.BETTER_AUTH_SECRET!,
  appName: "Sailing Club App",
  // TODO: Email verification configuration - DELIBERATE DECISION
  // For DEVELOPMENT: Disabled to simplify testing and onboarding
  // For PRODUCTION: MUST be enabled with a configured email provider (Resend/SendGrid/etc.)
  // Conditions for revisiting:
  // - When implementing production deployment
  // - When adding email provider integration
  // - When security requirements become more strict
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    // The Convex plugin is required for Convex compatibility
    convex({ authConfig }),
  ],
})

export const options = createAuthOptions({} as GenericCtx<DataModel>)

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx))
}

// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await authComponent.getAuthUser(ctx)
  },
})

