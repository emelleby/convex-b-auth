'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useQuery as useConvexQuery } from 'convex/react'
import { ChevronsUpDown, Users } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
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
import { getRememberedSelection, rememberTeam } from '@/lib/active-selection'
import { authClient } from '@/lib/auth-client'
import { api } from '../../convex/_generated/api'

interface Team {
	id: string
	name: string
	organizationId: string
}

type MembershipStatus = 'leader' | 'member' | 'pending' | 'none'

export function TeamSwitcherInOrg() {
	const { isMobile } = useSidebar()
	const { data: activeOrg } = authClient.useActiveOrganization()
	const { data: session, refetch: refetchSession } = authClient.useSession()
	const navigate = useNavigate()

	// All teams in the active organization. Server-side this is gated on
	// organization membership, so it never leaks teams from other orgs.
	const {
		data: teamsResponse,
		isLoading,
		error
	} = useQuery({
		queryKey: ['organization-teams', activeOrg?.id],
		queryFn: () =>
			authClient.organization.listTeams({
				query: { organizationId: activeOrg?.id }
			}),
		enabled: !!activeOrg?.id
	})

	const teams = (teamsResponse?.data as Team[] | undefined) ?? []
	const teamIds = teams.map((t) => t.id)

	// Batch-resolve the current user's membership per team in one Convex query
	const statuses = useConvexQuery(
		api.teams.getTeamMembershipStatuses,
		teamIds.length > 0 ? { teamIds } : 'skip'
	) as Record<string, MembershipStatus> | undefined

	// The switcher lists only teams in this org that the user is a member of
	const ownTeams = useMemo(
		() =>
			teams.filter(
				(t) => statuses?.[t.id] === 'leader' || statuses?.[t.id] === 'member'
			),
		[teams, statuses]
	)

	// Active team is derived from the session. setActiveOrganization does not
	// clear activeTeamId when switching orgs, so a stale id from another org
	// resolves to nothing here and the label falls back to "Select Team".
	const activeOrgId = activeOrg?.id ?? null
	const activeTeamId = session?.session?.activeTeamId
	const activeTeam = ownTeams.find((t) => t.id === activeTeamId) ?? null
	const activeMemberTeamId = activeTeam?.id ?? null

	const { mutate: setActiveTeamRequest } = useMutation({
		mutationFn: (teamId: string) =>
			authClient.organization.setActiveTeam({ teamId }),
		onSuccess: () => {
			// Session atoms can go stale across auth cycles (see useOrgSync in
			// org-switcher.tsx): refetch explicitly so activeTeamId updates.
			void refetchSession()
		}
	})

	// Persist whichever team becomes active so the selection survives
	// logout/login (activeTeamId resets with each new session).
	useEffect(() => {
		if (activeOrgId && activeMemberTeamId)
			rememberTeam(activeOrgId, activeMemberTeamId)
	}, [activeOrgId, activeMemberTeamId])

	// Auto-select: the remembered team for this org first, else the first team
	// the user belongs to. Runs once per org until a valid active team exists.
	const autoSelectedOrgRef = useRef<string | null>(null)
	useEffect(() => {
		if (!activeOrgId || statuses === undefined) return
		if (activeMemberTeamId || autoSelectedOrgRef.current === activeOrgId) return
		const remembered = getRememberedSelection()
		const rememberedTeam =
			remembered.orgId === activeOrgId && remembered.teamId
				? ownTeams.find((t) => t.id === remembered.teamId)
				: undefined
		const target = rememberedTeam ?? ownTeams[0]
		if (!target) return
		autoSelectedOrgRef.current = activeOrgId
		rememberTeam(activeOrgId, target.id)
		setActiveTeamRequest(target.id)
	}, [
		activeOrgId,
		activeMemberTeamId,
		ownTeams,
		statuses,
		setActiveTeamRequest
	])

	if (error) {
		console.error('Failed to load teams for team switcher', error)
		return null
	}

	// Hide while there is no active org or the org has no teams at all.
	// Even with zero own teams the switcher stays visible so "View all
	// teams" (with join actions) remains reachable from the sidebar.
	if (!activeOrg || isLoading || teams.length === 0) {
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
							My Teams
						</DropdownMenuLabel>
						{ownTeams.length === 0 && (
							<DropdownMenuItem
								disabled
								className="gap-2 p-2 text-muted-foreground"
							>
								You haven't joined any teams yet
							</DropdownMenuItem>
						)}
						{ownTeams.map((team) => (
							<DropdownMenuItem
								key={team.id}
								onClick={() => setActiveTeamRequest(team.id)}
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
							View all teams
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	)
}
