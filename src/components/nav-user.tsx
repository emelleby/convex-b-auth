'use client'

import {
	BadgeCheck,
	Bell,
	ChevronsUpDown,
	CreditCard,
	LogOut,
	Sparkles
} from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar
} from '@/components/ui/sidebar'
import { authClient } from '@/lib/auth-client'
import { Link, useNavigate } from '@tanstack/react-router'

export function NavUser() {
	const { isMobile } = useSidebar()
	const session = authClient.useSession()
	const navigate = useNavigate()

	// Get initials from user name
	const getInitials = (name: string) => {
		return name
			.split(' ')
			.map((part) => part[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	}

	// Handle loading state
	if (session.isPending) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton size="lg" disabled>
						<div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
						<div className="grid flex-1 text-left text-sm leading-tight">
							<div className="h-4 w-24 animate-pulse rounded bg-muted" />
							<div className="h-3 w-32 animate-pulse rounded bg-muted" />
						</div>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		)
	}

	// Handle no user state
	if (!session.data?.user) {
		return null
	}

	const user = session.data.user
	const initials = getInitials(user.name || 'User')

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground "
						>
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage
									src={user.image || undefined}
									alt={user.name || 'User'}
								/>
								<AvatarFallback className="rounded-lg">
									{initials}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">
									{user.name || 'User'}
								</span>
								<span className="truncate text-xs">{user.email}</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? 'bottom' : 'right'}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage
										src={user.image || undefined}
										alt={user.name || 'User'}
									/>
									<AvatarFallback className="rounded-lg">
										{initials}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">
										{user.name || 'User'}
									</span>
									<span className="truncate text-xs">{user.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem>
								<Sparkles />
								Upgrade to Pro
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuGroup>
							<DropdownMenuItem>
								<BadgeCheck />
								Account
							</DropdownMenuItem>
							<DropdownMenuItem>
								<CreditCard />
								Billing
							</DropdownMenuItem>
							<DropdownMenuItem asChild>
								<Link to="/app/notifications" className="flex items-center w-full cursor-pointer">
									<Bell />
									Notifications
								</Link>
							</DropdownMenuItem>
						</DropdownMenuGroup>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={async () => {
								await authClient.signOut()
								navigate({ to: '/login' })
							}}
						>
							<LogOut />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
