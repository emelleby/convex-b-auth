// Re-export from the local component so existing importers (http.ts, auth_helpers.ts, etc.)
// continue to work without changes.
export { authComponent, createAuth, options } from './betterAuth/auth'

import { query } from './_generated/server'
import { authComponent } from './betterAuth/auth'

// Convenience query for fetching the current authenticated user.
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    try {
      return await authComponent.getAuthUser(ctx)
    } catch {
      return null
    }
  },
})

