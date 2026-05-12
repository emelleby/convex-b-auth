'use client'

import { Link } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { Bell, Check, ChevronRight, Loader2, Square, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { useNotificationActions } from '@/hooks/useNotificationActions'
import { useNotifications } from '@/hooks/useNotifications'
import { api } from '../../convex/_generated/api'

export function NotificationCenter() {
	const {
		pendingInvitations,
		pendingJoinRequestsToReview,
		myNotifications,
		unreadCount,
		isLoading
	} = useNotifications()
	const markRead = useMutation(api.notifications.markRead)
	const markAllRead = useMutation(api.notifications.markAllRead)

	const hasUnreadNotifications = myNotifications.some((n) => !n.read)

	const actions = useNotificationActions()
	const processingId = actions.processingId

	const handleAcceptInvitation = async (
		invitationId: string,
		orgId: string
	) => {
		try {
			await actions.acceptInvitation(invitationId, orgId, true)
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : 'Failed to accept invitation'
			)
		}
	}

	const handleDeclineInvitation = async (invitationId: string) => {
		try {
			await actions.declineInvitation(invitationId)
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : 'Failed to decline invitation'
			)
		}
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-5 w-5" />
					{unreadCount > 0 && (
						<span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
							{unreadCount > 9 ? '9+' : unreadCount}
						</span>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-80">
				<DropdownMenuLabel className="flex items-center justify-between">
					<span>Notifications</span>
					{isLoading ? (
						<Loader2 className="h-3 w-3 animate-spin" />
					) : hasUnreadNotifications ? (
						<Button
							variant="link"
							className="h-auto p-0 text-xs font-normal"
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
							Mark all as read
						</Button>
					) : unreadCount > 0 ? (
						<span className="text-xs text-muted-foreground">
							{unreadCount} pending
						</span>
					) : null}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />

				{pendingInvitations.length === 0 &&
				pendingJoinRequestsToReview.length === 0 &&
				myNotifications.length === 0 ? (
					<div className="py-6 text-center text-sm text-muted-foreground">
						No new notifications
					</div>
				) : (
					<>
						{myNotifications.length > 0 && (
							<>
								<DropdownMenuLabel className="text-xs">Alerts</DropdownMenuLabel>
								{myNotifications.slice(0, 5).map((n) => (
									<div
										key={n._id}
										className={cn(
											'flex items-center justify-between px-3 py-2 border-b last:border-b-0',
											!n.read && 'font-semibold border-l-2 border-primary pl-2'
										)}
									>
										<p
											className={cn(
												'text-sm flex-1 pr-2',
												n.read && 'text-muted-foreground'
											)}
										>
											{n.message}
										</p>
										{!n.read && (
											<>
												<Separator orientation="vertical" className="h-4 mx-1" />
												<Button
													variant="ghost"
													size="icon"
													className="h-6 w-6 shrink-0"
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
													<Square className="h-4 w-4 text-muted-foreground" />
													<span className="sr-only">Mark as read</span>
												</Button>
											</>
										)}
									</div>
								))}
								<DropdownMenuSeparator />
							</>
						)}
						{pendingInvitations.map((invitation) => (
							<div key={invitation.id} className="p-3 border-b last:border-b-0">
								<p className="text-sm font-medium">
									Invitation to {invitation.organizationName}
								</p>
								<p className="text-xs text-muted-foreground mb-2">
									{invitation.inviterName} invited you as {invitation.role}
								</p>
								<div className="flex gap-2">
									<Button
										size="sm"
										variant="outline"
										className="flex-1"
										disabled={processingId === invitation.id}
										onClick={() => handleDeclineInvitation(invitation.id)}
									>
										<X className="h-3 w-3 mr-1" />
										Decline
									</Button>
									<Button
										size="sm"
										className="flex-1"
										disabled={processingId === invitation.id}
										onClick={() =>
											handleAcceptInvitation(
												invitation.id,
												invitation.organizationId
											)
										}
									>
										{processingId === invitation.id ? (
											<Loader2 className="h-3 w-3 mr-1 animate-spin" />
										) : (
											<Check className="h-3 w-3 mr-1" />
										)}
										Accept
									</Button>
								</div>
							</div>
						))}

						{pendingJoinRequestsToReview.length > 0 && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuLabel className="text-xs">
									Join Requests
								</DropdownMenuLabel>
								{pendingJoinRequestsToReview.slice(0, 3).map((request) => (
									<DropdownMenuItem key={request.id} asChild>
										<Link
											to="/app/organization"
											search={{ tab: 'invitations' }}
											className="flex items-center justify-between w-full"
										>
											<span className="text-sm">Request from user to join</span>
											<ChevronRight className="h-4 w-4" />
										</Link>
									</DropdownMenuItem>
								))}
							</>
						)}
					</>
				)}

				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link to="/app/notifications" className="w-full text-center text-sm">
						View all notifications
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
