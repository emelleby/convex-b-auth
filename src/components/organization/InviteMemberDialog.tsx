'use client'

import { revalidateLogic } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { useQuery as useConvexQuery, useMutation } from 'convex/react'
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
import { api } from '../../../convex/_generated/api'

interface Team {
	id: string
	name: string
}

interface InviteMemberDialogProps {
	onInviteSent?: () => void
}

const inviteMemberSchema = z.object({
	email: z.email('Please enter a valid email address'),
	role: z.enum(['admin', 'member']),
	teamId: z.string().optional()
})

type InviteMemberValues = z.infer<typeof inviteMemberSchema>

const defaultValues: InviteMemberValues = {
	email: '',
	role: 'member',
	teamId: ''
}

const roleOptions = [
	{ label: 'Member', value: 'member' },
	{ label: 'Admin', value: 'admin' }
] as const

export default function InviteMemberDialog({
	onInviteSent
}: InviteMemberDialogProps) {
	const [open, setOpen] = useState(false)
	const { data: activeOrg } = authClient.useActiveOrganization()

	const { data: teamsResponse } = useQuery({
		queryKey: ['organization-teams', activeOrg?.id],
		queryFn: async () => {
			const res = await authClient.organization.listTeams({
				query: { organizationId: activeOrg?.id }
			})
			return res
		},
		enabled: !!activeOrg?.id
	})

	// Fetch org invitation validity setting
	const orgSettings = useConvexQuery(
		api.orgSettings.getSettings,
		activeOrg?.id ? { organizationId: activeOrg.id } : 'skip'
	)

	const patchInvitationExpiry = useMutation(
		api.orgSettings.patchInvitationExpiry
	)

	const teamOptions =
		teamsResponse?.data?.map((team: Team) => ({
			label: team.name,
			value: team.id
		})) ?? []

	const form = useAppForm({
		defaultValues,
		validationLogic: revalidateLogic(),
		validators: {
			onDynamic: inviteMemberSchema
		},
		onSubmitInvalid: ({ formApi }) => {
			focusFirstError(formApi)
		},
		onSubmit: async ({ value }) => {
			try {
				const inviteParams: {
					email: string
					role: 'admin' | 'member' | 'owner'
					teamId?: string
				} = {
					email: value.email.trim(),
					role: value.role
				}
				if (value.teamId) {
					inviteParams.teamId = value.teamId
				}

				const result = await authClient.organization.inviteMember(inviteParams)

				if (result?.error) {
					toast.error(result.error.message ?? 'Failed to send invitation')
					return
				}

				// Patch expiresAt to match org setting (Better Auth default is 48h)
				const invitationId =
					result && typeof result === 'object' && 'data' in result
						? (result as { data?: { id?: string } }).data?.id
						: undefined
				const validityDays = orgSettings?.invitationValidityDays ?? 365
				if (invitationId && validityDays && validityDays !== 2) {
					const expiresAt = Date.now() + validityDays * 24 * 60 * 60 * 1000
					try {
						await patchInvitationExpiry({
							invitationId,
							expiresAt
						})
					} catch (patchErr) {
						console.error('Failed to patch invitation expiry:', patchErr)
					}
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

									<form.AppField name="teamId">
										{(field) => (
											<field.SelectField
												label="Team"
												placeholder="No team (optional)"
												options={teamOptions}
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
