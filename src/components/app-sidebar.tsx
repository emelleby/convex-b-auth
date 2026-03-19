import {
	BookOpen,
	Bot,
	ClubIcon,
	Frame,
	Map,
	PieChart,
	SquareTerminal
} from 'lucide-react'
import type * as React from 'react'
import { TeamSwitcher } from '#/components/org-switcher'
import { NavMain } from '@/components/nav-main'
import { NavProjects } from '@/components/nav-projects'
import { NavSecondary } from '@/components/nav-secondary'
import { NavUser } from '@/components/nav-user'
import { TeamSwitcherInOrg } from '@/components/TeamSwitcherInOrg'
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail
} from '@/components/ui/sidebar'

// This is sample data.
const data = {
	user: {
		name: 'shadcn',
		email: 'm@example.com',
		avatar: '/avatars/shadcn.jpg'
	},
	navMain: [
		{
			title: 'Main',
			url: '#',
			icon: SquareTerminal,
			isActive: true,
			items: [
				{
					title: 'Home',
					url: '/'
				},
				{
					title: 'Starred',
					url: '#'
				},
				{
					title: 'Settings',
					url: '#'
				}
			]
		},
		{
			title: 'Organization',
			url: '/organization',
			icon: Bot
		},
		{
			title: 'Documentation',
			url: '#',
			icon: BookOpen,
			items: [
				{
					title: 'Introduction',
					url: '#'
				},
				{
					title: 'Get Started',
					url: '#'
				},
				{
					title: 'Tutorials',
					url: '#'
				},
				{
					title: 'Changelog',
					url: '#'
				}
			]
		}
		// {
		// 	title: 'Settings',
		// 	url: '#',
		// 	icon: Settings2,
		// 	items: [
		// 		{
		// 			title: 'General',
		// 			url: '#'
		// 		},
		// 		{
		// 			title: 'Team',
		// 			url: '#'
		// 		},
		// 		{
		// 			title: 'Billing',
		// 			url: '#'
		// 		},
		// 		{
		// 			title: 'Limits',
		// 			url: '#'
		// 		}
		// 	]
		// }
	],
	navSecondary: [
		{
			title: 'Organization',
			url: '/app/organization',
			icon: ClubIcon
		},
		{
			title: 'Get Help',
			url: '#',
			icon: Map
		},
		{
			title: 'Search',
			url: '#',
			icon: BookOpen
		}
	],
	projects: [
		{
			name: 'Design Engineering',
			url: '#',
			icon: Frame
		},
		{
			name: 'Sales & Marketing',
			url: '#',
			icon: PieChart
		},
		{
			name: 'Travel',
			url: '#',
			icon: Map
		}
	]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<TeamSwitcher />
				<TeamSwitcherInOrg />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />

				<NavSecondary items={data.navSecondary} />

				<NavProjects projects={data.projects} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	)
}
