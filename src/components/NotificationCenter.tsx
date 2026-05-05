'use client'

import { Link } from '@tanstack/react-router'
import { Bell, Check, ChevronRight, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useNotificationActions } from '@/hooks/useNotificationActions'
import { useNotifications } from '@/hooks/useNotifications'

export function NotificationCenter() {
	const {
		pendingInvitations,
		pendingJoinRequestsToReview,
		unreadCount,
		isLoading
	} = useNotifications()

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
					) : unreadCount > 0 ? (
						<span className="text-xs text-muted-foreground">
							{unreadCount} pending
						</span>
					) : null}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />

				{pendingInvitations.length === 0 &&
				pendingJoinRequestsToReview.length === 0 ? (
					<div className="py-6 text-center text-sm text-muted-foreground">
						No new notifications
					</div>
				) : (
					<>
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
