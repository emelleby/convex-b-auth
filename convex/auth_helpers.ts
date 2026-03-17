import { authComponent } from './auth'
import type { GenericCtx } from '@convex-dev/better-auth'
import type { DataModel } from './_generated/dataModel'

// Helper to require authentication
export async function requireAuth(ctx: GenericCtx<DataModel>) {
  const user = await authComponent.getAuthUser(ctx)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}
