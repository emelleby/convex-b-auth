import { createFileRoute } from '@tanstack/react-router'
import { Building2, Mail, Settings, UserCog, Users } from 'lucide-react'
// import MembersList from '@/components/organization/MembersList.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/_authed/app/organization')({
	component: OrganizationPage
})

function OrganizationPage() {
	const { data: activeOrg, isPending } = authClient.useActiveOrganization()

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

			<Tabs defaultValue="overview" className="w-full">
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
							{/* TODO: MembersList component */}
							<p>Members list will go here</p>
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
							{/* TODO: TeamsList component */}
							<p>Teams list will go here</p>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="invitations" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Invitations</CardTitle>
							<CardDescription>
								Pending invitations and join requests
							</CardDescription>
						</CardHeader>
						<CardContent>
							{/* TODO: Invitations management */}
							<p>Invitations will go here</p>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="settings" className="mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Settings</CardTitle>
							<CardDescription>
								Organization settings and danger zone
							</CardDescription>
						</CardHeader>
						<CardContent>
							{/* TODO: OrgSettings component */}
							<p>Settings will go here</p>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	)
}
