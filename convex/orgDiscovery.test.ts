/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { expect, test, describe, beforeEach } from 'vitest'
import { api, components } from './_generated/api'
import schema from './betterAuth/schema' // Use the betterAuth schema for these tables

const modules = import.meta.glob('./**/*.ts')

describe('orgDiscovery', () => {
  test('searchPublicOrganizations filters correctly', async () => {
    const t = convexTest(schema, modules)
    
    // 1. Create some organizations
    const org1 = await t.mutation((components as any).betterAuth.adapter.create as any, {
      input: {
        model: 'organization',
        data: {
          name: 'Public Org',
          slug: 'public-org',
          createdAt: Date.now(),
          metadata: JSON.stringify({ allowJoinRequests: true }),
        },
      },
    } as any)
    const org1Id = (org1 as any)._id

    const org2 = await t.mutation((components as any).betterAuth.adapter.create as any, {
      input: {
        model: 'organization',
        data: {
          name: 'Private Org',
          slug: 'private-org',
          createdAt: Date.now(),
          metadata: JSON.stringify({ allowJoinRequests: false }),
        },
      },
    } as any)
    const org2Id = (org2 as any)._id

    // 2. Set up a user
    const userId = 'user-1'
    const userEmail = 'test@example.com'
    await t.mutation((components as any).betterAuth.adapter.create as any, {
      input: {
        model: 'user',
        data: {
          name: 'Test User',
          email: userEmail,
          emailVerified: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    } as any)
    t.withIdentity({ subject: userId, tokenIdentifier: userId, email: userEmail })

    // 3. Search - should only see Public Org
    const results = await t.query(api.orgDiscovery.searchPublicOrganizations, {})
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Public Org')

    // 4. Join org1 - should no longer see it in search
    await t.mutation((components as any).betterAuth.adapter.create as any, {
      input: {
        model: 'member',
        data: {
          organizationId: org1Id,
          userId: userId,
          role: 'member',
          createdAt: Date.now(),
        },
      },
    } as any)

    const resultsAfterJoin = await t.query(api.orgDiscovery.searchPublicOrganizations, {})
    expect(resultsAfterJoin).toHaveLength(0)
  })

  test('getPublicOrganizationProfile returns correct info', async () => {
    const t = convexTest(schema, modules)
    
    const org = await t.mutation((components as any).betterAuth.adapter.create as any, {
      input: {
        model: 'organization',
        data: {
          name: 'Test Org',
          slug: 'test-org',
          createdAt: Date.now(),
        },
      },
    } as any)
    const orgId = (org as any)._id

    // Add some members
    await t.mutation((components as any).betterAuth.adapter.create as any, {
      input: {
        model: 'member',
        data: { organizationId: orgId, userId: 'u1', role: 'member', createdAt: Date.now() },
      },
    } as any)
    await t.mutation((components as any).betterAuth.adapter.create as any, {
      input: {
        model: 'member',
        data: { organizationId: orgId, userId: 'u2', role: 'member', createdAt: Date.now() },
      },
    } as any)

    // Add user u3
    const u3Id = 'u3'
    const u3Email = 'u3@example.com'
    await t.mutation((components as any).betterAuth.adapter.create as any, {
      input: {
        model: 'user',
        data: {
          name: 'User 3',
          email: u3Email,
          emailVerified: true,
          createdAt: Date.now(),
        },
      },
    } as any)

    t.withIdentity({ subject: u3Id, tokenIdentifier: u3Id, email: u3Email })

    const profile = await t.query(api.orgDiscovery.getPublicOrganizationProfile, {
      organizationId: orgId,
    })

    expect(profile.name).toBe('Test Org')
    expect(profile.memberCount).toBe(2)
  })
})

