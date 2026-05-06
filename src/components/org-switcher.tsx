import { useConvexAuth } from 'convex/react'
import { Building2, ChevronsUpDown, Plus } from 'lucide-react'
import * as React from 'react'
import CreateOrganizationDialog from '@/components/organization/CreateOrganizationDialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '@/components/ui/sidebar'
import { authClient } from '@/lib/auth-client'

/**
 * Manages the full session-reactive org lifecycle for TeamSwitcher.
 *
 * WHY THIS EXISTS — the dead-atom problem:
 *   better-auth's useAuthQuery atoms self-destruct on unmount: the onMount
 *   cleanup calls value.off() and initAtom.off(), removing every nanostores
 *   listener including the onMount handler itself. After a logout→login cycle
 *   the atom never auto-fetches again, and the component renders stale data.
 *
 * HOW IT WORKS:
 *   A useEffect tracks the user ID. When it changes (login / user switch) and
 *   the Convex JWT is confirmed, refetch() is called imperatively on both
 *   atoms. refetch() bypasses the broken subscription chain and calls the HTTP
 *   endpoint directly, updating value via value.set(). An isSessionRefetching
 *   flag keeps the skeleton visible until fresh data is confirmed.
 *   A second effect auto-selects the first org when none is active, but only
 *   after the refetch guard clears to avoid acting on stale data.
 */
function useOrgSync() {
	// isAuthenticated is only true once the Convex JWT has been fetched AND
	// acknowledged by the backend, preventing org fetches during the auth gap.
	const { isAuthenticated: isConvexAuthenticated, isLoading: isConvexLoading } =
		useConvexAuth()

	const { data: session, isPending: isLoadingSession } = authClient.useSession()
	const {
		data: organizations,
		isPending: isLoadingOrgs,
		refetch: refetchOrgs
	} = authClient.useListOrganizations()
	const {
		data: activeOrg,
		isPending: isLoadingActive,
		refetch: refetchActiveOrg
	} = authClient.useActiveOrganization()

	// Initialized to true so the skeleton shows on every fresh mount, blocking
	// any stale atom data from appearing before the forced refetch completes.
	const [isSessionRefetching, setIsSessionRefetching] = React.useState(true)
	const prevUserIdRef = React.useRef<string | null | undefined>(undefined)

	// Detect user-ID transitions (first login, logout→login, user switch).
	// On transition: force-refetch both dead atoms then clear the loading flag.
	React.useEffect(() => {
		let cancelled = false
		const userId = session?.user?.id

		if (!isConvexAuthenticated || !userId) {
			if (!userId) prevUserIdRef.current = null
			return
		}

		if (userId !== prevUserIdRef.current) {
			prevUserIdRef.current = userId
			setIsSessionRefetching(true)
			void Promise.all([refetchOrgs(), refetchActiveOrg()]).finally(() => {
				if (!cancelled) setIsSessionRefetching(false)
			})
		} else {
			setIsSessionRefetching(false)
		}

		return () => {
			cancelled = true
		}
	}, [isConvexAuthenticated, session?.user?.id, refetchOrgs, refetchActiveOrg])

	// Cross-session guard: discard an activeOrg that isn't in this user's list.
	const validatedActiveOrg = React.useMemo(() => {
		if (!activeOrg || !organizations) return null
		return organizations.some((o) => o.id === activeOrg.id) ? activeOrg : null
	}, [activeOrg, organizations])

	// Auto-select the first org when fresh data shows orgs exist but none is
	// active. Runs only after the refetch guard clears to avoid stale-data calls.
	React.useEffect(() => {
		if (isSessionRefetching || !organizations?.length || validatedActiveOrg)
			return
		void authClient.organization.setActive({
			organizationId: organizations[0].id
		})
	}, [isSessionRefetching, organizations, validatedActiveOrg])

	return {
		isLoading:
			isConvexLoading ||
			isLoadingSession ||
			isLoadingOrgs ||
			isLoadingActive ||
			isSessionRefetching,
		session,
		organizations,
		validatedActiveOrg
	}
}

