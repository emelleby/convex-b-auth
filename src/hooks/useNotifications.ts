import { useQuery } from 'convex/react'
import { authClient } from '@/lib/auth-client'
import { api } from '../../convex/_generated/api'

/**
 * Hook for accessing notification data with real-time updates.
 * Uses Convex's reactive queries - no polling needed.
 */
export function useNotifications() {
	const { data: session } = authClient.useSession()
	const { data: activeOrg } = authClient.useActiveOrganization()

	// Pending invitations for current user - auto-updates via Convex subscription
	const pendingInvitations = useQuery(
		api.invitations.listPendingForUser,
		session?.user ? {} : 'skip'
	)

	// User's own join requests - auto-updates via Convex subscription
	const myJoinRequests = useQuery(
		api.joinRequests.listMyJoinRequests,
		session?.user ? {} : 'skip'
	)

	// For admins: pending join requests to review
	const isAdmin = activeOrg?.members?.some(
		(m) => m.userId === session?.user?.id && ['owner', 'admin'].includes(m.role)
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
	const { data: session } = authClient.useSession()
	const { data: activeOrg } = authClient.useActiveOrganization()

	const invitationCount = useQuery(
		api.invitations.getPendingCount,
		session?.user ? {} : 'skip'
	)

	const isAdmin = activeOrg?.members?.some(
		(m) => m.userId === session?.user?.id && ['owner', 'admin'].includes(m.role)
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
