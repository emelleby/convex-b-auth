import { useQuery } from 'convex/react'
import { useConvexAuthReady } from '@/hooks/useConvexAuthReady'
import { authClient } from '@/lib/auth-client'
import { api } from '../../convex/_generated/api'

/**
 * Hook for accessing notification data with real-time updates.
 * Uses Convex's reactive queries - no polling needed.
 *
 * Query gating uses `useConvexAuthReady` rather than `authClient.useSession`
 * directly. This prevents the race condition where the Better Auth cookie is
 * available but the Convex JWT has not yet been fetched, which would cause
 * queries to fire unauthenticated and return ConvexError: Unauthenticated.
 */
export function useNotifications() {
	// isAuthenticated is only true when BOTH the BA session AND the Convex JWT
	// are confirmed — safe to use as the query gate.
	const { isAuthenticated } = useConvexAuthReady()
	const { data: activeOrg } = authClient.useActiveOrganization()

	// Pending invitations for current user - auto-updates via Convex subscription
	const pendingInvitations = useQuery(
		api.invitations.listPendingForUser,
		isAuthenticated ? {} : 'skip'
	)

	// User's own join requests - auto-updates via Convex subscription
	const myJoinRequests = useQuery(
		api.joinRequests.listMyJoinRequests,
		isAuthenticated ? {} : 'skip'
	)

	// For admins: pending join requests to review.
	// `user` from useConvexAuthReady is sourced from the BA session — same data,
	// but already gated on Convex JWT readiness.
	const { user } = useConvexAuthReady()
	const isAdmin = activeOrg?.members?.some(
		(m) => m.userId === user?.id && ['owner', 'admin'].includes(m.role)
	)

	const pendingJoinRequestsToReview = useQuery(
		api.joinRequests.listPendingJoinRequests,
		isAdmin && activeOrg?.id ? { organizationId: activeOrg.id } : 'skip'
	)

	// Computed values
	const invitationCount = pendingInvitations?.length ?? 0
	const joinRequestsToReviewCount = pendingJoinRequestsToReview?.length ?? 0
	const unreadCount = invitationCount + joinRequestsToReviewCount

	// Loading state
	const isLoading =
		pendingInvitations === undefined ||
		myJoinRequests === undefined ||
		(isAdmin && pendingJoinRequestsToReview === undefined)

	return {
		// Data
		pendingInvitations: pendingInvitations ?? [],
		myJoinRequests: myJoinRequests ?? [],
		pendingJoinRequestsToReview: pendingJoinRequestsToReview ?? [],

		// Counts
		invitationCount,
		joinRequestsToReviewCount,
		unreadCount,

		// State
		isLoading,
		isAdmin
	}
}

/**
 * Lightweight hook for just the notification count (for badge).
 * Uses a separate optimized query.
 */
export function useNotificationCount() {
	const { isAuthenticated, user } = useConvexAuthReady()
	const { data: activeOrg } = authClient.useActiveOrganization()

	const invitationCount = useQuery(
		api.invitations.getPendingCount,
		isAuthenticated ? {} : 'skip'
	)

	const isAdmin = activeOrg?.members?.some(
		(m) => m.userId === user?.id && ['owner', 'admin'].includes(m.role)
	)

	const joinRequestCount = useQuery(
		api.joinRequests.countPendingJoinRequests,
		isAdmin && activeOrg?.id ? { organizationId: activeOrg.id } : 'skip'
	)

	const count = (invitationCount ?? 0) + (joinRequestCount ?? 0)

	return {
		count,
		isLoading:
			invitationCount === undefined ||
			(isAdmin && joinRequestCount === undefined)
	}
}
