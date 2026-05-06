import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import {
	Building2,
	Crown,
	Mail,
	Shield,
	ShieldCheck,
	Users,
	Plus
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient } from '@/lib/auth-client'
import { api } from '../../../../convex/_generated/api'

export const Route = createFileRoute('/_authed/app/')({
	component: RouteComponent
})

function getInitials(name: string) {
	return name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

function RoleBadge({ role }: { role: string }) {
	const config: Record<string, { icon: React.ReactNode; variant: 'default' | 'secondary' | 'outline'; label: string }> = {
		owner: { icon: <Crown className="h-3 w-3" />, variant: 'default', label: 'Owner' },
		admin: { icon: <ShieldCheck className="h-3 w-3" />, variant: 'secondary', label: 'Admin' },
		member: { icon: <Shield className="h-3 w-3" />, variant: 'outline', label: 'Member' },
		leader: { icon: <Crown className="h-3 w-3" />, variant: 'default', label: 'Leader' },
	}
	const c = config[role] ?? config.member
	return (
		<Badge variant={c.variant} className="gap-1 capitalize">
			{c.icon}
			{c.label}
		</Badge>
	)
}

function DashboardSkeleton() {
	return (
		<div className="space-y-6">
			<div>
				<Skeleton className="h-8 w-64 mb-2" />
				<Skeleton className="h-4 w-48" />
			</div>
			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<Skeleton className="h-5 w-32" />
					</CardHeader>
					<CardContent className="flex items-center gap-4">
						<Skeleton className="h-16 w-16 rounded-full" />
						<div className="space-y-2 flex-1">
							<Skeleton className="h-5 w-32" />
							<Skeleton className="h-4 w-48" />
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<Skeleton className="h-5 w-32" />
					</CardHeader>
					<CardContent className="flex items-center gap-4">
						<Skeleton className="h-16 w-16 rounded-lg" />
						<div className="space-y-2 flex-1">
							<Skeleton className="h-5 w-40" />
							<Skeleton className="h-4 w-24" />
						</div>
					</CardContent>
				</Card>
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-24" />
				</CardHeader>
				<CardContent>
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						<Skeleton className="h-24 w-full rounded-lg" />
						<Skeleton className="h-24 w-full rounded-lg" />
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

function RouteComponent() {
	const { data: session, isPending: isSessionPending } = authClient.useSession()
	const { data: activeOrg, isPending: isOrgPending } = authClient.useActiveOrganization()
	const { data: membersData, isPending: isMembersPending } = useQuery({
		queryKey: ['dashboard-members', activeOrg?.id],
		queryFn: () =>
			authClient.organization.listMembers({
				query: { organizationId: activeOrg?.id }
			}),
		enabled: !!activeOrg?.id,
		select: (response: any) => response.data?.members ?? []
	})

	const teamQuery = convexQuery(api.dashboard.getUserTeamMemberships, {
		organizationId: activeOrg?.id ?? ''
	})
	const { data: teamMemberships } = useQuery({
		...teamQuery,
		enabled: !!activeOrg?.id
	})

	if (isSessionPending || isOrgPending || (activeOrg && isMembersPending)) {
		return <DashboardSkeleton />
	}

	if (!session?.user) return null

	const user = session.user
	const initials = getInitials(user.name || 'User')
	const members: any[] = membersData ?? []
	const currentUserMember = members.find((m: any) => m.userId === user.id)
	const orgRole = currentUserMember?.role ?? 'member'
	const memberCount = members.length

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground">
					Welcome back, {user.name || 'User'}
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Users className="h-5 w-5" />
							Your Profile
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-center gap-4">
							<Avatar className="h-16 w-16">
								<AvatarImage src={user.image || undefined} alt={user.name || 'User'} />
								<AvatarFallback className="text-lg">{initials}</AvatarFallback>
							</Avatar>
							<div className="space-y-1">
								<p className="text-lg font-semibold leading-none">
									{user.name || 'User'}
								</p>
								<p className="text-sm text-muted-foreground flex items-center gap-1.5">
									<Mail className="h-3.5 w-3.5" />
									{user.email}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{activeOrg ? (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Building2 className="h-5 w-5" />
								Organization
							</CardTitle>
							<CardDescription>
								<Link
									to="/app/organization"
									className="text-primary hover:underline"
								>
									Manage organization &rarr;
								</Link>
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="flex items-start gap-4">
								<div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10">
									{activeOrg.logo ? (
										<img
											src={activeOrg.logo}
											alt={activeOrg.name}
											className="h-8 w-8 rounded object-cover"
										/>
									) : (
										<Building2 className="h-7 w-7 text-primary" />
									)}
								</div>
								<div className="space-y-2 flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<p className="text-lg font-semibold leading-none truncate">
											{activeOrg.name}
										</p>
										<RoleBadge role={orgRole} />
									</div>
									<div className="flex items-center gap-4 text-sm text-muted-foreground">
										<span className="flex items-center gap-1">
											{activeOrg.slug}
										</span>
										<Separator orientation="vertical" className="h-3.5" />
										<span className="flex items-center gap-1">
											<Users className="h-3.5 w-3.5" />
											{memberCount} {memberCount === 1 ? 'member' : 'members'}
										</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				) : (
					<Card className="border-dashed">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Building2 className="h-5 w-5" />
								Organization
							</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col items-center justify-center py-6 text-center">
							<p className="text-sm text-muted-foreground mb-3">
								You are not part of an organization yet.
							</p>
							<Button asChild size="sm">
								<Link to="/app/organization">
									<Plus className="h-4 w-4 mr-1" />
									Create Organization
								</Link>
							</Button>
						</CardContent>
					</Card>
				)}
			</div>

			{activeOrg && (
				<Card>
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="flex items-center gap-2">
									<Users className="h-5 w-5" />
									Teams
								</CardTitle>
								<CardDescription>
									Your team memberships in {activeOrg.name}
								</CardDescription>
							</div>
							<Button asChild variant="outline" size="sm">
								<Link
									to="/app/organization"
									search={{ tab: 'teams' }}
								>
									Manage Teams
								</Link>
							</Button>
						</div>
					</CardHeader>
					<CardContent>
						{teamMemberships === undefined ? (
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<Skeleton className="h-24 rounded-lg" />
								<Skeleton className="h-24 rounded-lg" />
							</div>
						) : teamMemberships.length === 0 ? (
							<div className="text-center py-8">
								<Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
								<p className="text-sm text-muted-foreground">
									No teams in this organization yet.
								</p>
								<Button asChild variant="outline" size="sm" className="mt-3">
									<Link
										to="/app/organization"
										search={{ tab: 'teams' }}
									>
										Create a Team
									</Link>
								</Button>
							</div>
						) : (
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{teamMemberships.map(
									(team: {
										teamId: string
										teamName: string
										role: string | null
										isMember: boolean
									}) => (
										<div
											key={team.teamId}
											className="flex items-center justify-between rounded-lg border p-4"
										>
											<div className="space-y-1 min-w-0">
												<p className="font-medium truncate">
													{team.teamName}
												</p>
												{team.isMember ? (
													<RoleBadge role={team.role ?? 'member'} />
												) : (
													<span className="text-xs text-muted-foreground">
														Not a member
													</span>
												)}
											</div>
										</div>
									)
								)}
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	)
}