export function TeamSwitcher() {
	const { isMobile } = useSidebar()
	const { isLoading, session, organizations, validatedActiveOrg } = useOrgSync()
	const [showCreateDialog, setShowCreateDialog] = React.useState(false)

	const handleSelectOrg = async (orgId: string) => {
		try {
			await authClient.organization.setActive({ organizationId: orgId })
		} catch (err) {
			console.error(
				`Failed to switch organization (id="${orgId}"). ` +
					'This may indicate stale session data or unauthorized access to an org from a previous session.',
				err
			)
		}
	}

	const handleOrgCreated = (_orgId: string) => {
		setShowCreateDialog(false)
		// The newly created org is already set as active inside the dialog
	}

	if (isLoading) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton size="lg" disabled>
						<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/20 animate-pulse" />
						<div className="grid flex-1 gap-1 text-left text-sm leading-tight">
							<span className="h-3 w-24 rounded bg-sidebar-primary/20 animate-pulse" />
							<span className="h-2.5 w-16 rounded bg-sidebar-primary/10 animate-pulse" />
						</div>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		)
	}

	// No active session – nothing to render
	if (!session?.user?.id) return null

	// Empty state – prompt user to create their first organization
	if (!organizations || organizations.length === 0) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<CreateOrganizationDialog
						trigger={
							<SidebarMenuButton size="lg">
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg border-2 border-dashed border-sidebar-primary/50">
									<Plus className="size-4 text-sidebar-primary" />
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										Create Organization
									</span>
									<span className="truncate text-xs text-muted-foreground">
										Get started
									</span>
								</div>
							</SidebarMenuButton>
						}
						onSuccess={handleOrgCreated}
					/>
				</SidebarMenuItem>
			</SidebarMenu>
		)
	}

	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<SidebarMenuButton
								size="lg"
								className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
							>
								<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
									{validatedActiveOrg?.logo ? (
										<img
											src={validatedActiveOrg.logo}
											alt={validatedActiveOrg.name}
											className="size-4 rounded object-cover"
										/>
									) : (
										<Building2 className="size-4" />
									)}
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{validatedActiveOrg?.name ?? 'Select Organization'}
									</span>
									<span className="truncate text-xs text-muted-foreground">
										{validatedActiveOrg?.slug ?? 'No organization selected'}
									</span>
								</div>
								<ChevronsUpDown className="ml-auto" />
							</SidebarMenuButton>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
							align="start"
							side={isMobile ? 'bottom' : 'right'}
							sideOffset={4}
						>
							<DropdownMenuLabel className="text-xs text-muted-foreground">
								Organizations
							</DropdownMenuLabel>
							{organizations.map((org, index) => (
								<DropdownMenuItem
									key={org.id}
									onClick={() => handleSelectOrg(org.id)}
									className="gap-2 p-2"
								>
									<div className="flex size-6 items-center justify-center rounded-sm border">
										{org.logo ? (
											<img
												src={org.logo}
												alt={org.name}
												className="size-4 rounded object-cover"
											/>
										) : (
											<Building2 className="size-4 shrink-0" />
										)}
									</div>
									<span
										className={
											validatedActiveOrg?.id === org.id ? 'font-semibold' : ''
										}
									>
										{org.name}
									</span>
									{validatedActiveOrg?.id === org.id && (
										<span className="ml-auto text-xs text-muted-foreground">
											Active
										</span>
									)}
									<DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
								</DropdownMenuItem>
							))}
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="gap-2 p-2"
								onClick={() => setShowCreateDialog(true)}
							>
								<div className="flex size-6 items-center justify-center rounded-md border bg-background">
									<Plus className="size-4" />
								</div>
								<div className="font-medium text-muted-foreground">
									Add organization
								</div>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>

			{/* Controlled dialog opened from the dropdown "Add organization" item */}
			<CreateOrganizationDialog
				open={showCreateDialog}
				onOpenChange={setShowCreateDialog}
				onSuccess={handleOrgCreated}
			/>
		</>
	)
}
