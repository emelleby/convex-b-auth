import { useMutation, useQuery } from 'convex/react'
import { Check, Loader2, MessageSquare, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
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
import { api } from '../../../convex/_generated/api'

export default function JoinRequestsAdmin() {
	const { data: activeOrg } = authClient.useActiveOrganization()
	const [processingId, setProcessingId] = useState<string | null>(null)
	const [rejectingId, setRejectingId] = useState<string | null>(null)

	const pendingRequests = useQuery(
		api.joinRequests.listPendingJoinRequests,
		activeOrg?.id ? { organizationId: activeOrg.id } : 'skip'
	)

	const approveRequest = useMutation(api.joinRequests.approveJoinRequest)
	const rejectRequest = useMutation(api.joinRequests.rejectJoinRequest)

	const handleApprove = async (requestId: string) => {
		try {
			setProcessingId(requestId)
			await approveRequest({ requestId })
			toast.success('Join request approved')
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : 'Failed to approve request'
			)
		} finally {
			setProcessingId(null)
		}
	}

	const handleReject = async (requestId: string) => {
		try {
			setProcessingId(requestId)
			await rejectRequest({ requestId })
			setRejectingId(null)
			toast.success('Join request rejected')
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : 'Failed to reject request'
			)
		} finally {
			setProcessingId(null)
		}
	}

	if (!activeOrg) return null

	if (pendingRequests === undefined) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-16 w-full" />
			</div>
		)
	}

	if (pendingRequests.length === 0) {
		return (
			<div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
				No pending join requests
			</div>
		)
	}

	return (
		<>
			<div className="rounded-md border">
				{pendingRequests.map((request) => (
					<div
						key={request._id}
						className="border-b p-4 last:border-b-0 space-y-3"
					>
						<div className="flex items-start justify-between gap-4">
							<div>
								<p className="font-medium">{request.userName}</p>
								<p className="text-sm text-muted-foreground">
									{request.userEmail}
								</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									Requested {new Date(request.createdAt).toLocaleDateString()}
								</p>
							</div>
							<div className="flex shrink-0 gap-2">
								<Button
									size="sm"
									variant="outline"
									disabled={processingId === request.id}
									onClick={() => setRejectingId(request.id)}
								>
									<X className="h-4 w-4 mr-1" />
									Reject
								</Button>
								<Button
									size="sm"
									disabled={processingId === request.id}
									onClick={() => handleApprove(request.id)}
								>
									{processingId === request.id ? (
										<Loader2 className="h-4 w-4 mr-1 animate-spin" />
									) : (
										<Check className="h-4 w-4 mr-1" />
									)}
									Approve
								</Button>
							</div>
						</div>
						{request.message && (
							<div className="flex items-start gap-2 rounded-md bg-muted p-3">
								<MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
								<p className="text-sm">{request.message}</p>
							</div>
						)}
					</div>
				))}
			</div>

			<Dialog open={!!rejectingId} onOpenChange={() => setRejectingId(null)}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Reject Join Request</DialogTitle>
						<DialogDescription>
							Are you sure you want to reject this request? The user will not be
							added to the organization.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button variant="outline" onClick={() => setRejectingId(null)}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={!!processingId}
							onClick={() => rejectingId && handleReject(rejectingId)}
						>
							Reject Request
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
