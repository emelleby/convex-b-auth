import { useEffect, useState } from 'react'
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
import { authClient } from '@/lib/auth-client'

interface CreateOrganizationDialogProps {
	/** Uncontrolled mode: renders a trigger that opens the dialog */
	trigger?: React.ReactNode
	/** Controlled mode: external open state */
	open?: boolean
	/** Controlled mode: callback when open state changes */
	onOpenChange?: (open: boolean) => void
	/** Called with the new org's id after a successful creation */
	onSuccess?: (orgId: string) => void
}

export default function CreateOrganizationDialog({
	trigger,
	open: controlledOpen,
	onOpenChange,
	onSuccess
}: CreateOrganizationDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false)
	const [name, setName] = useState('')
	const [slug, setSlug] = useState('')
	const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
	const [logo, setLogo] = useState('')
	const [isPending, setIsPending] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Support both controlled and uncontrolled open state
	const isControlled = controlledOpen !== undefined
	const open = isControlled ? controlledOpen : internalOpen

	// Auto-generate slug from name (only when slug hasn't been manually edited)
	useEffect(() => {
		if (!slugManuallyEdited && name) {
			const generated = name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
			setSlug(generated)
		}
	}, [name, slugManuallyEdited])

	const handleSlugChange = (value: string) => {
		setSlugManuallyEdited(true)
		setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
	}

	const resetForm = () => {
		setName('')
		setSlug('')
		setSlugManuallyEdited(false)
		setLogo('')
		setError(null)
	}

	const handleClose = () => {
		resetForm()
		if (isControlled) {
			onOpenChange?.(false)
		} else {
			setInternalOpen(false)
		}
	}

	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			handleClose()
		} else {
			if (isControlled) {
				onOpenChange?.(true)
			} else {
				setInternalOpen(true)
			}
		}
	}

	const handleSubmit = async () => {
		if (!name.trim()) {
			setError('Organization name is required')
			return
		}
		if (!slug.trim()) {
			setError('Slug is required')
			return
		}
		if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug)) {
			setError(
				'Slug must start and end with a letter or number and contain only lowercase letters, numbers, and hyphens'
			)
			return
		}

		try {
			setIsPending(true)
			setError(null)

			const result = await authClient.organization.create({
				name: name.trim(),
				slug: slug.trim(),
				logo: logo.trim() || undefined
			})

			if (result.data?.id) {
				await authClient.organization.setActive({
					organizationId: result.data.id
				})
				onSuccess?.(result.data.id)
				handleClose()
			} else {
				setError(result.error?.message ?? 'Failed to create organization')
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to create organization'
			)
		} finally {
			setIsPending(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Create Organization</DialogTitle>
					<DialogDescription>
						Create a new organization to collaborate with your team.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{error && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
							{error}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="org-name">Organization Name *</Label>
						<Input
							id="org-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Acme Inc."
							disabled={isPending}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="org-slug">Slug *</Label>
						<Input
							id="org-slug"
							value={slug}
							onChange={(e) => handleSlugChange(e.target.value)}
							placeholder="acme-inc"
							disabled={isPending}
						/>
						<p className="text-xs text-muted-foreground">
							Used in URLs. Only lowercase letters, numbers, and hyphens.
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="org-logo">Logo URL (Optional)</Label>
						<Input
							id="org-logo"
							value={logo}
							onChange={(e) => setLogo(e.target.value)}
							placeholder="https://example.com/logo.png"
							disabled={isPending}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleClose} disabled={isPending}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={isPending}>
						{isPending ? 'Creating…' : 'Create Organization'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
