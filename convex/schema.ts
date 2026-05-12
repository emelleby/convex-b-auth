import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  products: defineTable({
    title: v.string(),
    imageId: v.string(),
    price: v.number(),
  }),
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
  people: defineTable({
    name: v.string(),
  }),
  // organization, member, invitation, team, teamMember are owned by the
  // betterAuth component (convex/betterAuth/schema.ts). Do not re-define them here.
  joinRequest: defineTable({
    id: v.string(),
    userId: v.string(),
    organizationId: v.string(),
    message: v.optional(v.string()),
    status: v.string(), // 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired'
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_userId', ['userId'])
    .index('by_status_and_organizationId', ['status', 'organizationId']),
  notification: defineTable({
    userId: v.string(),
    type: v.string(), // 'join_request_approved' | 'join_request_rejected'
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_userId', ['userId'])
    .index('by_userId_and_read', ['userId', 'read']),
  orgSettings: defineTable({
    organizationId: v.string(),
    invitationValidityDays: v.number(),
    joinRequestExpiryDays: v.optional(v.number()),
  })
    .index('by_organizationId', ['organizationId']),
})
