import { convexQuery } from '@convex-dev/react-query'
import {
	createFileRoute,
	type ErrorComponentProps,
	Outlet,
	redirect,
	useNavigate
} from '@tanstack/react-router'
import { useConvexAuth } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useEffect } from 'react'
import { DefaultCatchBoundary } from '@/components/DefaultCatchBoundary'
import { NotificationCenter } from '@/components/NotificationCenter'
import { api } from '../../../convex/_generated/api'
import { AppSidebar } from '../../components/app-sidebar'
import ThemeToggle from '../../components/ThemeToggle'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from '../../components/ui/breadcrumb'
import { Separator } from '../../components/ui/separator'
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger
} from '../../components/ui/sidebar'

// ---------------------------------------------------------------------------
// Auth error detection
// ---------------------------------------------------------------------------

/**
 * Returns true for errors that indicate the user's Convex session has expired
 * or the token was rejected. We want to redirect these to /login rather than
 * show a generic crash screen.
 *
 * ConvexError is thrown by server-side `throw new ConvexError(...)` calls and
 * surfaces through `useQuery` / `useMutation` hooks during render.
 * Standard Error is thrown by our own `requireAuth` helper in mutations.
 */
function isConvexAuthError(error: unknown): boolean {
	if (error instanceof ConvexError) {
		const data = error.data as { message?: string } | string | undefined
		const msg = typeof data === 'string' ? data : (data?.message ?? '')
		return (
			msg.toLowerCase().includes('unauthenticated') ||
			msg.toLowerCase().includes('not authenticated')
		)
	}
	if (error instanceof Error) {
		return error.message === 'Authentication required'
	}
	return false
}

// ---------------------------------------------------------------------------
// Auth error boundary — renders inside the _authed layout
// ---------------------------------------------------------------------------

/**
 * Replaces the default crash screen specifically for mid-session auth failures.
 *
 * Mid-session expiry flow:
 *   1. User's Convex JWT expires while they have the app open.
 *   2. Next reactive query execution throws `ConvexError: Unauthenticated`.
 *   3. React propagates the error up to this errorComponent.
 *   4. We detect the auth error and navigate to /login (replace: true so the
 *      browser back-button doesn't return to the broken state).
 *   5. Non-auth errors fall through to DefaultCatchBoundary as normal.
 *
 * Why useNavigate + useEffect instead of router.navigate in render:
 *   TanStack Router's navigate is imperative and must not be called during
 *   the render phase. useEffect fires after the fallback mounts, giving a
 *   clean imperative navigation with full router context preserved.
 */
function AuthErrorFallback({ error, reset }: ErrorComponentProps) {
	const navigate = useNavigate()

	useEffect(() => {
		if (isConvexAuthError(error)) {
			void navigate({ to: '/login', replace: true })
		}
	}, [error, navigate])

	// Auth error: show a brief redirect message while navigate fires.
	if (isConvexAuthError(error)) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<p className="text-muted-foreground text-sm">
					Session expired. Redirecting to login…
				</p>
			</div>
		)
	}

	// Non-auth error: delegate to the existing global catch boundary so that
	// infrastructure bugs, missing routes, etc. still show the standard UI.
	return <DefaultCatchBoundary error={error} reset={reset} />
}

// ---------------------------------------------------------------------------
// Route definition
// ---------------------------------------------------------------------------

export const Route = createFileRoute('/_authed')({
	beforeLoad: ({ context, location }) => {
		if (!context.isAuthenticated) {
			throw redirect({ to: '/login', search: { redirect: location.href } })
		}
	},
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				convexQuery(api.auth.getCurrentUser, {})
			)
			// context.queryClient.ensureQueryData(convexQuery(api.todos.get, {})),
		])
	},
	// Catches ConvexError: Unauthenticated thrown by reactive query subscriptions
	// when the session expires mid-use. Falls back to DefaultCatchBoundary for
	// all other error types.
	errorComponent: AuthErrorFallback,
	component: RouteComponent
})

// ---------------------------------------------------------------------------
// Authed layout component
// ---------------------------------------------------------------------------

/**
 * PRIMARY AUTH GATE — Approach B (provider-level suspension).
 *
 * `useConvexAuth()` reports the Convex client's own JWT state, not the Better
 * Auth cookie. `isLoading` is true during the async fetch of the Convex JWT
 * from /api/auth/convex/token that happens after every login. Suspending here
 * means NO child component can subscribe to a Convex query before the token
 * is confirmed, eliminating the race that produced `ConvexError: Unauthenticated`
 * on `invitations:listPendingForUser` and similar subscriptions.
 *
 * SSR performance: when `initialToken` is passed to ConvexBetterAuthProvider
 * (see src/integrations/convex/provider.tsx), the Convex client sets its token
 * synchronously before first render, so `isLoading` is false from the start —
 * zero additional latency on server-rendered pages.
 *
 * Defense-in-depth: individual hooks also gate via `useConvexAuthReady` (see
 * src/hooks/useConvexAuthReady.ts), providing a secondary layer for any query
 * rendered outside this layout in the future.
 */
function RouteComponent() {
	const {
		isLoading: isConvexTokenLoading,
		isAuthenticated: isConvexAuthenticated
	} = useConvexAuth()
	const navigate = useNavigate()

	// ── Truly expired session handler ──────────────────────────────────────
	// When both of these are true simultaneously:
	//   isLoading === false  → ConvexBetterAuthProvider is NOT mid-refresh
	//   isAuthenticated === false  → the JWT is gone and won't be coming back
	//     (the Better Auth session cookie has also expired)
	// …then there is nothing left to wait for: redirect to login.
	//
	// This is distinct from the JWT refresh window (isLoading === true), where
	// we just show a spinner because a new token is on its way.
	//
	// Why useEffect: navigate() is imperative and must not be called during
	// render. useEffect fires after the fallback UI mounts, then the navigation
	// runs cleanly with full router context and replace:true so the broken
	// authed URL is not left in the browser history.
	useEffect(() => {
		if (!isConvexTokenLoading && !isConvexAuthenticated) {
			void navigate({ to: '/login', replace: true })
		}
	}, [isConvexTokenLoading, isConvexAuthenticated, navigate])

	// ── JWT refresh spinner ────────────────────────────────────────────────
	// Shown during two scenarios:
	//   1. Client-side post-login navigation (~100–200 ms, the original gate).
	//   2. Tab wake-up after inactivity: ConvexBetterAuthProvider is fetching
	//      a fresh JWT. The spinner holds until the token is confirmed so that
	//      no child component subscribes to a Convex query with a stale token.
	//
	// Also shown while navigate() is in-flight for the expired-session case
	// above (!isAuthenticated), giving a clean visual transition.
	if (isConvexTokenLoading || !isConvexAuthenticated) {
		return (
			<div className="flex h-screen w-full items-center justify-center">
				<div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
			</div>
		)
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 shadow-sm">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator
							orientation="vertical"
							className="mr-2 data-[orientation=vertical]:h-4"
						/>
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem className="hidden md:block">
									<BreadcrumbLink href="#">
										Build Your Application
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator className="hidden md:block" />
								<BreadcrumbItem>
									<BreadcrumbPage>Data Fetching</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
					<div className="flex items-center gap-2 ml-auto pr-4">
						<NotificationCenter />
						<ThemeToggle />
					</div>
				</header>

				<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
