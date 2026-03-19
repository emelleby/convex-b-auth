import { convexQuery } from '@convex-dev/react-query'
import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { api } from '../../../convex/_generated/api'
import { AppSidebar } from '../../components/app-sidebar'
import ThemeToggle from '../../components/ThemeToggle'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator
} from '../../components/ui/breadcrumb'
import { Separator } from '../../components/ui/separator'
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger
} from '../../components/ui/sidebar'

export const Route = createFileRoute('/_authed')({
	beforeLoad: ({ context, location }) => {
		if (!context.isAuthenticated) {
			throw redirect({ to: '/login', search: { redirect: location.href } })
		}
	},
	component: RouteComponent,
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				convexQuery(api.auth.getCurrentUser, {})
			)
			// context.queryClient.ensureQueryData(convexQuery(api.todos.get, {})),
		])
	}
})

function RouteComponent() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 shadow-sm">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator
							orientation="vertical"
							className="mr-2 data-[orientation=vertical]:h-4"
						/>
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem className="hidden md:block">
									<BreadcrumbLink href="#">
										Build Your Application
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator className="hidden md:block" />
								<BreadcrumbItem>
									<BreadcrumbPage>Data Fetching</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>
					<div className="ml-auto pr-4">
						<ThemeToggle />
					</div>
				</header>

				<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
					<Outlet />
				</div>
			</SidebarInset>
		</SidebarProvider>
	)
}
