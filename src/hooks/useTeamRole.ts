import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

/**
 * Returns the current user's role in the given team, plus derived boolean flags.
 *
 * Uses the focused `getMyTeamRole` Convex query (single-row BA adapter lookup)
 * rather than fetching the full member list — efficient for large teams.
 *
 * Permission matrix:
 *   leader → can manage members, approve join requests, update roles
 *   member → read-only access to team content
 *   null   → not a member (no access to team-scoped data)
 */
export function useTeamRole(teamId: string | undefined) {
  const role = useQuery(api.teams.getMyTeamRole, teamId ? { teamId } : 'skip')

  const resolvedRole = role ?? null

  return {
    /** Raw role string ('leader' | 'member'), or null when not a team member. */
    role: resolvedRole,
    /** True when the user is a team leader. */
    isLeader: resolvedRole === 'leader',
    /** True when the user has any membership in the team. */
    isMember: resolvedRole !== null,
    /** True while the query result is still loading. */
    isLoading: teamId !== undefined && role === undefined,
  }
}
