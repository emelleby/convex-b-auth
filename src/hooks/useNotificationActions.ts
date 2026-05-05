import type { Id } from '¤/_generated/dataModel'
import { useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { useState } from 'react'
import { authClient } from '@/lib/auth-client'
import { api } from '../../convex/_generated/api'

export function useNotificationActions() {
	const [processingId, setProcessingId] = useState<string | null>(null)
	const { data: activeOrg } = authClient.useActiveOrganization()
	const cancelJoinRequest = useMutation(api.joinRequests.cancelJoinRequest)
	const approveJoinRequestMut = useMutation(api.joinRequests.approveJoinRequest)
	const rejectJoinRequestMut = useMutation(api.joinRequests.rejectJoinRequest)
	const navigate = useNavigate()

	const acceptInvitation = async (
		invitationId: string,
		orgId: string,
		shouldNavigate = true
	) => {
		try {
			setProcessingId(invitationId)
			await authClient.organization.acceptInvitation({ invitationId })

			// Auto switch if no active org
			if (!activeOrg?.id) {
				await authClient.organization.setActive({ organizationId: orgId })
				if (shouldNavigate) {
					navigate({ to: '/app' })
				}
			}
		} finally {
			setProcessingId(null)
		}
	}

	const declineInvitation = async (invitationId: string) => {
		try {
			setProcessingId(invitationId)
			await authClient.organization.rejectInvitation({ invitationId })
		} finally {
			setProcessingId(null)
		}
	}

	const handleCancelRequest = async (requestId: Id<'joinRequest'>) => {
		try {
			setProcessingId(requestId)
			await cancelJoinRequest({ requestId })
		} finally {
			setProcessingId(null)
		}
	}

	const switchToOrg = async (orgId: string) => {
		await authClient.organization.setActive({ organizationId: orgId })
		navigate({ to: '/app' })
	}

	const approveJoinRequest = async (requestId: Id<'joinRequest'>) => {
		try {
			setProcessingId(requestId)
			await approveJoinRequestMut({ requestId })
		} finally {
			setProcessingId(null)
		}
	}

	const rejectJoinRequest = async (requestId: Id<'joinRequest'>) => {
		try {
			setProcessingId(requestId)
			await rejectJoinRequestMut({ requestId })
		} finally {
			setProcessingId(null)
		}
	}

	return {
		processingId,
		acceptInvitation,
		declineInvitation,
		handleCancelRequest,
		switchToOrg,
		approveJoinRequest,
		rejectJoinRequest
	}
}
