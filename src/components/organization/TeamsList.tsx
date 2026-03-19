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
	ArrowDown,
	ArrowUp,
	ArrowUpDown,
	MoreHorizontal,
	Plus,
	Search
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { authClient } from '@/lib/auth-client'

import TeamDialog from './TeamDialog'

interface Team {
	id: string
	name: string
	organizationId: string
	createdAt: Date
	updatedAt: Date
}

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
	const queryClient = useQueryClient()
	const [globalFilter, setGlobalFilter] = useState('')
	const [sorting, setSorting] = useState<SortingState>([])
	const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null)
	const [editingTeam, setEditingTeam] = useState<Team | null>(null)
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

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

	const columns = useMemo<ColumnDef<Team, unknown>[]>(
		() => [
			{
				accessorKey: 'name',
				header: ({ column }) => <SortableHeader column={column} label="Name" />,
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
			}
		],
		[]
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
				<Button onClick={() => setIsCreateDialogOpen(true)}>
					<Plus className="h-4 w-4 mr-2" />
					Create Team
				</Button>
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
		</div>
	)
}
