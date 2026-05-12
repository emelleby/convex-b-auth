import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Building2, Mail, Settings, UserCog, Users } from 'lucide-react'
import { z } from 'zod'
import BulkInviteDialog from '@/components/organization/BulkInviteDialog'
import InviteMemberDialog from '@/components/organization/InviteMemberDialog'
import JoinRequestsAdmin from '@/components/organization/JoinRequestsAdmin'
import MembersList from '@/components/organization/MembersList'
import OrgSettings from '@/components/organization/OrgSettings'
import PendingInvitationsList from '@/components/organization/PendingInvitationsList'
import TeamsList from '@/components/organization/TeamsList'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authClient } from '@/lib/auth-client'

const tabSchema = z.enum([
	'overview',
	'members',
	'teams',
	'invitations',
	'settings'
])

export const Route = createFileRoute('/_authed/app/organization')({
	validateSearch: z.object({
		tab: tabSchema.default('overview')
	}),
	component: OrganizationPage
})

function OrganizationPage() {
	const { data: activeOrg, isPending } = authClient.useActiveOrganization()
	const { tab } = Route.useSearch()
	const navigate = useNavigate({ from: Route.fullPath })

	if (isPending) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
			</div>
		)
	}

	if (!activeOrg) {
		return (
			<div className="container mx-auto p-6">
				<Card>
					<CardHeader>
						<CardTitle>No Organization Selected</CardTitle>
						<CardDescription>
							Please select or create an organization to manage.
						</CardDescription>
					</CardHeader>
				</Card>
			</div>
		)
	}

	return (
		<div className="container mx-auto p-6">
			<div className="mb-6">
				<h1 className="text-3xl font-bold">{activeOrg.name}</h1>
				<p className="text-muted-foreground">
					Manage your organization settings and members
				</p>
			</div>

			<Tabs
				value={tab}
				onValueChange={(v) => navigate({ search: { tab: v as typeof tab } })}
				className="w-full"
			>
				<TabsList className="grid w-full grid-cols-5">
					<TabsTrigger value="overview" className="flex items-center gap-2">
						<Building2 className="h-4 w-4" />
						Overview
					</TabsTrigger>
					<TabsTrigger value="members" className="flex items-center gap-2">
						<Users className="h-4 w-4" />
						Members
					</TabsTrigger>
					<TabsTrigger value="teams" className="flex items-center gap-2">
						<UserCog className="h-4 w-4" />
						Teams
					</TabsTrigger>
					<TabsTrigger value="invitations" className="flex items-center gap-2">
						<Mail className="h-4 w-4" />
						Invitations
					</TabsTrigger>
					<TabsTrigger value="settings" className="flex items-center gap-2">
						<Settings className="h-4 w-4" />
						Settings
					</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Organization Overview</CardTitle>
							<CardDescription>Quick stats and information</CardDescription>
						</CardHeader>
						<CardContent>
							<p>Organization ID: {activeOrg.id}</p>
							<p>Slug: {activeOrg.slug}</p>
							{/* TODO: Add member count, team count stats */}
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="members" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Members</CardTitle>
							<CardDescription>Manage organization members</CardDescription>
						</CardHeader>
						<CardContent>
							<MembersList />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="teams" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Teams</CardTitle>
							<CardDescription>
								Manage teams within this organization
							</CardDescription>
						</CardHeader>
						<CardContent>
							<TeamsList />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="invitations" className="mt-6 space-y-6">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between">
							<div>
								<CardTitle>Invitations</CardTitle>
								<CardDescription>Manage sent invitations</CardDescription>
							</div>
							<div className="flex items-center gap-2">
								<BulkInviteDialog />
								<InviteMemberDialog />
							</div>
						</CardHeader>
						<CardContent>
							<PendingInvitationsList />
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Join Requests</CardTitle>
							<CardDescription>
								Review requests from users who want to join
							</CardDescription>
						</CardHeader>
						<CardContent>
							<JoinRequestsAdmin />
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="settings" className="mt-6">
					<OrgSettings />
				</TabsContent>
			</Tabs>
		</div>
	)
}
