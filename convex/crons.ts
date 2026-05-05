import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

/**
 * Scheduled jobs for background maintenance.
 *
 * All cron jobs must reference `internal.*` functions — they cannot call
 * public API functions from the client-facing API surface.
 */
const crons = cronJobs()

// ---------------------------------------------------------------------------
// Session cleanup
// ---------------------------------------------------------------------------

// Better Auth does not garbage-collect expired sessions automatically.
// Without cleanup the `session` table grows unboundedly, increasing read
// costs on every auth token validation.
//
// Runs at 03:00 UTC on the 1st of every month. Adjust frequency if the
// deployment has a very high signup rate (consider weekly instead).
//
// Implementation: convex/auth.ts → cleanupExpiredSessions
crons.monthly(
  'cleanup expired sessions',
  { day: 1, hourUTC: 3, minuteUTC: 0 },
  internal.auth.cleanupExpiredSessions,
)

export default crons
