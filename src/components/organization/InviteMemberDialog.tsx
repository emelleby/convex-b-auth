'use client'

import { revalidateLogic } from '@tanstack/react-form'
import { UserPlus } from 'lucide-react'
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

interface InviteMemberDialogProps {
	onInviteSent?: () => void
}

// const inviteMemberSchema = z.object({
// 	email: z
// 		.string()
// 		.trim()
// 		.min(1, 'Email is required')
// 		.refine((value) => z.email().safeParse(value).success, {
// 			message: 'Please enter a valid email address'
// 		}),
// 	role: z.enum(['admin', 'member'])
// })
const inviteMemberSchema = z.object({
	email: z.email('Please enter a valid email address'),
	role: z.enum(['admin', 'member'])
})

type InviteMemberValues = z.infer<typeof inviteMemberSchema>

const defaultValues: InviteMemberValues = {
	email: '',
	role: 'member'
}

const roleOptions = [
	{ label: 'Member', value: 'member' },
	{ label: 'Admin', value: 'admin' }
] as const

export default function InviteMemberDialog({
	onInviteSent
}: InviteMemberDialogProps) {
	const [open, setOpen] = useState(false)

	const form = useAppForm({
		defaultValues,
		validationLogic: revalidateLogic(),
		validators: {
			onDynamic: inviteMemberSchema
			// onSubmit: inviteMemberSchema
		},
		onSubmitInvalid: ({ formApi }) => {
			focusFirstError(formApi)
		},
		onSubmit: async ({ value }) => {
			try {
				const result = await authClient.organization.inviteMember({
					email: value.email.trim(),
					role: value.role
				})

				if (result?.error) {
					toast.error(result.error.message ?? 'Failed to send invitation')
					return
				}

				toast.success('Invitation sent successfully!')
				onInviteSent?.()
				form.reset()
				setOpen(false)
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : 'Failed to send invitation'
				)
			}
		}
	})

	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen)
		if (!nextOpen) {
			form.reset()
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
									<form.AppField name="email">
										{(field) => (
											<field.TextField
												label="Email Address"
												type="email"
												placeholder="colleague@example.com"
												disabled={isSubmitting}
												autoComplete="email"
											/>
										)}
									</form.AppField>

									<form.AppField name="role">
										{(field) => (
											<field.SelectField
												label="Role"
												placeholder="Select a role"
												options={[...roleOptions]}
												disabled={isSubmitting}
											/>
										)}
									</form.AppField>

									<DialogFooter>
										<Button
											type="button"
											variant="outline"
											onClick={() => handleOpenChange(false)}
											disabled={isSubmitting}
										>
											Cancel
										</Button>
										<form.SubmitButton label="Send Invitation" />
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
