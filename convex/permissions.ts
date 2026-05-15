import { ConvexError } from 'convex/values'
import type { MutationCtx, QueryCtx } from './_generated/server'
import { requireAuth } from './auth_helpers'
import { components } from './_generated/api'

export type OrgRole = 'owner' | 'admin' | 'member'

/**
 * Internal helper: fetch the caller's membership record in an org.
 * Both QueryCtx and MutationCtx have runQuery, so both are accepted.
 */
async function fetchMembership(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  orgId: string
): Promise<{ role: string } | null> {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: 'member',
    where: [
      { field: 'userId', value: userId },
      { field: 'organizationId', value: orgId, connector: 'AND' as const },
    ],
  })) as { role: string } | null
}

/**
 * FOR MUTATIONS — throws ConvexError if the authenticated user does not hold
 * one of the required roles in the given organization.
 *
 * Usage:
 *   await requireOrgRole(ctx, orgId, ['owner', 'admin'])
 */
export async function requireOrgRole(
  ctx: MutationCtx,
  orgId: string,
  allowedRoles: OrgRole[]
): Promise<void> {
  const user = await requireAuth(ctx)
  const userId = user._id as string
  const membership = await fetchMembership(ctx, userId, orgId)
  if (!membership || !allowedRoles.includes(membership.role as OrgRole)) {
    throw new ConvexError(
      `Insufficient permissions. Required: ${allowedRoles.join(' or ')}`
    )
  }
}

/**
 * FOR READ QUERIES — returns true if the user holds one of the required roles.
 * Does NOT throw; callers should handle false by returning an empty result.
 *
 * Usage:
 *   if (!await hasOrgRole(ctx, userId, orgId, ['owner', 'admin'])) return []
 */
export async function hasOrgRole(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  orgId: string,
  allowedRoles: OrgRole[]
): Promise<boolean> {
  const membership = await fetchMembership(ctx, userId, orgId)
  return !!membership && allowedRoles.includes(membership.role as OrgRole)
}

// ─── Specific permission checkers (for mutations) ─────────────────────────────

/**
 * Throws if the caller cannot invite members (must be owner or admin).
 */
export async function canInviteMembers(
  ctx: MutationCtx,
  orgId: string
): Promise<void> {
  return requireOrgRole(ctx, orgId, ['owner', 'admin'])
}

/**
 * Throws if the caller cannot manage join requests (must be owner or admin).
 */
export async function canManageJoinRequests(
  ctx: MutationCtx,
  orgId: string
): Promise<void> {
  return requireOrgRole(ctx, orgId, ['owner', 'admin'])
}

/**
 * Throws if the caller cannot update org settings (must be owner or admin).
 */
export async function canUpdateOrgSettings(
  ctx: MutationCtx,
  orgId: string
): Promise<void> {
  return requireOrgRole(ctx, orgId, ['owner', 'admin'])
}
