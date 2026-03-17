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
  organization: defineTable({
    id: v.string(),
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_slug', ['slug']),
  member: defineTable({
    id: v.string(),
    organizationId: v.string(),
    userId: v.string(),
    role: v.string(),
    createdAt: v.number(),
  })
    .index('by_organizationId', ['organizationId'])
    .index('by_userId', ['userId']),
  invitation: defineTable({
    id: v.string(),
    email: v.string(),
    inviterId: v.string(),
    organizationId: v.string(),
    role: v.optional(v.string()),
    teamId: v.optional(v.string()),
    status: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_organizationId', ['organizationId']),
  team: defineTable({
    id: v.string(),
    name: v.string(),
    organizationId: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index('by_organizationId', ['organizationId']),
  teamMember: defineTable({
    id: v.string(),
    teamId: v.string(),
    userId: v.string(),
    role: v.optional(v.string()), // Added role support within teams
    createdAt: v.number(),
  })
    .index('by_teamId', ['teamId'])
    .index('by_userId', ['userId']),
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
