import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/app/organization')({
	component: RouteComponent
})

function RouteComponent() {
	return <div>Hello "Organization"!</div>
}
