import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { Check, CheckSquare, Loader2, Square, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useNotificationActions } from '@/hooks/useNotificationActions'
import { useNotifications } from '@/hooks/useNotifications'
import { api } from '../../../../convex/_generated/api'

export const Route = createFileRoute('/_authed/app/notifications')({
	component: NotificationsPage
})

function NotificationsPage() {
	const {
		pendingInvitations,
		pendingJoinRequestsToReview,
		myNotifications,
		notificationCount,
		isAdmin,
		isLoading
	} = useNotifications()
	const actions = useNotificationActions()
	const markRead = useMutation(api.notifications.markRead)
	const markAllRead = useMutation(api.notifications.markAllRead)

	const hasUnreadNotifications = myNotifications.some((n) => !n.read)

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

			<Tabs defaultValue="invitations" className="w-full">
				<TabsList className="mb-8">
					<TabsTrigger value="invitations">
						Invitations ({pendingInvitations.length})
					</TabsTrigger>
					<TabsTrigger value="alerts">Alerts ({notificationCount})</TabsTrigger>
					{isAdmin && (
						<TabsTrigger value="requests">
							Join Requests ({pendingJoinRequestsToReview.length})
						</TabsTrigger>
					)}
				</TabsList>

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

				<TabsContent value="alerts" className="space-y-4">
					<div className="flex items-center justify-between px-1">
						<p className="text-sm text-muted-foreground">
							System alerts and notifications
						</p>
						{hasUnreadNotifications && (
							<Button
								variant="outline"
								size="sm"
								onClick={async () => {
									try {
										await markAllRead()
									} catch (err) {
										toast.error(
											err instanceof Error
												? err.message
												: 'Failed to mark all as read'
										)
									}
								}}
							>
								<Square className="mr-2 h-4 w-4" />
								Mark all as read
							</Button>
						)}
					</div>

					{myNotifications.length === 0 ? (
						<div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
							No alerts
						</div>
					) : (
						<div className="rounded-md border">
							{myNotifications.map((n) => (
								<div
									key={n._id}
									className={cn(
										'flex items-center justify-between border-b p-4 last:border-0',
										!n.read && 'bg-muted/30 border-l-4 border-primary pl-3'
									)}
								>
									<div>
										<p
											className={cn(
												'font-medium',
												n.read && 'text-muted-foreground font-normal'
											)}
										>
											{n.message}
										</p>
										<p className="text-sm text-muted-foreground">
											{new Date(n.createdAt).toLocaleDateString()} at{' '}
											{new Date(n.createdAt).toLocaleTimeString([], {
												hour: '2-digit',
												minute: '2-digit'
											})}
										</p>
									</div>
									<div className="flex items-center gap-2">
										{!n.read ? (
											<>
												<Separator orientation="vertical" className="h-6 mx-1" />
												<Button
													variant="ghost"
													size="sm"
													className="text-muted-foreground hover:text-foreground"
													onClick={async () => {
														try {
															await markRead({ notificationId: n._id })
														} catch (err) {
															toast.error(
																err instanceof Error
																	? err.message
																	: 'Failed to mark as read'
															)
														}
													}}
												>
													<Square className="h-4 w-4 mr-2" />
													Mark as read
												</Button>
											</>
										) : (
											<>
												<Separator orientation="vertical" className="h-6 mx-1" />
												<div className="flex items-center text-muted-foreground text-sm px-3 py-2">
													<CheckSquare className="h-4 w-4 mr-2" />
													Read
												</div>
											</>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	)
}
