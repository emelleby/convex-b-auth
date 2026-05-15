import { revalidateLogic } from '@tanstack/react-form'
import { useState } from 'react'
import { toast } from 'sonner'
import * as z from 'zod'
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
import { useAppForm } from '@/hooks/tanstack-form'
import { focusFirstError } from '@/hooks/use-form'
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

const createOrganizationSchema = z.object({
	name: z.string().trim().min(1, 'Organization name is required'),
	slug: z
		.string()
		.trim()
		.min(1, 'Slug is required')
		.regex(
			/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
			'Slug must start and end with a letter or number and contain only lowercase letters, numbers, and hyphens'
		),
	logo: z.string().trim().url('Invalid logo URL').optional().or(z.literal(''))
})

type CreateOrganizationValues = z.infer<typeof createOrganizationSchema>

const defaultValues: CreateOrganizationValues = {
	name: '',
	slug: '',
	logo: ''
}

export default function CreateOrganizationDialog({
	trigger,
	open: controlledOpen,
	onOpenChange,
	onSuccess
}: CreateOrganizationDialogProps) {
	const [internalOpen, setInternalOpen] = useState(false)
	const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

	// Support both controlled and uncontrolled open state
	const isControlled = controlledOpen !== undefined
	const open = isControlled ? controlledOpen : internalOpen

	const handleClose = () => {
		form.reset()
		setSlugManuallyEdited(false)
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

	const form = useAppForm({
		defaultValues,
		validationLogic: revalidateLogic(),
		validators: {
			onDynamic: createOrganizationSchema
		},
		onSubmitInvalid: ({ formApi }) => {
			focusFirstError(formApi)
		},
		onSubmit: async ({ value }) => {
			try {
				const result = await authClient.organization.create({
					name: value.name.trim(),
					slug: value.slug.trim(),
					logo: value.logo?.trim() || undefined
				})

				if (result.data?.id) {
					await authClient.organization.setActive({
						organizationId: result.data.id
					})
					toast.success('Organization created successfully!')
					onSuccess?.(result.data.id)
					handleClose()
				} else {
					toast.error(result.error?.message ?? 'Failed to create organization')
				}
			} catch (err) {
				toast.error(
					err instanceof Error ? err.message : 'Failed to create organization'
				)
			}
		}
	})

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

				<form.AppForm>
					<form
						onSubmit={(e) => {
							e.preventDefault()
							e.stopPropagation()
							form.handleSubmit()
						}}
						className="space-y-4 py-4"
						noValidate
					>
						<form.Subscribe selector={(state) => state.isSubmitting}>
							{(isSubmitting) => (
								<>
									<form.AppField name="name">
										{(field) => (
											<field.TextField
												label="Organization Name *"
												placeholder="Acme Inc."
												disabled={isSubmitting}
												onChange={(e) => {
													if (!slugManuallyEdited) {
														const generated = e.target.value
															.toLowerCase()
															.replace(/[^a-z0-9]+/g, '-')
															.replace(/^-+|-+$/g, '')
														form.setFieldValue('slug', generated)
													}
												}}
											/>
										)}
									</form.AppField>

									<form.AppField name="slug">
										{(field) => (
											<field.TextField
												label="Slug *"
												placeholder="acme-inc"
												disabled={isSubmitting}
												description="Used in URLs. Only lowercase letters, numbers, and hyphens."
												onChange={(e) => {
													setSlugManuallyEdited(true)
													field.handleChange(
														e.target.value
															.toLowerCase()
															.replace(/[^a-z0-9-]/g, '')
													)
												}}
											/>
										)}
									</form.AppField>

									<form.AppField name="logo">
										{(field) => (
											<field.TextField
												label="Logo URL (Optional)"
												placeholder="https://example.com/logo.png"
												disabled={isSubmitting}
											/>
										)}
									</form.AppField>

									<DialogFooter>
										<Button
											type="button"
											variant="outline"
											onClick={handleClose}
											disabled={isSubmitting}
										>
											Cancel
										</Button>
										<form.SubmitButton label="Create Organization" />
									</DialogFooter>
								</>
							)}
						</form.Subscribe>
					</form>
				</form.AppForm>
			</DialogContent>
		</Dialog>
	)
}
