import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Trash2 } from 'lucide-react'
import { useState } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/auth-client'
import InviteMemberDialog from './InviteMemberDialog'

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

export default function MembersList() {
	const { data: session } = authClient.useSession()
	const { data: activeOrg } = authClient.useActiveOrganization()
	const queryClient = useQueryClient()
	const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

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

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		)
	}

	if (members.length === 0) {
		return (
			<div className="text-center py-8">
				<p className="text-muted-foreground">
					No members in this organization yet.
				</p>
			</div>
		)
	}

	const currentUserMember = members.find((m) => m.userId === session?.user?.id)
	const isAdmin =
		currentUserMember?.role === 'admin' || currentUserMember?.role === 'owner'

	const errorMessage =
		(error as Error | null)?.message ??
		(removeMutation.error as Error | null)?.message ??
		(changeRoleMutation.error as Error | null)?.message

	return (
		<div className="space-y-4">
			{errorMessage && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
					{errorMessage}
				</div>
			)}

			{isAdmin && (
				<div className="flex justify-end">
					<InviteMemberDialog
						onInviteSent={() => {
							queryClient.invalidateQueries({
								queryKey: ['organization-members', activeOrg?.id]
							})
						}}
					/>
				</div>
			)}

			<div className="rounded-lg border">
				<div className="grid grid-cols-4 gap-4 p-4 font-semibold text-sm border-b bg-muted/50">
					<div>Name</div>
					<div>Email</div>
					<div>Role</div>
					<div className="text-right">Actions</div>
				</div>

				{members.map((member) => (
					<div
						key={member.id}
						className="grid grid-cols-4 gap-4 p-4 border-b last:border-b-0 items-center"
					>
						<div className="text-sm font-medium">
							{member.user.name || 'Unknown'}
							{member.userId === session?.user?.id && (
								<span className="text-xs text-muted-foreground ml-1">
									(You)
								</span>
							)}
						</div>
						<div className="text-sm text-muted-foreground">
							{member.user.email || '-'}
						</div>
						<div className="text-sm">
							<span className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">
								{member.role}
							</span>
						</div>
						<div className="flex justify-end gap-2">
							{isAdmin &&
								member.role !== 'owner' &&
								member.userId !== session?.user?.id && (
									<>
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
									</>
								)}
						</div>
					</div>
				))}
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
