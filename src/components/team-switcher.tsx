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

export function TeamSwitcher() {
	const { isMobile } = useSidebar()
	const { data: organizations, isPending: isLoadingOrgs } =
		authClient.useListOrganizations()
	const { data: activeOrg, isPending: isLoadingActive } =
		authClient.useActiveOrganization()
	const [showCreateDialog, setShowCreateDialog] = React.useState(false)

	const handleSelectOrg = async (orgId: string) => {
		try {
			await authClient.organization.setActive({ organizationId: orgId })
		} catch (err) {
			console.error('Failed to switch organization:', err)
		}
	}

	const handleOrgCreated = (_orgId: string) => {
		setShowCreateDialog(false)
		// The newly created org is already set as active inside the dialog
	}

	// Show a skeleton while either hook is loading
	if (isLoadingOrgs || isLoadingActive) {
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
									{activeOrg?.logo ? (
										<img
											src={activeOrg.logo}
											alt={activeOrg.name}
											className="size-4 rounded object-cover"
										/>
									) : (
										<Building2 className="size-4" />
									)}
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{activeOrg?.name ?? 'Select Organization'}
									</span>
									<span className="truncate text-xs text-muted-foreground">
										{activeOrg?.slug ?? 'No organization selected'}
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
										className={activeOrg?.id === org.id ? 'font-semibold' : ''}
									>
										{org.name}
									</span>
									{activeOrg?.id === org.id && (
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
