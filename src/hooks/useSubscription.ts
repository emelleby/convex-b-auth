import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useConvexAuthReady } from '@/hooks/useConvexAuthReady'

/**
 * Exposes the current user's subscription state with real-time reactivity.
 *
 * Query is skipped while the Convex JWT is not yet ready to avoid
 * the ConvexError: Unauthenticated race condition on post-login.
 */
export function useSubscription() {
  const { isAuthenticated } = useConvexAuthReady()

  const subscription = useQuery(
    api.subscription.getUserSubscription,
    isAuthenticated ? {} : 'skip'
  )

  return {
    plan: subscription?.plan ?? 'free',
    status: subscription?.status ?? 'active',
    isPro: subscription?.isPro ?? false,
    // undefined = query skipped or in-flight; false = no sub or free plan
    isLoading: isAuthenticated && subscription === undefined,
  }
}
