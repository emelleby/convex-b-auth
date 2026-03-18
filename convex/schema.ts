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
    status: v.string(), // 'pending' | 'approved' | 'rejected'
    reviewedBy: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_userId', ['userId'])
    .index('by_status_and_organizationId', ['status', 'organizationId']),
})
