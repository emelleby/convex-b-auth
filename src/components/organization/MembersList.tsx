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
	ChevronDown,
	Search,
	Trash2
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
	const queryClient = useQueryClient()
	const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
	const [globalFilter, setGlobalFilter] = useState('')
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

	const currentUserMember = members.find((m) => m.userId === session?.user?.id)
	const isAdmin =
		currentUserMember?.role === 'admin' || currentUserMember?.role === 'owner'

	const errorMessage =
		(error as Error | null)?.message ??
		(removeMutation.error as Error | null)?.message ??
		(changeRoleMutation.error as Error | null)?.message

	const columns = useMemo<ColumnDef<Member, unknown>[]>(
		() => [
			{
				id: 'name',
				accessorFn: (row) => row.user.name || 'Unknown',
				header: ({ column }) => <SortableHeader column={column} label="Name" />,
				cell: ({ row }) => (
					<div className="font-medium">
						{row.original.user.name || 'Unknown'}
						{row.original.userId === session?.user?.id && (
							<span className="text-xs text-muted-foreground ml-1">(You)</span>
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
				header: ({ column }) => <SortableHeader column={column} label="Role" />,
				cell: ({ row }) => (
					<span className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">
						{row.original.role}
					</span>
				)
			},
			{
				id: 'actions',
				enableSorting: false,
				enableGlobalFilter: false,
				header: () => <div className="text-right">Actions</div>,
				cell: ({ row }) => {
					const member = row.original
					if (
						!isAdmin ||
						member.role === 'owner' ||
						member.userId === session?.user?.id
					) {
						return null
					}
					return (
						<div className="flex justify-end gap-2">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										Change Role <ChevronDown className="h-3 w-3 ml-1" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuItem
										onClick={() =>
											changeRoleMutation.mutate({
												memberId: member.id,
												role: 'admin'
											})
										}
									>
										Admin
									</DropdownMenuItem>
									<DropdownMenuItem
										onClick={() =>
											changeRoleMutation.mutate({
												memberId: member.id,
												role: 'member'
											})
										}
									>
										Member
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setRemovingMemberId(member.id)}
							>
								<Trash2 className="h-4 w-4 text-destructive" />
							</Button>
						</div>
					)
				}
			}
		],
		[session?.user?.id, isAdmin, changeRoleMutation]
	)

	const table = useReactTable({
		data: members,
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
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
					<DebouncedInput
						value={globalFilter}
						onChange={setGlobalFilter}
						placeholder="Search members..."
						className="pl-9"
					/>
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
										: 'No members match your search.'}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

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
