// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
	listTeams: vi.fn(),
	setActiveTeam: vi.fn().mockResolvedValue(undefined),
	refetchSession: vi.fn(),
	navigate: vi.fn(),
	useConvexQuery: vi.fn(),
	useQuery: vi.fn(),
	useMutation: vi.fn(),
	useSession: vi.fn()
}))

vi.mock('@/lib/auth-client', () => ({
	authClient: {
		useActiveOrganization: () => ({
			data: { id: 'org-1', name: 'Test Org', slug: 'test-org' }
		}),
		useSession: mocks.useSession,
		organization: {
			listTeams: mocks.listTeams,
			setActiveTeam: mocks.setActiveTeam
		}
	}
}))

vi.mock('convex/react', () => ({
	useQuery: mocks.useConvexQuery
}))

vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => mocks.navigate
}))

vi.mock('@tanstack/react-query', () => ({
	useQuery: mocks.useQuery,
	useMutation: mocks.useMutation
}))

vi.mock('@/components/ui/sidebar', () => ({
	useSidebar: () => ({ isMobile: false }),
	SidebarMenu: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	SidebarMenuItem: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	SidebarMenuButton: ({
		children,
		...props
	}: { children: React.ReactNode } & Record<string, unknown>) => (
		<button type="button" {...props}>
			{children}
		</button>
	)
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
	DropdownMenu: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuTrigger: ({
		children
	}: {
		children: React.ReactNode
		asChild?: boolean
	}) => <div>{children}</div>,
	DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuItem: ({
		children,
		onClick,
		disabled
	}: {
		children: React.ReactNode
		onClick?: () => void
		disabled?: boolean
	}) => (
		<button type="button" onClick={onClick} disabled={disabled}>
			{children}
		</button>
	),
	DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	DropdownMenuSeparator: () => <hr />
}))

const teams = [
	{ id: 'team-1', name: 'Engineering', organizationId: 'org-1' },
	{ id: 'team-2', name: 'Design', organizationId: 'org-1' },
	{ id: 'team-3', name: 'Marketing', organizationId: 'org-1' }
]

function configureMocks({
	activeTeamId = null as string | null,
	teamList = teams,
	statuses = {
		'team-1': 'member',
		'team-2': 'none',
		'team-3': 'pending'
	} as Record<string, string>
}) {
	mocks.useSession.mockReturnValue({
		data: {
			session: { activeTeamId },
			user: { id: 'user-1', email: 'user@example.com' }
		},
		refetch: mocks.refetchSession
	})
	mocks.useQuery.mockReturnValue({
		data: { data: teamList },
		isLoading: false,
		error: null
	})
	mocks.listTeams.mockResolvedValue({ data: teamList })
	mocks.useConvexQuery.mockReturnValue(statuses)
}

