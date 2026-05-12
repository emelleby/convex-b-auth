import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'

interface UpgradePlanDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

/**
 * Placeholder upgrade dialog shown when a feature requires a Pro subscription.
 * Swap the footer button's onClick for a Stripe Checkout redirect when payment
 * infrastructure is ready.
 */
export default function UpgradePlanDialog({
	open,
	onOpenChange,
}: UpgradePlanDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Sparkles className="h-5 w-5 text-yellow-500" />
						Upgrade to Pro
					</DialogTitle>
					<DialogDescription>
						Create unlimited organizations with a Pro plan.
					</DialogDescription>
				</DialogHeader>

				<div className="py-6 space-y-4">
					<div className="rounded-lg border p-4">
						<h3 className="font-semibold">Pro Plan</h3>
						<ul className="mt-2 space-y-1 text-sm text-muted-foreground">
							<li>✓ Create unlimited organizations</li>
							<li>✓ Unlimited team members</li>
							<li>✓ Priority support</li>
						</ul>
					</div>
					<p className="text-center text-sm text-muted-foreground">
						Payment integration coming soon. Contact support for early access.
					</p>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button disabled>
						{/* TODO: Replace with Stripe Checkout redirect */}
						Coming Soon
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
