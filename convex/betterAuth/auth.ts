import { betterAuth } from 'better-auth/minimal'
import { APIError } from 'better-auth/api'
import { createClient } from '@convex-dev/better-auth'
import { convex } from '@convex-dev/better-auth/plugins'
import { organization } from 'better-auth/plugins'
import authConfig from '../auth.config'
import { components, internal } from '../_generated/api'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from '../_generated/dataModel'
import type { GenericActionCtx } from 'convex/server'
import schema from './schema'

// ---------------------------------------------------------------------------
// RBAC helpers — used by the beforeUpdateMemberRole / beforeRemoveMember hooks
// ---------------------------------------------------------------------------

/** Returns the role string of a user within an org, or null if not a member. */
async function getActorRole(
  actionCtx: GenericActionCtx<DataModel>,
  userId: string,
  organizationId: string
): Promise<string | null> {
  const m = (await actionCtx.runQuery(components.betterAuth.adapter.findOne, {
    model: 'member',
    where: [
      { field: 'userId', value: userId },
      { field: 'organizationId', value: organizationId, connector: 'AND' as const },
    ],
  })) as { role: string } | null
  return m?.role ?? null
}

/** Returns the number of members with the 'owner' role in an org. */
async function countOwners(
  actionCtx: GenericActionCtx<DataModel>,
  organizationId: string
): Promise<number> {
  const result = (await actionCtx.runQuery(components.betterAuth.adapter.findMany, {
    model: 'member',
    where: [
      { field: 'organizationId', value: organizationId },
      { field: 'role', value: 'owner', connector: 'AND' as const },
    ],
    paginationOpts: { numItems: 100, cursor: null },
  } as any)) as any
  return result.page?.length ?? 0
}

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
      // Organization creation is open to all authenticated users.
      // Features within an org (member limits, advanced tools) are gated
      // on the org's own subscription plan via useSubscription().
      organizationHooks: {
        afterCreateOrganization: async ({ organization }) => {
          if ('runMutation' in ctx) {
            const actionCtx = ctx as unknown as GenericActionCtx<DataModel>;

            // Seed a free subscription for the newly created org so that
            // useSubscription() always returns a defined plan immediately.
            await actionCtx.runMutation(
              internal.subscription.createFreeSubscription,
              { organizationId: organization.id }
            );

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
        /**
         * RBAC invariant: block role changes that would violate ownership rules.
         *
         * Rules enforced:
         *  1. Admins cannot change the role of an owner.
         *  2. The last owner cannot be demoted (prevents org lockout).
         */
        beforeUpdateMemberRole: async ({ member, newRole, user, organization }) => {
          if (!('runQuery' in ctx)) return
          const actionCtx = ctx as unknown as GenericActionCtx<DataModel>

          const actorRole = await getActorRole(actionCtx, user.id, organization.id)

          // Rule 1: admins cannot touch an owner's role
          if (actorRole === 'admin' && member.role === 'owner') {
            throw new APIError('FORBIDDEN', {
              message: "Admins cannot change the role of an owner.",
            })
          }

          // Rule 2: cannot demote the only remaining owner
          if (member.role === 'owner' && newRole !== 'owner') {
            const ownerCount = await countOwners(actionCtx, organization.id)
            if (ownerCount <= 1) {
              throw new APIError('BAD_REQUEST', {
                message: "Cannot demote the only owner. Transfer ownership to another member first.",
              })
            }
          }
        },

        /**
         * RBAC invariant: block removals that would violate ownership rules.
         *
         * Rules enforced:
         *  1. Admins cannot remove an owner.
         *  2. The last owner cannot be removed (prevents org lockout).
         */
        beforeRemoveMember: async ({ member, user, organization }) => {
          if (!('runQuery' in ctx)) return
          const actionCtx = ctx as unknown as GenericActionCtx<DataModel>

          const actorRole = await getActorRole(actionCtx, user.id, organization.id)

          // Rule 1: admins cannot remove an owner
          if (actorRole === 'admin' && member.role === 'owner') {
            throw new APIError('FORBIDDEN', {
              message: "Admins cannot remove an owner.",
            })
          }

          // Rule 2: cannot remove the only remaining owner
          if (member.role === 'owner') {
            const ownerCount = await countOwners(actionCtx, organization.id)
            if (ownerCount <= 1) {
              throw new APIError('BAD_REQUEST', {
                message: "Cannot remove the only owner of an organization.",
              })
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

