import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'

interface JoinRequestDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	organizationId: string
	organizationName: string
}

export default function JoinRequestDialog({
	open,
	onOpenChange,
	organizationId,
	organizationName,
}: JoinRequestDialogProps) {
	const [message, setMessage] = useState('')
	const [isPending, setIsPending] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)

	const createJoinRequest = useMutation(api.joinRequests.createJoinRequest)

	const handleSubmit = async () => {
		try {
			setIsPending(true)
			setError(null)

			await createJoinRequest({
				organizationId,
				message: message.trim() || undefined,
			})

			setSuccess(true)
			setMessage('')

			setTimeout(() => {
				onOpenChange(false)
				setSuccess(false)
			}, 1500)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to submit request')
		} finally {
			setIsPending(false)
		}
	}

	const handleOpenChange = (newOpen: boolean) => {
		onOpenChange(newOpen)
		if (!newOpen) {
			setMessage('')
			setError(null)
			setSuccess(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Request to Join</DialogTitle>
					<DialogDescription>
						Send a request to join <strong>{organizationName}</strong>. An admin
						will review your request.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{error && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
							{error}
						</div>
					)}

					{success && (
						<div className="bg-green-500/10 text-green-600 dark:text-green-400 px-4 py-2 rounded-md text-sm">
							Request submitted! The organization admin will review it.
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="join-request-message">Message (Optional)</Label>
						<Textarea
							id="join-request-message"
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Tell the admins why you'd like to join..."
							rows={4}
							disabled={isPending || success}
						/>
						<p className="text-xs text-muted-foreground">
							This message will be visible to organization admins.
						</p>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => handleOpenChange(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isPending || success}>
						{isPending ? 'Submitting...' : 'Submit Request'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
