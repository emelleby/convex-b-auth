'use client'

import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { authClient } from '@/lib/auth-client'

interface InviteMemberDialogProps {
	onInviteSent?: () => void
}

export default function InviteMemberDialog({
	onInviteSent
}: InviteMemberDialogProps) {
	const [open, setOpen] = useState(false)
	const [email, setEmail] = useState('')
	const [role, setRole] = useState<'admin' | 'member'>('member')
	const [isPending, setIsPending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)

	const handleInvite = async () => {
		// Validate email
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			setError('Please enter a valid email address')
			return
		}

		try {
			setIsPending(true)
			setError(null)

			await authClient.organization.inviteMember({
				email,
				role
			})

			setSuccess(true)
			setEmail('')
			setRole('member')
			onInviteSent?.()

			// Close dialog after short delay
			setTimeout(() => {
				setOpen(false)
				setSuccess(false)
			}, 1500)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to send invitation')
		} finally {
			setIsPending(false)
		}
	}

	const handleOpenChange = (newOpen: boolean) => {
		setOpen(newOpen)
		if (!newOpen) {
			setEmail('')
			setRole('member')
			setError(null)
			setSuccess(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button>
					<UserPlus className="h-4 w-4 mr-2" />
					Invite Member
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite Member</DialogTitle>
					<DialogDescription>
						Send an invitation to join this organization. The user will see the
						invitation in their notification center.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{error && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
							{error}
						</div>
					)}

					{success && (
						<div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-md text-sm">
							Invitation sent successfully!
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="email">Email Address</Label>
						<Input
							id="email"
							type="email"
							placeholder="colleague@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={isPending}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="role">Role</Label>
						<Select
							value={role}
							onValueChange={(v) => setRole(v as 'admin' | 'member')}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="member">Member</SelectItem>
								<SelectItem value="admin">Admin</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button onClick={handleInvite} disabled={isPending}>
						{isPending ? 'Sending...' : 'Send Invitation'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