describe('TeamSwitcherInOrg', () => {
	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
		window.localStorage.clear()
	})

	beforeEach(() => {
		mocks.useMutation.mockImplementation(
			({
				mutationFn,
				onSuccess
			}: {
				mutationFn: (args: string) => Promise<unknown>
				onSuccess?: (result: unknown, args: string) => void
			}) => ({
				mutate: (args: string) => {
					void Promise.resolve(mutationFn(args)).then((result) =>
						onSuccess?.(result, args)
					)
				},
				isPending: false
			})
		)
	})

	it('lists only teams in the active org that the user is a member of', async () => {
		configureMocks({})
		const { TeamSwitcherInOrg } = await import('./TeamSwitcherInOrg')
		render(<TeamSwitcherInOrg />)

		expect(screen.getByText('Engineering')).toBeTruthy()
		expect(screen.queryByText('Design')).toBeNull()
		expect(screen.queryByText('Marketing')).toBeNull()
		expect(screen.getByText('View all teams')).toBeTruthy()
	})

	it('falls back to "Select Team" for a stale activeTeamId from another org', async () => {
		configureMocks({ activeTeamId: 'team-from-another-org' })
		const { TeamSwitcherInOrg } = await import('./TeamSwitcherInOrg')
		render(<TeamSwitcherInOrg />)

		expect(screen.getByText('Select Team')).toBeTruthy()
		expect(screen.queryByText('Active')).toBeNull()
	})

	it('shows the active team name when activeTeamId matches a member team', async () => {
		configureMocks({ activeTeamId: 'team-1' })
		const { TeamSwitcherInOrg } = await import('./TeamSwitcherInOrg')
		render(<TeamSwitcherInOrg />)

		expect(screen.getAllByText('Engineering').length).toBe(2)
		expect(screen.queryByText('Select Team')).toBeNull()
		expect(screen.getByText('Active')).toBeTruthy()
	})

	it('switches to a member team on click', async () => {
		configureMocks({})
		const { TeamSwitcherInOrg } = await import('./TeamSwitcherInOrg')
		render(<TeamSwitcherInOrg />)

		fireEvent.click(screen.getByText('Engineering'))

		expect(mocks.setActiveTeam).toHaveBeenCalledWith({ teamId: 'team-1' })
		await waitFor(() => {
			expect(mocks.refetchSession).toHaveBeenCalled()
		})
	})

	it('links to the organization teams tab via "View all teams"', async () => {
		configureMocks({})
		const { TeamSwitcherInOrg } = await import('./TeamSwitcherInOrg')
		render(<TeamSwitcherInOrg />)

		fireEvent.click(screen.getByText('View all teams'))

		expect(mocks.navigate).toHaveBeenCalledWith({
			to: '/app/organization',
			search: { tab: 'teams' }
		})
	})

	it('renders nothing when the active org has no teams', async () => {
		configureMocks({ teamList: [] })
		const { TeamSwitcherInOrg } = await import('./TeamSwitcherInOrg')
		const { container } = render(<TeamSwitcherInOrg />)

		expect(container.textContent).toBe('')
	})

	it('auto-selects the first member team when none is active', async () => {
		configureMocks({})
		const { TeamSwitcherInOrg } = await import('./TeamSwitcherInOrg')
		render(<TeamSwitcherInOrg />)

		await waitFor(() => {
			expect(mocks.setActiveTeam).toHaveBeenCalledWith({ teamId: 'team-1' })
		})
	})

	it('prefers the remembered team for the active org when the user is a member', async () => {
		window.localStorage.setItem(
			'activeOrgTeam',
			JSON.stringify({ orgId: 'org-1', teamId: 'team-2' })
		)
		configureMocks({
			statuses: { 'team-1': 'member', 'team-2': 'member', 'team-3': 'none' }
		})
		const { TeamSwitcherInOrg } = await import('./TeamSwitcherInOrg')
		render(<TeamSwitcherInOrg />)

		// team-2 is remembered; team-1 would be the first-own-team fallback
		await waitFor(() => {
			expect(mocks.setActiveTeam).toHaveBeenCalledWith({ teamId: 'team-2' })
		})
	})

	it('ignores a remembered team the user is not a member of', async () => {
		window.localStorage.setItem(
			'activeOrgTeam',
			JSON.stringify({ orgId: 'org-1', teamId: 'team-2' })
		)
		configureMocks({})
		const { TeamSwitcherInOrg } = await import('./TeamSwitcherInOrg')
		render(<TeamSwitcherInOrg />)

		await waitFor(() => {
			expect(mocks.setActiveTeam).toHaveBeenCalledWith({ teamId: 'team-1' })
		})
	})

	it('ignores a remembered team belonging to another org', async () => {
		window.localStorage.setItem(
			'activeOrgTeam',
			JSON.stringify({ orgId: 'org-other', teamId: 'team-1' })
		)
		configureMocks({})
		const { TeamSwitcherInOrg } = await import('./TeamSwitcherInOrg')
		render(<TeamSwitcherInOrg />)

		// Falls back to the first own team (cross-org team ids cannot match here)
		await waitFor(() => {
			expect(mocks.setActiveTeam).toHaveBeenCalledWith({ teamId: 'team-1' })
		})
	})

	it('does not auto-select when the user has no member teams', async () => {
		configureMocks({
			statuses: { 'team-1': 'none', 'team-2': 'none', 'team-3': 'pending' }
		})
		const { TeamSwitcherInOrg } = await import('./TeamSwitcherInOrg')
		render(<TeamSwitcherInOrg />)

		expect(screen.getByText('View all teams')).toBeTruthy()
		expect(mocks.setActiveTeam).not.toHaveBeenCalled()
	})

	it('does not auto-select when a valid team is already active', async () => {
		configureMocks({ activeTeamId: 'team-1' })
		const { TeamSwitcherInOrg } = await import('./TeamSwitcherInOrg')
		render(<TeamSwitcherInOrg />)

		expect(screen.getByText('Active')).toBeTruthy()
		expect(mocks.setActiveTeam).not.toHaveBeenCalled()
	})

	it('persists the active team for the active org', async () => {
		configureMocks({ activeTeamId: 'team-1' })
		const { TeamSwitcherInOrg } = await import('./TeamSwitcherInOrg')
		render(<TeamSwitcherInOrg />)

		await waitFor(() => {
			expect(
				JSON.parse(window.localStorage.getItem('activeOrgTeam') ?? '{}')
			).toEqual({ orgId: 'org-1', teamId: 'team-1' })
		})
	})
})
