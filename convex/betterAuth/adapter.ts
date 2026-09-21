import { createApi } from '@convex-dev/better-auth'
import { createAuthOptions } from './auth'
import schema from './schema'

export const {
  create,
  findOne,
  findMany,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany,
} = createApi(schema, createAuthOptions)

import { v } from 'convex/values'
import { query } from './_generated/server'

export const search = query({
  args: {
    model: v.string(),
    query: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.model === 'organization') {
      return await ctx.db
        .query('organization')
        .withSearchIndex('search_name', (q) => q.search('name', args.query))
        .take(args.limit)
    }
    return []
  },
})

export const getById = query({
  args: {
    model: v.string(),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id as any)
  },
})


