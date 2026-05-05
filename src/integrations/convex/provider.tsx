import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react'
import { ConvexQueryClient } from '@convex-dev/react-query'
import { authClient } from '@/lib/auth-client'

const CONVEX_URL = (import.meta as any).env.VITE_CONVEX_URL
if (!CONVEX_URL) {
	console.error('missing envar CONVEX_URL')
}

// Create ConvexQueryClient with expectAuth for proper SSR support.
//
// `expectAuth: true` tells the Convex client "a token will always be available
// before any query fires — don't gracefully handle the unauthenticated case."
//
// This setting is valid for TWO reasons that must BOTH remain true:
//
//   1. SSR path: `initialToken` is passed to ConvexBetterAuthProvider from
//      __root.tsx beforeLoad, which synchronously sets the token before any
//      React hydration query executes.
//
//   2. Client-side navigation path: the `_authed/route.tsx` RouteComponent
//      calls `useConvexAuth()` and renders a loading spinner until
//      `isLoading === false`, blocking ALL child components (and therefore all
//      Convex subscriptions) until the Convex JWT has been fetched and set.
//
// ⚠️  If the RouteComponent gate in `_authed/route.tsx` is ever removed or
//      bypassed, `expectAuth: true` becomes incorrect for client-side logins
//      and will produce `ConvexError: Unauthenticated` on the first query frame.
export const convexQueryClient = new ConvexQueryClient(CONVEX_URL, {
	expectAuth: true
})

export default function AppConvexProvider({
	children,
	initialToken
}: {
	children: React.ReactNode
	initialToken?: string | null
}) {
	return (
		<ConvexBetterAuthProvider
			client={convexQueryClient.convexClient}
			authClient={authClient}
			initialToken={initialToken}
		>
			{children}
		</ConvexBetterAuthProvider>
	)
}
