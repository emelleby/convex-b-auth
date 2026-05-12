import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { Building2, Search, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import JoinRequestDialog from '@/components/organization/JoinRequestDialog'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '../../../../convex/_generated/api'

export const Route = createFileRoute('/_authed/app/browse-organizations')({
	component: BrowseOrganizationsPage
})

function BrowseOrganizationsPage() {
	const [searchQuery, setSearchQuery] = useState('')
	const [debouncedQuery, setDebouncedQuery] = useState('')
	const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
	const [cancellingRequestId, setCancellingRequestId] = useState<string | null>(
		null
	)

	// Debounce with cleanup to avoid stale timers
	useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300)
		return () => clearTimeout(timer)
	}, [searchQuery])

	const organizations = useQuery(api.orgDiscovery.searchPublicOrganizations, {
		query: debouncedQuery || undefined,
		limit: 20
	})

	const myJoinRequests = useQuery(api.joinRequests.listMyJoinRequests)
	const cancelJoinRequest = useMutation(api.joinRequests.cancelJoinRequest)

	const getPendingRequestForOrg = (orgId: string) =>
		myJoinRequests?.find(
			(req) => req.organizationId === orgId && req.status === 'pending'
		)

	const hasPendingRequest = (orgId: string) =>
		myJoinRequests?.some(
			(req) => req.organizationId === orgId && req.status === 'pending'
		) ?? false

	const handleCancelRequest = async (requestId: string) => {
		try {
			setCancellingRequestId(requestId)
			await cancelJoinRequest({ requestId })
		} catch (err) {
			console.error('Failed to cancel request:', err)
		} finally {
			setCancellingRequestId(null)
		}
	}

	const selectedOrg = organizations?.find((o) => o.id === selectedOrgId)

	return (
		<div className="container mx-auto p-6">
			<div className="mb-6">
				<h1 className="text-3xl font-bold">Browse Organizations</h1>
				<p className="text-muted-foreground mt-1">
					Discover and request to join organizations
				</p>
			</div>

			{/* Search */}
			<div className="relative mb-6">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					id="browse-organizations-search"
					placeholder="Search organizations..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-10"
				/>
			</div>

			{/* Organizations Grid */}
			{organizations === undefined ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					<Skeleton className="h-48" />
					<Skeleton className="h-48" />
					<Skeleton className="h-48" />
				</div>
			) : organizations.length === 0 ? (
				<div className="text-center py-12">
					<Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
					<p className="text-muted-foreground">
						{debouncedQuery
							? `No organizations found matching "${debouncedQuery}"`
							: 'No organizations available to join'}
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{organizations.map((org) => (
						<Card key={org.id}>
							<CardHeader>
								<div className="flex items-center gap-3">
									{org.logo ? (
										<img
											src={org.logo}
											alt={org.name}
											className="h-10 w-10 rounded-lg object-cover"
										/>
									) : (
										<div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
											<Building2 className="h-5 w-5 text-primary" />
										</div>
									)}
									<div className="min-w-0">
										<CardTitle className="text-lg truncate">
											{org.name}
										</CardTitle>
										<CardDescription>@{org.slug}</CardDescription>
									</div>
								</div>
							</CardHeader>
							<CardContent>
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Users className="h-4 w-4 shrink-0" />
									<span>Open to new members</span>
								</div>
							</CardContent>
							<CardFooter>
								{hasPendingRequest(org.id) ? (
									<Button
										variant="outline"
										size="sm"
										className="w-full"
										onClick={() => {
											const pendingReq = getPendingRequestForOrg(org.id)
											if (pendingReq) {
												handleCancelRequest(pendingReq.id)
											}
										}}
										disabled={
											cancellingRequestId ===
											getPendingRequestForOrg(org.id)?.id
										}
									>
										<X className="h-4 w-4 mr-2" />
										Cancel Request
									</Button>
								) : (
									<Button
										className="w-full"
										onClick={() => setSelectedOrgId(org.id)}
									>
										Request to Join
									</Button>
								)}
							</CardFooter>
						</Card>
					))}
				</div>
			)}

			{/* Join Request Dialog */}
			<JoinRequestDialog
				open={!!selectedOrgId}
				onOpenChange={(open) => !open && setSelectedOrgId(null)}
				organizationId={selectedOrgId ?? ''}
				organizationName={selectedOrg?.name ?? ''}
			/>
		</div>
	)
}
