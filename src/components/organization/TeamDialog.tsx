'use client'

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
	DialogTitle
} from '@/components/ui/dialog'
import { useAppForm } from '@/hooks/tanstack-form'
import { focusFirstError } from '@/hooks/use-form'
import { authClient } from '@/lib/auth-client'

interface Team {
	id: string
	name: string
	organizationId: string
	createdAt: Date
	updatedAt: Date
}

interface TeamDialogProps {
	team?: Team | null
	open: boolean
	onOpenChange: (open: boolean) => void
	onSuccess?: () => void
}

const teamSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, 'Team name is required')
		.min(2, 'Team name must be at least 2 characters')
		.max(50, 'Team name must be less than 50 characters')
})

type TeamValues = z.infer<typeof teamSchema>

const defaultValues: TeamValues = {
	name: ''
}

export default function TeamDialog({
	team,
	open,
	onOpenChange,
	onSuccess
}: TeamDialogProps) {
	const { data: activeOrg } = authClient.useActiveOrganization()

	const form = useAppForm({
		defaultValues: team ? { name: team.name } : defaultValues,
		validationLogic: revalidateLogic(),
		validators: {
			onDynamic: teamSchema
		},
		onSubmitInvalid: ({ formApi }) => {
			focusFirstError(formApi)
		},
		onSubmit: async ({ value }) => {
			try {
				if (team) {
					const result = await authClient.organization.updateTeam({
						teamId: team.id,
						data: { name: value.name.trim() }
					})
					if (result?.error) {
						toast.error(result.error.message ?? 'Failed to update team')
						return
					}
				} else {
					if (!activeOrg?.id) {
						toast.error('No active organization selected')
						return
					}
					const result = await authClient.organization.createTeam({
						name: value.name.trim(),
						organizationId: activeOrg.id
					})
					if (result?.error) {
						toast.error(result.error.message ?? 'Failed to create team')
						return
					}
				}

				toast.success(
					team ? 'Team updated successfully!' : 'Team created successfully!'
				)
				onSuccess?.()
				form.reset()
				onOpenChange(false)
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : 'Failed to save team'
				)
			}
		}
	})

	const handleOpenChange = (nextOpen: boolean) => {
		onOpenChange(nextOpen)
		if (!nextOpen) {
			form.reset()
		} else if (team?.name) {
			form.setFieldValue('name', team.name)
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{team ? 'Edit Team' : 'Create Team'}</DialogTitle>
					<DialogDescription>
						{team
							? 'Update the name of this team.'
							: 'Add a new team to your organization.'}
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
												label="Team Name"
												placeholder="e.g. Engineering, Marketing..."
												disabled={isSubmitting}
												autoComplete="organization"
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
										<form.SubmitButton label={team ? 'Update' : 'Create'} />
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
