'use client'

import { rankItem } from '@tanstack/match-sorter-utils'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	type Column,
	type ColumnDef,
	type FilterFn,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import {
	useMutation as useConvexMutation,
	useQuery as useConvexQuery
} from 'convex/react'
import {
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	MoreHorizontal,
	Plus,
	Search
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
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
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { authClient } from '@/lib/auth-client'
import { useOrgRole } from '@/hooks/useOrgRole'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

import TeamDialog from './TeamDialog'
import TeamManagePanel from './TeamManagePanel'

interface Team {
	id: string
	name: string
	organizationId: string
	createdAt: Date
	updatedAt: Date
}

type MembershipStatus = 'leader' | 'member' | 'pending' | 'none'

function SortableHeader({
	column,
	label
}: {
	column: Column<Team, unknown>
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

const fuzzyFilter: FilterFn<Team> = (row, columnId, value, addMeta) => {
	const itemRank = rankItem(row.getValue(columnId), value)
	addMeta({ itemRank })
	return itemRank.passed
}

export default function TeamsList() {
	const { data: activeOrg } = authClient.useActiveOrganization()
	const { isAdmin } = useOrgRole()
	const queryClient = useQueryClient()
	const [globalFilter, setGlobalFilter] = useState('')
	const [sorting, setSorting] = useState<SortingState>([])
	const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null)
	const [editingTeam, setEditingTeam] = useState<Team | null>(null)
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
	const [joinRequestTeam, setJoinRequestTeam] = useState<Team | null>(null)
	const [joinMessage, setJoinMessage] = useState('')
	const [joinSubmitting, setJoinSubmitting] = useState(false)
	const [leavingTeam, setLeavingTeam] = useState<Team | null>(null)
	const [managingTeam, setManagingTeam] = useState<Team | null>(null)

	const {
		data: teamsResponse,
		isLoading,
		error
	} = useQuery({
		queryKey: ['organization-teams', activeOrg?.id],
		queryFn: async () => {
			const res = await authClient.organization.listTeams({
				query: { organizationId: activeOrg?.id }
			})
			return res
		},
		enabled: !!activeOrg?.id
	})

	const deleteMutation = useMutation({
		mutationFn: (teamId: string) =>
			authClient.organization.removeTeam({ teamId }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['organization-teams', activeOrg?.id]
			})
			setDeletingTeamId(null)
		}
	})

	const teams = (teamsResponse?.data as Team[] | undefined) ?? []
	const teamIds = teams.map((t) => t.id)

	// Batch-fetch membership statuses for all visible teams in one Convex query
	const statuses = useConvexQuery(
		api.teams.getTeamMembershipStatuses,
		teamIds.length > 0 ? { teamIds } : 'skip'
	) as Record<string, MembershipStatus> | undefined

	// Fetch user's own pending team join requests to resolve request IDs for cancel
	const myPendingRequests = useConvexQuery(
		api.teamJoinRequests.listMyTeamJoinRequests
	)
	const pendingRequestIdByTeam = useMemo<
		Record<string, Id<'teamJoinRequest'>>
	>(() => {
		const map: Record<string, Id<'teamJoinRequest'>> = {}
		for (const req of myPendingRequests ?? []) {
			if (req.status === 'pending') {
				map[req.teamId] = req._id
			}
		}
		return map
	}, [myPendingRequests])

	// Convex mutations for team-level operations
	const createJoinRequest = useConvexMutation(
		api.teamJoinRequests.createTeamJoinRequest
	)
	const cancelJoinRequest = useConvexMutation(
		api.teamJoinRequests.cancelTeamJoinRequest
	)
	const leaveTeamMutation = useConvexMutation(api.teamJoinRequests.leaveTeam)

	const handleJoinRequestSubmit = async () => {
		if (!joinRequestTeam) return
		setJoinSubmitting(true)
		try {
			await createJoinRequest({
				teamId: joinRequestTeam.id,
				message: joinMessage.trim() || undefined
			})
			toast.success('Join request submitted')
			setJoinRequestTeam(null)
			setJoinMessage('')
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : 'Failed to submit request'
			)
		} finally {
			setJoinSubmitting(false)
		}
	}

	const handleLeave = async () => {
		if (!leavingTeam) return
		try {
			await leaveTeamMutation({ teamId: leavingTeam.id })
			toast.success(`Left ${leavingTeam.name}`)
			setLeavingTeam(null)
			queryClient.invalidateQueries({ queryKey: ['user-teams'] })
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to leave team')
		}
	}

	const columns = useMemo<ColumnDef<Team, unknown>[]>(
		() => {
			const base: ColumnDef<Team, unknown>[] = [
				{
					accessorKey: 'name',
					header: ({ column }) => (
						<SortableHeader column={column} label="Name" />
					),
					cell: ({ row }) => (
						<div className="font-medium">{row.getValue('name')}</div>
					)
				},
				{
					accessorKey: 'id',
					header: 'ID',
					cell: ({ row }) => (
						<code className="text-xs bg-muted px-1 py-0.5 rounded">
							{row.getValue('id')}
						</code>
					)
				},
				{
					accessorKey: 'createdAt',
					header: ({ column }) => (
						<SortableHeader column={column} label="Created" />
					),
					cell: ({ row }) => {
						const date = new Date(row.getValue('createdAt'))
						return (
							<span className="text-muted-foreground whitespace-nowrap">
								{date.toLocaleDateString()}
							</span>
						)
					}
				},
				{
					id: 'membership-status',
					header: 'Your Status',
					cell: ({ row }) => {
						const status = statuses?.[row.original.id] ?? 'none'
						if (status === 'leader') return <Badge>Leader</Badge>
						if (status === 'member')
							return <Badge variant="secondary">Member</Badge>
						if (status === 'pending')
							return <Badge variant="outline">Pending</Badge>
						return <span className="text-muted-foreground text-sm">—</span>
					}
				},
				{
					id: 'membership-actions',
					header: '',
					cell: ({ row }) => {
						const team = row.original
						const status = statuses?.[team.id] ?? 'none'

						if (status === 'none') {
							return (
								<Button
									size="sm"
									variant="outline"
									onClick={() => setJoinRequestTeam(team)}
								>
									Request to Join
								</Button>
							)
						}
						if (status === 'pending') {
							const requestId = pendingRequestIdByTeam[team.id]
							return (
								<Button
									size="sm"
									variant="outline"
									disabled={!requestId}
									onClick={async () => {
										if (!requestId) return
										try {
											await cancelJoinRequest({ requestId })
											toast.success('Request cancelled')
										} catch (err) {
											toast.error(
												err instanceof Error
													? err.message
													: 'Failed to cancel request'
											)
										}
									}}
								>
									Cancel Request
								</Button>
							)
						}
						if (status === 'leader') {
							return (
								<Button size="sm" onClick={() => setManagingTeam(team)}>
									Manage
								</Button>
							)
						}
						return (
							<Button
								size="sm"
								variant="outline"
								onClick={() => setLeavingTeam(team)}
							>
								Leave
							</Button>
						)
					}
				}
			]

			if (isAdmin) {
				base.push({
					id: 'actions',
					enableSorting: false,
					header: () => <div className="text-right">Actions</div>,
					cell: ({ row }) => {
						const team = row.original
						return (
							<div className="text-right">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" className="h-8 w-8 p-0">
											<span className="sr-only">Open menu</span>
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuLabel>Actions</DropdownMenuLabel>
										<DropdownMenuItem onClick={() => setEditingTeam(team)}>
											Edit Team
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											className="text-destructive"
											onClick={() => setDeletingTeamId(team.id)}
										>
											Delete Team
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
		[statuses, pendingRequestIdByTeam, cancelJoinRequest, isAdmin]
	)

	const table = useReactTable({
		data: teams,
		columns,
		state: { globalFilter, sorting },
		onGlobalFilterChange: setGlobalFilter,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getSortedRowModel: getSortedRowModel(),
		filterFns: { fuzzy: fuzzyFilter }
	})

	if (isLoading) {
		return (
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<Skeleton className="h-10 w-64" />
					<Skeleton className="h-10 w-32" />
				</div>
				<div className="border rounded-md">
					{[1, 2, 3].map((i) => (
						<Skeleton key={i} className="h-12 w-full border-b last:border-0" />
					))}
				</div>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{error && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
					{(error as Error).message}
				</div>
			)}

			<div className="flex items-center justify-between gap-4">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
					<DebouncedInput
						value={globalFilter}
						onChange={setGlobalFilter}
						placeholder="Search teams..."
						className="pl-9"
					/>
				</div>
				{isAdmin && (
					<Button onClick={() => setIsCreateDialogOpen(true)}>
						<Plus className="h-4 w-4 mr-2" />
						Create Team
					</Button>
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
									{teams.length === 0
										? 'No teams in this organization yet.'
										: 'No teams match your search.'}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{/* Create / Edit team dialogs */}
			<TeamDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				onSuccess={() => {
					queryClient.invalidateQueries({
						queryKey: ['organization-teams', activeOrg?.id]
					})
				}}
			/>

			<TeamDialog
				team={editingTeam}
				open={!!editingTeam}
				onOpenChange={(open) => !open && setEditingTeam(null)}
				onSuccess={() => {
					queryClient.invalidateQueries({
						queryKey: ['organization-teams', activeOrg?.id]
					})
					setEditingTeam(null)
				}}
			/>

			{/* Delete team confirmation */}
			<Dialog
				open={!!deletingTeamId}
				onOpenChange={(open) => !open && setDeletingTeamId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Delete Team</DialogTitle>
						<DialogDescription>
							Are you sure you want to delete this team? This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeletingTeamId(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={deleteMutation.isPending}
							onClick={() =>
								deletingTeamId && deleteMutation.mutate(deletingTeamId)
							}
						>
							{deleteMutation.isPending ? 'Deleting...' : 'Delete'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Join request dialog */}
			<Dialog
				open={!!joinRequestTeam}
				onOpenChange={(open) => {
					if (!open) {
						setJoinRequestTeam(null)
						setJoinMessage('')
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Request to Join {joinRequestTeam?.name}</DialogTitle>
						<DialogDescription>
							A team leader will review your request.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-3 py-2">
						<div className="space-y-1.5">
							<Label htmlFor="join-message">Message (optional)</Label>
							<Textarea
								id="join-message"
								value={joinMessage}
								onChange={(e) => setJoinMessage(e.target.value)}
								placeholder="Tell the team leader why you'd like to join..."
								rows={3}
								disabled={joinSubmitting}
							/>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setJoinRequestTeam(null)
								setJoinMessage('')
							}}
							disabled={joinSubmitting}
						>
							Cancel
						</Button>
						<Button onClick={handleJoinRequestSubmit} disabled={joinSubmitting}>
							{joinSubmitting ? 'Submitting...' : 'Submit Request'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Leave team confirmation */}
			<Dialog
				open={!!leavingTeam}
				onOpenChange={(open) => !open && setLeavingTeam(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Leave {leavingTeam?.name}</DialogTitle>
						<DialogDescription>
							Are you sure you want to leave this team? You will need to request
							to join again if you change your mind.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setLeavingTeam(null)}>
							Cancel
						</Button>
						<Button variant="destructive" onClick={handleLeave}>
							Leave Team
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Team manage panel (leaders only) */}
			{managingTeam && (
				<TeamManagePanel
					open={!!managingTeam}
					onOpenChange={(open) => !open && setManagingTeam(null)}
					teamId={managingTeam.id}
					teamName={managingTeam.name}
				/>
			)}
		</div>
	)
}
