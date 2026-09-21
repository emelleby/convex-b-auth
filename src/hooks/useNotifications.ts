import { useQuery } from 'convex/react'
import { useConvexAuthReady } from '@/hooks/useConvexAuthReady'
import { useOrgRole } from '@/hooks/useOrgRole'
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

	// Unread in-app notifications (join request outcomes etc.)
	const myNotifications = useQuery(
		api.notifications.listForUser,
		isAuthenticated ? {} : 'skip'
	)

	// For admins: pending join requests to review.
	const { isAdmin } = useOrgRole()

	const pendingJoinRequestsToReview = useQuery(
		api.joinRequests.listPendingJoinRequests,
		isAdmin && activeOrg?.id ? { organizationId: activeOrg.id } : 'skip'
	)

	// Computed values
	const invitationCount = pendingInvitations?.length ?? 0
	const joinRequestsToReviewCount = pendingJoinRequestsToReview?.length ?? 0
	const notificationCount = myNotifications?.filter((n) => !n.read).length ?? 0
	const unreadCount =
		invitationCount + joinRequestsToReviewCount + notificationCount

	// Loading state
	const isLoading =
		pendingInvitations === undefined ||
		myJoinRequests === undefined ||
		myNotifications === undefined ||
		(isAdmin && pendingJoinRequestsToReview === undefined)

	return {
		// Data
		pendingInvitations: pendingInvitations ?? [],
		myJoinRequests: myJoinRequests ?? [],
		myNotifications: myNotifications ?? [],
		pendingJoinRequestsToReview: pendingJoinRequestsToReview ?? [],

		// Counts
		invitationCount,
		joinRequestsToReviewCount,
		notificationCount,
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
	const { isAuthenticated } = useConvexAuthReady()
	const { data: activeOrg } = authClient.useActiveOrganization()
	const { isAdmin } = useOrgRole()

	const invitationCount = useQuery(
		api.invitations.getPendingCount,
		isAuthenticated ? {} : 'skip'
	)

	const joinRequestCount = useQuery(
		api.joinRequests.countPendingJoinRequests,
		isAdmin && activeOrg?.id ? { organizationId: activeOrg.id } : 'skip'
	)

	const myNotifications = useQuery(
		api.notifications.listForUser,
		isAuthenticated ? {} : 'skip'
	)

	const count =
		(invitationCount ?? 0) +
		(joinRequestCount ?? 0) +
		(myNotifications?.filter((n) => !n.read).length ?? 0)

	return {
		count,
		isLoading:
			invitationCount === undefined ||
			myNotifications === undefined ||
			(isAdmin && joinRequestCount === undefined)
	}
}
