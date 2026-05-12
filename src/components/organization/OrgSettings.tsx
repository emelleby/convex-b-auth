'use client'

import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { AlertTriangle, CalendarClock, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
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
import { api } from '../../../convex/_generated/api'

export default function OrgSettings() {
	const navigate = useNavigate()
	const { data: activeOrg } = authClient.useActiveOrganization()
	const { data: session } = authClient.useSession()

	const [name, setName] = useState('')
	const [slug, setSlug] = useState('')
	const [isSaving, setIsSaving] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const [deleteConfirmation, setDeleteConfirmation] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)

	// Invitation settings state
	const [invitationValidityDays, setInvitationValidityDays] =
		useState<number>(365)
	const [isSavingInvitationSettings, setIsSavingInvitationSettings] =
		useState(false)

	// Update local state when activeOrg changes
	useEffect(() => {
		if (activeOrg) {
			setName(activeOrg.name)
			setSlug(activeOrg.slug)
		}
	}, [activeOrg])

	// Fetch org settings
	const orgSettings = useQuery(
		api.orgSettings.getSettings,
		activeOrg?.id ? { organizationId: activeOrg.id } : 'skip'
	)

	useEffect(() => {
		if (orgSettings) {
			setInvitationValidityDays(orgSettings.invitationValidityDays)
		}
	}, [orgSettings])

	const upsertSettings = useMutation(api.orgSettings.upsertSettings)

	// Check if current user is owner
	const isOwner = activeOrg?.members?.some(
		(m) => m.userId === session?.user?.id && m.role === 'owner'
	)

	// Check if current user is admin or owner
	const isAdminOrOwner = activeOrg?.members?.some(
		(m) =>
			m.userId === session?.user?.id &&
			(m.role === 'owner' || m.role === 'admin')
	)

	const handleSave = async () => {
		try {
			setIsSaving(true)
			setError(null)
			setSuccess(null)

			await authClient.organization.update({
				data: {
					name,
					slug
				}
			})

			setSuccess('Organization settings updated successfully!')
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to update organization'
			)
		} finally {
			setIsSaving(false)
		}
	}

	const handleDelete = async () => {
		if (!activeOrg) return

		if (deleteConfirmation !== activeOrg.name) {
			setError('Please type the organization name to confirm deletion')
			return
		}

		try {
			setIsDeleting(true)
			setError(null)

			const orgId = activeOrg.id
			void navigate({ to: '/app' })

			const result = await authClient.organization.delete({
				organizationId: orgId
			})

			if (result?.error) {
				void navigate({ to: '/app/organization' })
				setError(result.error.message ?? 'Failed to delete organization')
				return
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to delete organization'
			)
		} finally {
			setIsDeleting(false)
		}
	}

	if (!activeOrg) {
		return <p>No organization selected</p>
	}

	return (
		<div className="space-y-6">
			{/* General Settings */}
			<Card>
				<CardHeader>
					<CardTitle>General Settings</CardTitle>
					<CardDescription>
						Update your organization's basic information
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{error && (
						<div className="bg-destructive/10 text-destructive px-4 py-2 rounded-md text-sm">
							{error}
						</div>
					)}
					{success && (
						<div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-md text-sm">
							{success}
						</div>
					)}

					<div className="space-y-2">
						<Label htmlFor="name">Organization Name</Label>
						<Input
							id="name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="My Organization"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="slug">Slug</Label>
						<Input
							id="slug"
							value={slug}
							onChange={(e) => setSlug(e.target.value)}
							placeholder="my-organization"
						/>
						<p className="text-xs text-muted-foreground">
							Used in URLs. Only lowercase letters, numbers, and hyphens.
						</p>
					</div>

					<Button onClick={handleSave} disabled={isSaving}>
						<Save className="h-4 w-4 mr-2" />
						{isSaving ? 'Saving...' : 'Save Changes'}
					</Button>
				</CardContent>
			</Card>

			{/* Invitation Settings - Admin/Owner only */}
			{isAdminOrOwner && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CalendarClock className="h-5 w-5" />
							Invitation Settings
						</CardTitle>
						<CardDescription>
							Configure how long pending invitations remain valid
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="invitation-validity">
								Invitation Validity Period
							</Label>
							<Select
								value={String(invitationValidityDays)}
								onValueChange={(value) =>
									setInvitationValidityDays(Number(value))
								}
								disabled={isSavingInvitationSettings}
							>
								<SelectTrigger id="invitation-validity" className="w-full">
									<SelectValue placeholder="Select validity period" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="7">7 days</SelectItem>
									<SelectItem value="30">30 days</SelectItem>
									<SelectItem value="90">90 days</SelectItem>
									<SelectItem value="180">180 days</SelectItem>
									<SelectItem value="365">1 year</SelectItem>
									<SelectItem value="99999">Never expire</SelectItem>
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								Pending invitations will expire after this period. New
								invitations will use this setting.
							</p>
						</div>
						<Button
							onClick={async () => {
								if (!activeOrg) return
								try {
									setIsSavingInvitationSettings(true)
									await upsertSettings({
										organizationId: activeOrg.id,
										invitationValidityDays
									})
									toast.success('Invitation settings saved successfully!')
								} catch (err) {
									toast.error(
										err instanceof Error
											? err.message
											: 'Failed to save invitation settings'
									)
								} finally {
									setIsSavingInvitationSettings(false)
								}
							}}
							disabled={isSavingInvitationSettings}
						>
							<Save className="h-4 w-4 mr-2" />
							{isSavingInvitationSettings ? 'Saving...' : 'Save Changes'}
						</Button>
					</CardContent>
				</Card>
			)}

			{/* Danger Zone - Only for owners */}
			{isOwner && (
				<Card className="border-destructive">
					<CardHeader>
						<CardTitle className="text-destructive flex items-center gap-2">
							<AlertTriangle className="h-5 w-5" />
							Danger Zone
						</CardTitle>
						<CardDescription>
							Irreversible actions that affect your organization
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex items-center justify-between">
							<div>
								<p className="font-medium">Delete Organization</p>
								<p className="text-sm text-muted-foreground">
									Permanently delete this organization and all its data
								</p>
							</div>
							<Button
								variant="destructive"
								onClick={() => setShowDeleteDialog(true)}
							>
								Delete Organization
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Delete Confirmation Dialog */}
			<Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-destructive">
							<AlertTriangle className="h-5 w-5" />
							Delete Organization
						</DialogTitle>
						<DialogDescription>
							This action cannot be undone. This will permanently delete the
							organization <strong>{activeOrg.name}</strong>, remove all
							members, and delete all associated data.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label>
								Type <strong>{activeOrg.name}</strong> to confirm
							</Label>
							<Input
								value={deleteConfirmation}
								onChange={(e) => setDeleteConfirmation(e.target.value)}
								placeholder={activeOrg.name}
							/>
						</div>
					</div>

					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => {
								setShowDeleteDialog(false)
								setDeleteConfirmation('')
							}}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={isDeleting || deleteConfirmation !== activeOrg.name}
						>
							{isDeleting ? 'Deleting...' : 'Delete Organization'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}
