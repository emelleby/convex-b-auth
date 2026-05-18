import { convexQuery } from '@convex-dev/react-query'
import type { RankingInfo } from '@tanstack/match-sorter-utils'
import { compareItems, rankItem } from '@tanstack/match-sorter-utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
	Column,
	ColumnDef,
	FilterFn,
	SortingFn,
	SortingState
} from '@tanstack/react-table'
import {
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	sortingFns,
	useReactTable
} from '@tanstack/react-table'
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	Crown,
	MoreHorizontal,
	Search
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
	Table,
	TableBody,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { useOrgRole } from '@/hooks/useOrgRole'
import { authClient } from '@/lib/auth-client'
import { api } from '../../../convex/_generated/api'
import InviteMemberDialog from './InviteMemberDialog'

declare module '@tanstack/react-table' {
	interface FilterFns {
		fuzzy: FilterFn<unknown>
	}
	interface FilterMeta {
		itemRank: RankingInfo
	}
}

const fuzzyFilter: FilterFn<unknown> = (row, columnId, value, addMeta) => {
	const itemRank = rankItem(row.getValue(columnId), value)
	addMeta({ itemRank })
	return itemRank.passed
}

const fuzzySort: SortingFn<unknown> = (rowA, rowB, columnId) => {
	const rankA = rowA.columnFiltersMeta[columnId]?.itemRank
	const rankB = rowB.columnFiltersMeta[columnId]?.itemRank
	const dir = rankA && rankB ? compareItems(rankA, rankB) : 0
	return dir === 0 ? sortingFns.alphanumeric(rowA, rowB, columnId) : dir
}

interface Member {
	id: string
	userId: string
	organizationId: string
	role: 'owner' | 'admin' | 'member'
	createdAt: Date
	user: {
		id: string
		email: string
		name: string
		image?: string | null
	}
}

function SortableHeader({
	column,
	label
}: {
	column: Column<Member, unknown>
	label: string
}) {
	const sorted = column.getIsSorted()
	return (
		<button
			type="button"
			className="flex items-center gap-1 hover:text-foreground transition-colors"
			onClick={column.getToggleSortingHandler()}
		>
			{label}
			{sorted === 'asc' ? (
				<ArrowUp className="h-3 w-3" />
			) : sorted === 'desc' ? (
				<ArrowDown className="h-3 w-3" />
			) : (
				<ArrowUpDown className="h-3 w-3" />
			)}
		</button>
	)
}

