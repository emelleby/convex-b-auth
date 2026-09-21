/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { expect, test, describe } from 'vitest'
import { api, components } from './_generated/api'
import schema from './schema'
import componentSchema from './betterAuth/schema'

const modules = import.meta.glob('./**/*.ts')
const componentModules = import.meta.glob('./betterAuth/**/*.ts')

// organization/member/user live in the betterAuth component, not the app
// schema, so the component must be registered before any adapter call —
// otherwise convex-test throws 'Component "betterAuth" is not registered'.
function setup() {
  const t = convexTest(schema, modules)
  t.registerComponent('betterAuth', componentSchema, componentModules)
  return t
}

const create = (t: any, model: string, data: Record<string, unknown>) =>
  t.mutation((components as any).betterAuth.adapter.create as any, {
    input: { model, data },
  } as any)

/**
 * Creates a user + live session and returns a test client acting as them.
 *
 * Better Auth's getAuthUser resolves the caller in two steps: it finds the
 * session by `_id === identity.sessionId` (rejecting expired ones), then the
 * user by `_id === identity.subject`. An identity missing either id fails
 * before any handler code runs, so both records must exist.
 */
async function signIn(t: any, name: string, email: string) {
  const now = Date.now()
  const user = await create(t, 'user', {
    name,
    email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  })
  const userId = (user as any)._id

  const session = await create(t, 'session', {
    userId,
    token: `token-${userId}`,
    expiresAt: now + 60 * 60 * 1000,
    createdAt: now,
    updatedAt: now,
  })

  return {
    userId,
    asUser: t.withIdentity({
      subject: userId,
      sessionId: (session as any)._id,
      email,
    }),
  }
}

describe('orgDiscovery', () => {
  test('searchPublicOrganizations filters correctly', async () => {
    const t = setup()

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

    await t.mutation((components as any).betterAuth.adapter.create as any, {
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

    // 2. Set up a user
    const { userId, asUser } = await signIn(t, 'Test User', 'test@example.com')

    // 3. Search - should only see Public Org
    const results = await asUser.query(api.orgDiscovery.searchPublicOrganizations, {})
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

    const resultsAfterJoin = await asUser.query(
      api.orgDiscovery.searchPublicOrganizations,
      {}
    )
    expect(resultsAfterJoin).toHaveLength(0)
  })

  test('getPublicOrganizationProfile returns correct info', async () => {
    const t = setup()

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

    // Add a third user, who is not a member, and view the org as them.
    const { asUser: asU3 } = await signIn(t, 'User 3', 'u3@example.com')

    const profile = await asU3.query(
      api.orgDiscovery.getPublicOrganizationProfile,
      { organizationId: orgId }
    )

    expect(profile.name).toBe('Test Org')
    expect(profile.memberCount).toBe(2)
  })
})

