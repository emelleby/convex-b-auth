import { useQuery } from 'convex/react'
import { useConvexAuthReady } from '@/hooks/useConvexAuthReady'
import { authClient } from '@/lib/auth-client'
import { api } from '../../convex/_generated/api'

/**
 * Returns the active organization's subscription state with real-time reactivity.
 *
 * Subscriptions are org-level (not user-level). The query is skipped when:
 *  - The Convex JWT is not yet ready (avoids Unauthenticated race condition)
 *  - There is no active organization (defaults to free plan)
 */
export function useSubscription() {
	const { isAuthenticated } = useConvexAuthReady()
	const { data: activeOrg } = authClient.useActiveOrganization()
	const orgId = activeOrg?.id

	const subscription = useQuery(
		api.subscription.getOrgSubscription,
		isAuthenticated && orgId ? { organizationId: orgId } : 'skip'
	)

	return {
		plan: subscription?.plan ?? 'free',
		status: subscription?.status ?? 'active',
		isPro: subscription?.isPro ?? false,
		// true only while authenticated + org selected + query in-flight
		isLoading: isAuthenticated && !!orgId && subscription === undefined
	}
}
