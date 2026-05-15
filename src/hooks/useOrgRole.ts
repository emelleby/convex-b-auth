import { authClient } from '@/lib/auth-client'

/**
 * Returns the current user's role in the active organization, plus
 * derived boolean flags for conditional UI rendering.
 *
 * Uses `authClient.useActiveOrganization()` which includes the full
 * member list with roles — no extra Convex query required.
 *
 * Permission matrix (mirrors convex/permissions.ts):
 *   owner  → full control
 *   admin  → same as owner except cannot delete org
 *   member → read-only
 */
export function useOrgRole() {
  const { data: session } = authClient.useSession()
  const { data: activeOrg } = authClient.useActiveOrganization()

  const membership = activeOrg?.members?.find(
    (m) => m.userId === session?.user?.id
  )

  const role = (membership?.role ?? null) as 'owner' | 'admin' | 'member' | null
  const isOwner = role === 'owner'
  const isAdmin = role === 'owner' || role === 'admin'
  const isMember = !!membership

  return {
    /** Raw role string, or null when not a member of the active org. */
    role,
    /** True only when the user is the organization owner. */
    isOwner,
    /** True when the user is admin OR owner. */
    isAdmin,
    /** True when the user has any membership in the active org. */
    isMember,
    /** Can send invitations (owner or admin). */
    canInvite: isAdmin,
    /** Can approve/reject join requests (owner or admin). */
    canManageRequests: isAdmin,
  }
}
