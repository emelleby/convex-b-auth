import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { authComponent } from './auth'
import { components } from './_generated/api'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'

// Helper to require authentication
async function requireAuth(ctx: GenericCtx<DataModel>) {
	const user = await authComponent.getAuthUser(ctx)
	if (!user) {
		throw new Error('Authentication required')
	}
	return user
}

/**
 * List pending invitations for an organization.
 * Only org admins/owners can view this.
 */
export const listPendingInvitations = query({
	args: {
		organizationId: v.string(),
	},
	handler: async (ctx, args) => {
		await requireAuth(ctx)

		// Query the invitation table via Better-Auth component adapter
		const result = await ctx.runQuery(
			components.betterAuth.adapter.findMany,
			{
				model: 'invitation',
				where: [
					{ field: 'organizationId', value: args.organizationId },
					{ field: 'status', value: 'pending' }
				],
				paginationOpts: {
					numItems: 1000,
					cursor: null
				}
			}
		)

		return result.page
	},
})

/**
 * List all invitations for an organization (any status).
 * Only org admins/owners can view this.
 */
export const listAllInvitations = query({
	args: {
		organizationId: v.string(),
	},
	handler: async (ctx, args) => {
		await requireAuth(ctx)

		// Query the invitation table via Better-Auth component adapter
		const result = await ctx.runQuery(
			components.betterAuth.adapter.findMany,
			{
				model: 'invitation',
				where: [{ field: 'organizationId', value: args.organizationId }],
				paginationOpts: {
					numItems: 1000,
					cursor: null
				}
			}
		)

		return result.page
	},
})

/**
 * Get a single invitation by ID.
 */
export const getInvitation = query({
	args: {
		invitationId: v.string(),
	},
	handler: async (ctx, args) => {
		await requireAuth(ctx)

		const invitation = await ctx.runQuery(
			components.betterAuth.adapter.findOne,
			{
				model: 'invitation',
				where: [{ field: 'id', value: args.invitationId }]
			}
		)

		return invitation
	},
})

/**
 * Cancel an invitation by updating its status to 'canceled'.
 */
export const cancelInvitation = mutation({
	args: {
		invitationId: v.string(),
	},
	handler: async (ctx, args) => {
		await requireAuth(ctx)

		// Update the invitation status to 'canceled'
		const result = await ctx.runMutation(
			components.betterAuth.adapter.updateOne,
			{
				input: {
					model: 'invitation',
					where: [{ field: '_id', value: args.invitationId }],
					update: { status: 'canceled' }
				}
			}
		)

		return result
	},
})

