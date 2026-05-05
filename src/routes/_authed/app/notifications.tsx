import { createFileRoute } from '@tanstack/react-router'
import { Check, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNotificationActions } from '@/hooks/useNotificationActions'
import { useNotifications } from '@/hooks/useNotifications'

export const Route = createFileRoute('/_authed/app/notifications')({
	component: NotificationsPage
})

function NotificationsPage() {
	const {
		pendingInvitations,
		pendingJoinRequestsToReview,
		isAdmin,
		isLoading
	} = useNotifications()
	const actions = useNotificationActions()

	if (isLoading) {
		return (
			<div className="flex h-[50vh] flex-col items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
				<p className="mt-4 text-sm text-muted-foreground">
					Loading notifications...
				</p>
			</div>
		)
	}

	return (
		<div className="container mx-auto py-10 max-w-4xl">
			<h1 className="text-3xl font-bold mb-8">Notifications</h1>

			<Tabs defaultValue="unread" className="w-full">
				<TabsList className="mb-8">
					<TabsTrigger value="unread">Unread Messages (0)</TabsTrigger>
					<TabsTrigger value="invitations">
						Invitations ({pendingInvitations.length})
					</TabsTrigger>
					<TabsTrigger value="alerts">System Alerts (0)</TabsTrigger>
					{isAdmin && (
						<TabsTrigger value="requests">
							Join Requests ({pendingJoinRequestsToReview.length})
						</TabsTrigger>
					)}
				</TabsList>

				<TabsContent value="unread" className="space-y-4">
					<div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
						No unread messages
					</div>
				</TabsContent>

				<TabsContent value="invitations" className="space-y-4">
					{pendingInvitations.length === 0 ? (
						<div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
							No pending invitations
						</div>
					) : (
						<div className="rounded-md border">
							{pendingInvitations.map((inv) => (
								<div
									key={inv.id}
									className="flex items-center justify-between border-b p-4 last:border-0"
								>
									<div>
										<p className="font-medium">
											Invitation to {inv.organizationName}
										</p>
										<p className="text-sm text-muted-foreground">
											{inv.inviterName} invited you as {inv.role}
										</p>
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											disabled={actions.processingId === inv.id}
											onClick={async () => {
												try {
													await actions.declineInvitation(inv.id)
												} catch (err) {
													toast.error(
														err instanceof Error
															? err.message
															: 'Failed to decline invitation'
													)
												}
											}}
										>
											<X className="mr-2 h-4 w-4" />
											Decline
										</Button>
										<Button
											size="sm"
											disabled={actions.processingId === inv.id}
											onClick={async () => {
												try {
													await actions.acceptInvitation(
														inv.id,
														inv.organizationId,
														false
													)
												} catch (err) {
													toast.error(
														err instanceof Error
															? err.message
															: 'Failed to accept invitation'
													)
												}
											}}
										>
											{actions.processingId === inv.id ? (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											) : (
												<Check className="mr-2 h-4 w-4" />
											)}
											Accept
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</TabsContent>

				{isAdmin && (
					<TabsContent value="requests" className="space-y-4">
						{pendingJoinRequestsToReview.length === 0 ? (
							<div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
								No pending join requests
							</div>
						) : (
							<div className="rounded-md border">
								{pendingJoinRequestsToReview.map((req) => (
									<div
										key={req._id}
										className="flex items-center justify-between border-b p-4 last:border-0"
									>
										<div>
											<p className="font-medium">
												Request to join from {req.userName}
											</p>
											<p className="text-sm text-muted-foreground">
												{req.userEmail}
											</p>
										</div>
										<div className="flex gap-2">
											<Button
												variant="outline"
												size="sm"
												disabled={actions.processingId === req._id}
												onClick={() => actions.rejectJoinRequest(req._id)}
											>
												<X className="mr-2 h-4 w-4" />
												Reject
											</Button>
											<Button
												size="sm"
												disabled={actions.processingId === req._id}
												onClick={() => actions.approveJoinRequest(req._id)}
											>
												{actions.processingId === req._id ? (
													<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												) : (
													<Check className="mr-2 h-4 w-4" />
												)}
												Approve
											</Button>
										</div>
									</div>
								))}
							</div>
						)}
					</TabsContent>
				)}

				<TabsContent value="alerts">
					<div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
						No system alerts
					</div>
				</TabsContent>
			</Tabs>
		</div>
	)
}
