'use client'

import { useMutation } from '@tanstack/react-query'
import { useQuery } from 'convex/react'
import { Mail, X } from 'lucide-react'
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
import { api } from '../../../convex/_generated/api'

export default function PendingInvitationsList() {
	const { data: activeOrg } = authClient.useActiveOrganization()
	const [cancelingId, setCancelingId] = useState<string | null>(null)

	// Query: Fetch pending invitations using Convex
	const invitations = useQuery(
		api.invitations.listOrganizationPendingInvitations,
		activeOrg?.id ? { organizationId: activeOrg.id } : 'skip'
	)

	// Mutation: Cancel invitation using Better-Auth API
	const cancelMutation = useMutation({
		mutationFn: (invitationId: string) =>
			authClient.organization.cancelInvitation({ invitationId }),
		onSuccess: () => {
			// Convex useQuery will auto-refresh when the mutation completes
			setCancelingId(null)
		}
	})

	// Loading state: invitations is undefined while loading
	if (invitations === undefined) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		)
	}

	if (!invitations || invitations.length === 0) {
		return (
			<div className="text-center py-8">
				<Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
				<p className="text-muted-foreground">No pending invitations.</p>
				<p className="text-sm text-muted-foreground">
					Use the "Invite Member" button to invite new members.
				</p>
			</div>
		)
	}

	const errorMessage = (cancelMutation.error as Error | null)?.message

	return (
		<div className="space-y-4">
			{errorMessage && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
					{errorMessage}
				</div>
			)}

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Email</TableHead>
							<TableHead>Role</TableHead>
							<TableHead>Sent</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{invitations.map((invitation) => {
							const isExpired = new Date(invitation.expiresAt) < new Date()
							return (
								<TableRow key={invitation.id}>
									<TableCell className="font-medium">
										{invitation.email}
									</TableCell>
									<TableCell>
										<span className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">
											{invitation.role}
										</span>
									</TableCell>
									<TableCell className="text-muted-foreground">
										{new Date(invitation.createdAt).toLocaleDateString()}
									</TableCell>
									<TableCell>
										{isExpired ? (
											<span className="inline-block px-2 py-1 rounded-md bg-destructive/10 text-destructive text-xs font-medium">
												Expired
											</span>
										) : (
											<span className="inline-block px-2 py-1 rounded-md bg-green-500/10 text-green-500 text-xs font-medium">
												Pending
											</span>
										)}
									</TableCell>
									<TableCell className="text-right">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setCancelingId(invitation.id)}
										>
											<X className="h-4 w-4 mr-1" />
											Cancel
										</Button>
									</TableCell>
								</TableRow>
							)
						})}
					</TableBody>
				</Table>
			</div>

			{/* Cancel Confirmation Dialog */}
			<Dialog open={!!cancelingId} onOpenChange={() => setCancelingId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Cancel Invitation</DialogTitle>
						<DialogDescription>
							Are you sure you want to cancel this invitation? The user will no
							longer be able to accept it.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setCancelingId(null)}>
							Keep Invitation
						</Button>
						<Button
							variant="destructive"
							disabled={cancelMutation.isPending}
							onClick={() => cancelingId && cancelMutation.mutate(cancelingId)}
						>
							{cancelMutation.isPending ? 'Canceling...' : 'Cancel Invitation'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
