'use client'

import { api } from '¤/_generated/api'
import { useMutation, useQuery } from 'convex/react'
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
import { authClient } from '@/lib/auth-client'

export default function PendingInvitationsList() {
	const { data: activeOrg } = authClient.useActiveOrganization()
	const [cancelingId, setCancelingId] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isCanceling, setIsCanceling] = useState(false)

	// Query: Fetch pending invitations using Convex
	const invitations =
		useQuery(
			api.invitations.listPendingInvitations,
			activeOrg?.id ? { organizationId: activeOrg.id } : 'skip'
		) ?? []

	const isLoading = invitations === undefined

	// Mutation: Cancel invitation using Convex
	const cancelInvitation = useMutation(api.invitations.cancelInvitation)

	const handleCancelInvitation = async (invitationId: string) => {
		try {
			setError(null)
			setIsCanceling(true)
			await cancelInvitation({ invitationId })
			setCancelingId(null)
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to cancel invitation'
			)
		} finally {
			setIsCanceling(false)
		}
	}

	if (isLoading) {
		return (
			<div className="space-y-4">
				<Skeleton className="h-12 w-full" />
				<Skeleton className="h-12 w-full" />
			</div>
		)
	}

	if (invitations.length === 0) {
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

	return (
		<div className="space-y-4">
			{error && (
				<div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
					{error}
				</div>
			)}

			<div className="rounded-lg border">
				<div className="grid grid-cols-4 gap-4 p-4 font-semibold text-sm border-b bg-muted/50">
					<div>Email</div>
					<div>Role</div>
					<div>Sent</div>
					<div className="text-right">Actions</div>
				</div>

				{invitations.map((invitation) => (
					<div
						key={invitation._id}
						className="grid grid-cols-4 gap-4 p-4 border-b last:border-b-0 items-center"
					>
						<div className="text-sm font-medium">{invitation.email}</div>
						<div className="text-sm">
							<span className="inline-block px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium capitalize">
								{invitation.role}
							</span>
						</div>
						<div className="text-sm text-muted-foreground">
							{new Date(invitation.createdAt).toLocaleDateString()}
						</div>
						<div className="flex justify-end">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setCancelingId(invitation._id)}
							>
								<X className="h-4 w-4 mr-1" />
								Cancel
							</Button>
						</div>
					</div>
				))}
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
							disabled={isCanceling}
							onClick={() => cancelingId && handleCancelInvitation(cancelingId)}
						>
							{isCanceling ? 'Canceling...' : 'Cancel Invitation'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
