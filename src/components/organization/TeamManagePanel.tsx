'use client'

import {
	useMutation as useConvexMutation,
	useQuery as useConvexQuery
} from 'convex/react'
import { MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/auth-client'
import { api } from '../../../convex/_generated/api'
import type { Id } from '../../../convex/_generated/dataModel'

interface Props {
	open: boolean
	onOpenChange: (open: boolean) => void
	teamId: string
	teamName: string
}

export default function TeamManagePanel({ open, onOpenChange, teamId, teamName }: Props) {
	const { data: session } = authClient.useSession()

	const members = useConvexQuery(api.teams.getTeamMembers, { teamId })
	const pendingRequests = useConvexQuery(
		api.teamJoinRequests.listPendingTeamJoinRequests,
		{ teamId }
	)

	const updateRole = useConvexMutation(api.teams.updateTeamMemberRole)
	const approveRequest = useConvexMutation(api.teamJoinRequests.approveTeamJoinRequest)
	const rejectRequest = useConvexMutation(api.teamJoinRequests.rejectTeamJoinRequest)

	const handleUpdateRole = async (userId: string, newRole: 'leader' | 'member') => {
		try {
			await updateRole({ teamId, userId, newRole })
			toast.success(`Role updated to ${newRole}`)
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update role')
		}
	}

	const handleRemoveMember = async (userId: string) => {
		try {
			await authClient.organization.removeTeamMember({ teamId, userId })
			toast.success('Member removed from team')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to remove member')
		}
	}

	const handleApprove = async (requestId: Id<'teamJoinRequest'>) => {
		try {
			await approveRequest({ requestId })
			toast.success('Request approved')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to approve request')
		}
	}

	const handleReject = async (requestId: Id<'teamJoinRequest'>) => {
		try {
			await rejectRequest({ requestId })
			toast.success('Request rejected')
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to reject request')
		}
	}

	const isLoading = members === undefined || pendingRequests === undefined

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
				<SheetHeader>
					<SheetTitle>Manage {teamName}</SheetTitle>
					<SheetDescription>
						Manage members and review join requests for this team.
					</SheetDescription>
				</SheetHeader>

				<div className="mt-6 space-y-8">
					{/* Members section */}
					<section>
						<h3 className="text-sm font-semibold mb-3">
							Members{members ? ` (${members.length})` : ''}
						</h3>

						{isLoading ? (
							<div className="space-y-2">
								{[1, 2, 3].map((i) => (
									<Skeleton key={i} className="h-10 w-full" />
								))}
							</div>
						) : members === null ? (
							<p className="text-sm text-muted-foreground">Access denied.</p>
						) : members.length === 0 ? (
							<p className="text-sm text-muted-foreground">No members yet.</p>
						) : (
							<ul className="space-y-1">
								{members.map((m) => {
									const isCurrentUser = m.userId === session?.user?.id
									const isLeader = m.role === 'leader'
									return (
										<li
											key={m.memberId}
											className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50"
										>
											<div className="min-w-0">
												<div className="flex items-center gap-2">
													<span className="text-sm font-medium truncate">
														{m.name}
														{isCurrentUser && (
															<span className="text-xs text-muted-foreground ml-1">
																(You)
															</span>
														)}
													</span>
													{isLeader && (
														<Badge className="text-xs">Leader</Badge>
													)}
												</div>
												<p className="text-xs text-muted-foreground truncate">
													{m.email}
												</p>
											</div>

											{!isCurrentUser && (
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" className="h-8 w-8 p-0 shrink-0">
															<span className="sr-only">Open menu</span>
															<MoreHorizontal className="h-4 w-4" />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuLabel>Actions</DropdownMenuLabel>
														{isLeader ? (
															<DropdownMenuItem
																onClick={() => handleUpdateRole(m.userId, 'member')}
															>
																Demote to Member
															</DropdownMenuItem>
														) : (
															<DropdownMenuItem
																onClick={() => handleUpdateRole(m.userId, 'leader')}
															>
																Promote to Leader
															</DropdownMenuItem>
														)}
														<DropdownMenuSeparator />
														<DropdownMenuItem
															className="text-destructive"
															onClick={() => handleRemoveMember(m.userId)}
														>
															Remove from team
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											)}
										</li>
									)
								})}
							</ul>
						)}
					</section>

					{/* Pending join requests section */}
					<section>
						<h3 className="text-sm font-semibold mb-3">
							Pending Requests
							{pendingRequests && pendingRequests.length > 0 && (
								<Badge variant="secondary" className="ml-2 text-xs">
									{pendingRequests.length}
								</Badge>
							)}
						</h3>

						{isLoading ? (
							<Skeleton className="h-10 w-full" />
						) : !pendingRequests || pendingRequests.length === 0 ? (
							<p className="text-sm text-muted-foreground">No pending requests.</p>
						) : (
							<ul className="space-y-2">
								{pendingRequests.map((req) => (
									<li
										key={req._id}
										className="rounded-md border p-3 space-y-2"
									>
										<div>
											<p className="text-sm font-medium">{req.userName}</p>
											<p className="text-xs text-muted-foreground">{req.userEmail}</p>
											{req.message && (
												<p className="text-sm text-muted-foreground mt-1 italic">
													"{req.message}"
												</p>
											)}
										</div>
										<div className="flex gap-2">
											<Button
												size="sm"
												onClick={() => handleApprove(req._id)}
											>
												Approve
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={() => handleReject(req._id)}
											>
												Reject
											</Button>
										</div>
									</li>
								))}
							</ul>
						)}
					</section>
				</div>
			</SheetContent>
		</Sheet>
	)
}