function DebouncedInput({
	value: initialValue,
	onChange,
	debounce = 300,
	...props
}: {
	value: string
	onChange: (value: string) => void
	debounce?: number
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
	const [value, setValue] = useState(initialValue)

	useEffect(() => {
		setValue(initialValue)
	}, [initialValue])

	useEffect(() => {
		const timeout = setTimeout(() => onChange(value), debounce)
		return () => clearTimeout(timeout)
	}, [value, onChange, debounce])

	return (
		<Input
			{...props}
			value={value}
			onChange={(e) => setValue(e.target.value)}
		/>
	)
}

export default function MembersList() {
	const { data: session } = authClient.useSession()
	const { data: activeOrg } = authClient.useActiveOrganization()
	const { isAdmin, isOwner } = useOrgRole()
	const queryClient = useQueryClient()
	const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
	const [managingTeamsMember, setManagingTeamsMember] = useState<Member | null>(
		null
	)
	const [togglingTeamId, setTogglingTeamId] = useState<string | null>(null)
	const [transferringToMember, setTransferringToMember] =
		useState<Member | null>(null)
	const [isTransferring, setIsTransferring] = useState(false)
	const [globalFilter, setGlobalFilter] = useState('')
	const [selectedTeamId, setSelectedTeamId] = useState('all')
	const [sorting, setSorting] = useState<SortingState>([])

	const {
		data: membersData,
		isLoading,
		error
	} = useQuery({
		queryKey: ['organization-members', activeOrg?.id],
		queryFn: () =>
			authClient.organization.listMembers({
				query: { organizationId: activeOrg?.id }
			}),
		enabled: !!activeOrg?.id
	})

	const { data: teamMembershipsMap } = useQuery({
		...convexQuery(api.dashboard.getOrgMembersTeamMemberships, {
			organizationId: activeOrg?.id ?? ''
		}),
		enabled: !!activeOrg?.id
	})

	const { data: teamsResponse } = useQuery({
		queryKey: ['organization-teams', activeOrg?.id],
		queryFn: async () => {
			const res = await authClient.organization.listTeams({
				query: { organizationId: activeOrg?.id }
			})
			return res
		},
		enabled: !!activeOrg?.id
	})

	const allTeams: Array<{ id: string; name: string }> =
		(teamsResponse?.data as Array<{ id: string; name: string }> | undefined) ??
		[]

	const removeMutation = useMutation({
		mutationFn: (memberIdOrEmail: string) =>
			authClient.organization.removeMember({ memberIdOrEmail }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['organization-members', activeOrg?.id]
			})
			setRemovingMemberId(null)
		}
	})

	const addToTeamMutation = useMutation({
		mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
			authClient.organization.addTeamMember({ teamId, userId }),
		onSettled: () => setTogglingTeamId(null)
	})

	const removeFromTeamMutation = useMutation({
		mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
			authClient.organization.removeTeamMember({ teamId, userId }),
		onSettled: () => setTogglingTeamId(null)
	})

	const changeRoleMutation = useMutation({
		mutationFn: ({
			memberId,
			role
		}: {
			memberId: string
			role: 'admin' | 'member'
		}) => authClient.organization.updateMemberRole({ memberId, role }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['organization-members', activeOrg?.id]
			})
		}
	})

	const members: Member[] =
		(membersData?.data?.members as Member[] | undefined) ?? []

	// useMemo is required here. Without it, .filter() produces a new array
	// reference on every render, which invalidates TanStack Table's internal
	// row-model cache (keyed on the data reference) every render. Combined with
	// columns also being unstable, this created a render → rebuild → render loop
	// that froze the browser.
	const filteredMembers = useMemo(
		() =>
			selectedTeamId !== 'all'
				? members.filter((m) =>
						(teamMembershipsMap?.[m.userId] ?? []).some(
							(t) => t.id === selectedTeamId
						)
					)
				: members,
		[members, selectedTeamId, teamMembershipsMap]
	)

	const errorMessage =
		(error as Error | null)?.message ??
		(removeMutation.error as Error | null)?.message ??
		(changeRoleMutation.error as Error | null)?.message

	const columns = useMemo<ColumnDef<Member, unknown>[]>(
		() => {
			const base: ColumnDef<Member, unknown>[] = [
				{
					id: 'name',
					accessorFn: (row) => row.user.name || 'Unknown',
					header: ({ column }) => (
						<SortableHeader column={column} label="Name" />
					),
					cell: ({ row }) => (
						<div className="font-medium">
							{row.original.user.name || 'Unknown'}
							{row.original.userId === session?.user?.id && (
								<span className="text-xs text-muted-foreground ml-1">
									(You)
								</span>
							)}
						</div>
					),
					filterFn: 'fuzzy',
					sortingFn: fuzzySort as SortingFn<Member>
				},
				{
					id: 'email',
					accessorFn: (row) => row.user.email || '',
					header: ({ column }) => (
						<SortableHeader column={column} label="Email" />
					),
					cell: ({ row }) => (
						<span className="text-muted-foreground">
							{row.original.user.email || '—'}
						</span>
					)
				},
				{
					id: 'role',
					accessorFn: (row) => row.role,
					header: ({ column }) => (
						<SortableHeader column={column} label="Role" />
					),
					cell: ({ row }) => (
						<span className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">
							{row.original.role}
						</span>
					)
				},
				{
					id: 'teams',
					enableSorting: false,
					enableGlobalFilter: false,
					header: () => 'Teams',
					cell: ({ row }) => {
						const memberTeams = teamMembershipsMap?.[row.original.userId] ?? []
						if (memberTeams.length === 0) {
							return <span className="text-muted-foreground">—</span>
						}
						return (
							<div className="flex flex-wrap gap-1">
								{memberTeams.map((t) => (
									<Badge key={t.id} variant="secondary" className="text-xs">
										{t.name}
									</Badge>
								))}
							</div>
						)
					}
				}
			]

			if (isAdmin) {
				base.push({
					id: 'actions',
					enableSorting: false,
					enableGlobalFilter: false,
					header: () => <div className="text-right">Actions</div>,
					cell: ({ row }) => {
						const member = row.original
						if (member.userId === session?.user?.id) return null
						if (!isOwner && member.role === 'owner') return null

						return (
							<div className="flex justify-end">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" className="h-8 w-8 p-0">
											<span className="sr-only">Open menu</span>
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuLabel>Actions</DropdownMenuLabel>
										<DropdownMenuItem
											onClick={() => setManagingTeamsMember(member)}
										>
											Manage Teams
										</DropdownMenuItem>

										{/* Role changes — hidden for owner targets */}
										{member.role !== 'owner' && (
											<>
												<DropdownMenuSeparator />
												<DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
													Change Role
												</DropdownMenuLabel>
												<DropdownMenuItem
													disabled={member.role === 'admin'}
													onClick={() =>
														changeRoleMutation.mutate({
															memberId: member.id,
															role: 'admin'
														})
													}
												>
													Make Admin
												</DropdownMenuItem>
												<DropdownMenuItem
													disabled={member.role === 'member'}
													onClick={() =>
														changeRoleMutation.mutate({
															memberId: member.id,
															role: 'member'
														})
													}
												>
													Make Member
												</DropdownMenuItem>
											</>
										)}

										{/* Transfer Ownership — owner actor on admin target only */}
										{isOwner && member.role === 'admin' && (
											<>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => setTransferringToMember(member)}
												>
													<Crown className="h-4 w-4 mr-2" />
													Transfer Ownership
												</DropdownMenuItem>
											</>
										)}

										<DropdownMenuSeparator />
										<DropdownMenuItem
											className="text-destructive"
											onClick={() => setRemovingMemberId(member.id)}
										>
											Remove from organization
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						)
					}
				})
			}

			return base
		},
		// changeRoleMutation.mutate and setTransferringToMember are both stable
		// references (React Query v5 useCallback + React useState setter).
		// isOwner/isAdmin are primitives — safe to include directly.
		[
			session?.user?.id,
			isAdmin,
			isOwner,
			changeRoleMutation.mutate,
			teamMembershipsMap
		]
	)

	const table = useReactTable({
		data: filteredMembers,
		columns,
		filterFns: { fuzzy: fuzzyFilter },
		state: { globalFilter, sorting },
		onGlobalFilterChange: setGlobalFilter,
		onSortingChange: setSorting,
		globalFilterFn: 'fuzzy',
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{errorMessage && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
					{errorMessage}
				</div>
			)}

			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-2 flex-1">
					<div className="relative flex-1 max-w-sm">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
						<DebouncedInput
							value={globalFilter}
							onChange={setGlobalFilter}
							placeholder="Search members..."
							className="pl-9"
						/>
					</div>
					{allTeams.length > 0 && (
						<Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
							<SelectTrigger className="w-44">
								<SelectValue placeholder="All teams" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All teams</SelectItem>
								{allTeams.map((team) => (
									<SelectItem key={team.id} value={team.id}>
										{team.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>
				{isAdmin && (
					<InviteMemberDialog
						onInviteSent={() => {
							queryClient.invalidateQueries({
								queryKey: ['organization-members', activeOrg?.id]
							})
						}}
					/>
				)}
			</div>

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length > 0 ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center text-muted-foreground"
								>
									{members.length === 0
										? 'No members in this organization yet.'
										: selectedTeamId !== 'all'
											? 'No members in this team.'
											: 'No members match your search.'}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
					<TableFooter>We should hide the email in production.</TableFooter>
				</Table>
			</div>

			{/* Manage Teams dialog */}
			<Dialog
				open={!!managingTeamsMember}
				onOpenChange={(open) => {
					if (!open) setManagingTeamsMember(null)
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Manage Teams</DialogTitle>
						<DialogDescription>
							Toggle team membership for{' '}
							<span className="font-medium">
								{managingTeamsMember?.user.name}
							</span>
							.
						</DialogDescription>
					</DialogHeader>
					<div className="py-2">
						{allTeams.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">
								No teams in this organization yet.
							</p>
						) : (
							<ul className="space-y-1">
								{allTeams.map((team) => {
									const memberTeams =
										teamMembershipsMap?.[managingTeamsMember?.userId ?? ''] ??
										[]
									const isMember = memberTeams.some((t) => t.id === team.id)
									const isToggling = togglingTeamId === team.id
									return (
										<li
											key={team.id}
											className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
										>
											<span className="text-sm font-medium">{team.name}</span>
											<Switch
												checked={isMember}
												disabled={isToggling}
												onCheckedChange={(checked) => {
													const userId = managingTeamsMember?.userId
													if (!userId) return
													setTogglingTeamId(team.id)
													if (checked) {
														addToTeamMutation.mutate({
															teamId: team.id,
															userId
														})
													} else {
														removeFromTeamMutation.mutate({
															teamId: team.id,
															userId
														})
													}
												}}
											/>
										</li>
									)
								})}
							</ul>
						)}
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setManagingTeamsMember(null)}
						>
							Done
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Transfer Ownership confirmation dialog */}
			<Dialog
				open={!!transferringToMember}
				onOpenChange={(open) => {
					if (!open) setTransferringToMember(null)
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Crown className="h-5 w-5" />
							Transfer Ownership
						</DialogTitle>
						<DialogDescription>
							<strong>
								{transferringToMember?.user.name ||
									transferringToMember?.user.email}
							</strong>{' '}
							will become the new owner. You will become an admin. This requires
							their cooperation to reverse.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setTransferringToMember(null)}
							disabled={isTransferring}
						>
							Cancel
						</Button>
						<Button
							disabled={isTransferring}
							onClick={async () => {
								if (!transferringToMember) return
								const currentUserMember = members.find(
									(m) => m.userId === session?.user?.id
								)
								if (!currentUserMember) return
								try {
									setIsTransferring(true)
									await authClient.organization.updateMemberRole({
										memberId: transferringToMember.id,
										role: 'owner'
									})
									await authClient.organization.updateMemberRole({
										memberId: currentUserMember.id,
										role: 'admin'
									})
									queryClient.invalidateQueries({
										queryKey: ['organization-members', activeOrg?.id]
									})
									setTransferringToMember(null)
								} catch (err) {
									// Error surfaces via changeRoleMutation error display above table
									console.error('Transfer ownership failed:', err)
									setTransferringToMember(null)
								} finally {
									setIsTransferring(false)
								}
							}}
						>
							{isTransferring ? 'Transferring…' : 'Transfer Ownership'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Remove from organization confirmation dialog */}
			<Dialog
				open={!!removingMemberId}
				onOpenChange={() => setRemovingMemberId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove Member</DialogTitle>
						<DialogDescription>
							Are you sure you want to remove this member? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRemovingMemberId(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={removeMutation.isPending}
							onClick={() =>
								removingMemberId && removeMutation.mutate(removingMemberId)
							}
						>
							{removeMutation.isPending ? 'Removing...' : 'Remove'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
