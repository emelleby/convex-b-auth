'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { ChevronsUpDown, Users } from 'lucide-react'
import React, { useState } from 'react'
import {
	DropdownMenu,
	DropdownMenuContent,
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

interface Team {
	id: string
	name: string
	organizationId: string
}

export function TeamSwitcherInOrg() {
	const { isMobile } = useSidebar()
	const { data: activeOrg } = authClient.useActiveOrganization()
	const [activeTeam, setActiveTeam] = useState<Team | null>(null)
	const navigate = useNavigate()

	// Query: Fetch teams using TanStack Query + Better-Auth API
	const { data: teams = [], isLoading } = useQuery({
		queryKey: ['organization-teams', activeOrg?.id],
		queryFn: () =>
			authClient.organization.listTeams({
				query: { organizationId: activeOrg?.id }
			}),
		enabled: !!activeOrg?.id,
		select: (response: any) => response.data ?? []
	})

	// Set active team when data loads if not already set, or if teams array changes
	React.useEffect(() => {
		if (teams.length > 0) {
			const teamExists = teams.some((t: Team) => t.id === activeTeam?.id)
			if (!teamExists) {
				setActiveTeam(teams[0])
			}
		} else if (teams.length === 0 && activeTeam) {
			setActiveTeam(null)
		}
	}, [teams, activeTeam])

	// Mutation: Set active team
	const setActiveTeamMutation = useMutation({
		mutationFn: (teamId: string) =>
			authClient.organization.setActiveTeam({ teamId }),
		onSuccess: (_, teamId) => {
			const team = teams.find((t: Team) => t.id === teamId)
			if (team) {
				setActiveTeam(team)
			}
		}
	})

	const handleSelectTeam = (team: Team) => {
		setActiveTeamMutation.mutate(team.id)
	}

	// Don't render if no active org or loading
	if (!activeOrg || isLoading) {
		return null
	}

	if (teams.length <= 1) {
		return null
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary">
								<Users className="size-4" />
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">
									{activeTeam?.name ?? 'Select Team'}
								</span>
								<span className="truncate text-xs text-muted-foreground">
									Team
								</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						align="start"
						side={isMobile ? 'bottom' : 'right'}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-xs text-muted-foreground">
							Teams
						</DropdownMenuLabel>
						{teams.map((team: Team) => (
							<DropdownMenuItem
								key={team.id}
								onClick={() => handleSelectTeam(team)}
								className="gap-2 p-2"
							>
								<div className="flex size-6 items-center justify-center rounded-sm border">
									<Users className="size-4 shrink-0" />
								</div>
								<span
									className={activeTeam?.id === team.id ? 'font-semibold' : ''}
								>
									{team.name}
								</span>
								{activeTeam?.id === team.id && (
									<span className="ml-auto text-xs text-muted-foreground">
										Active
									</span>
								)}
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="gap-2 p-2 text-muted-foreground cursor-pointer"
							onClick={() => {
								navigate({
									to: '/app/organization',
									search: { tab: 'teams' }
								})
							}}
						>
							Manage Teams
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
