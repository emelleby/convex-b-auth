import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/app/invitations')({
  component: InvitationsPage,
})

function InvitationsPage() {
  return <div>Invitations</div>
}
