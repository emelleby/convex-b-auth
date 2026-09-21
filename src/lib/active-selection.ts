/**
 * Remembers the last active organization/team in localStorage so the user
 * returns to the same context after logging in again. Better Auth stores
 * activeOrganizationId/activeTeamId on the session record, which resets
 * whenever a new session is created (logout/login).
 */

const STORAGE_KEY = 'activeOrgTeam'

type ActiveSelection = { orgId?: string; teamId?: string }

export function getRememberedSelection(): ActiveSelection {
	if (typeof window === 'undefined') return {}
	try {
		return JSON.parse(
			window.localStorage.getItem(STORAGE_KEY) ?? '{}'
		) as ActiveSelection
	} catch {
		return {}
	}
}

function write(selection: ActiveSelection) {
	if (typeof window === 'undefined') return
	window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection))
}

export function rememberOrg(orgId: string) {
	write({ ...getRememberedSelection(), orgId })
}

export function rememberTeam(orgId: string, teamId: string) {
	write({ ...getRememberedSelection(), orgId, teamId })
}
