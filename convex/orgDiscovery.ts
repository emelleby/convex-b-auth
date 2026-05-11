 import { query } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth } from './auth_helpers'
import { components } from './_generated/api'

interface OrganizationDoc {
  _id: string
  name: string
  slug: string
  logo?: string
  metadata?: string
  createdAt: number
}

interface MemberDoc {
  organizationId: string
  userId: string
  role: string
}

export const searchPublicOrganizations = query({
  args: {
    query: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx)
    const limit = args.limit ?? 20

    let orgs: OrganizationDoc[]

    if (args.query && args.query.trim()) {
      // Use the component's search function
      orgs = await ctx.runQuery((components.betterAuth.adapter as any).search, {
        model: 'organization',
        query: args.query,
        limit: limit * 2,
      } as any)
    } else {
      // Use the component's findMany for default list
      const result = (await ctx.runQuery(components.betterAuth.adapter.findMany, {
        model: 'organization',
        paginationOpts: { numItems: limit * 2, cursor: null },
      } as any)) as { page: OrganizationDoc[] }
      orgs = result.page ?? []
    }

    // Exclude orgs the user is already a member of
    const userMembershipsResult = (await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: 'member',
        where: [{ field: 'userId', value: user._id as any }],
        paginationOpts: { numItems: 100, cursor: null },
      } as any
    )) as { page: MemberDoc[] }
    const memberOrgIds = new Set(
      (userMembershipsResult.page ?? []).map((m) => m.organizationId)
    )

    // Filter and transform
    return orgs
      .filter((org) => {
        // 1. Exclude if already a member
        // Better Auth IDs can be strings or Convex IDs. 
        // Component returns Convex documents with _id.
        if (memberOrgIds.has(org._id)) return false

        // 2. Privacy filter: check metadata.allowJoinRequests
        if (org.metadata) {
          try {
            const metadata = JSON.parse(org.metadata)
            if (metadata.allowJoinRequests === false) {
              return false
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        return true
      })
      .slice(0, limit)
      .map((org) => ({
        id: org._id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        createdAt: org.createdAt,
      }))
  },
})

/**
 * Get public profile details for an organization.
 */
export const getPublicOrganizationProfile = query({
  args: {
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx)

    const org = (await ctx.runQuery((components.betterAuth.adapter as any).getById, {
      model: 'organization',
      id: args.organizationId,
    } as any)) as OrganizationDoc | null

    if (!org) {
      throw new Error('Organization not found')
    }

    // Privacy check
    if (org.metadata) {
      try {
        const metadata = JSON.parse(org.metadata)
        if (metadata.allowJoinRequests === false) {
          // Check if user is a member anyway (admins/members should see it)
          const user = await requireAuth(ctx)
          const membership = (await ctx.runQuery(
            components.betterAuth.adapter.findOne,
            {
              model: 'member',
              where: [
                { field: 'organizationId', value: org._id as any },
                { field: 'userId', value: user._id as any },
              ],
            } as any
          )) as MemberDoc | null
          
          if (!membership) {
            throw new Error('This organization profile is private')
          }
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Get member count
    const membersPaginated = (await ctx.runQuery(
      components.betterAuth.adapter.findMany,
      {
        model: 'member',
        where: [{ field: 'organizationId', value: org._id as any }],
        paginationOpts: { numItems: 1000, cursor: null },
      } as any
    )) as { page: MemberDoc[] }

    return {
      id: org._id,
      name: org.name,
      slug: org.slug,
      logo: org.logo,
      memberCount: membersPaginated.page?.length ?? 0,
      createdAt: org.createdAt,
    }
  },
})
