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
  users: defineTable({
    email: v.string(),
    name: v.string(),
    betterAuthId: v.string(),
    lastLogin: v.number(),
  }).index('by_betterAuthId', ['betterAuthId'])
    .index('by_email', ['email']),
})
