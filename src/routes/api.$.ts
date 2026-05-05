import '#/polyfill'

import { SmartCoercionPlugin } from '@orpc/json-schema'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { onError } from '@orpc/server'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { createFileRoute } from '@tanstack/react-router'
import router from '#/orpc/router'
import { TodoSchema } from '#/orpc/schema'

// ---------------------------------------------------------------------------
// Auth context type
// ---------------------------------------------------------------------------

/**
 * Context passed to every ORPC procedure handler.
 *
 * `token` is the raw bearer token extracted from the Authorization header.
 * Individual procedures that require auth should validate this token using
 * `fetchAuthQuery` / `fetchAuthMutation` from auth-server.ts, which will
 * use the server-side session associated with the token.
 *
 * Future: pass a fully-resolved `user` object here once a token introspection
 * helper is added to auth-server.ts (e.g. `getUserFromToken(token)`).
 */
export type ORPCContext = {
	/** Raw bearer token from Authorization header, undefined if not provided. */
	token: string | undefined
}

// ---------------------------------------------------------------------------
// Token extraction helper
// ---------------------------------------------------------------------------

/**
 * Extracts a bearer token from the Authorization header.
 * Returns undefined if the header is absent or not in "Bearer <token>" format.
 */
function extractBearerToken(request: Request): string | undefined {
	const authHeader = request.headers.get('Authorization')
	if (!authHeader?.startsWith('Bearer ')) return undefined
	const token = authHeader.slice(7).trim()
	return token.length > 0 ? token : undefined
}

const handler = new OpenAPIHandler(router, {
	interceptors: [
		onError((error) => {
			console.error(error)
		})
	],
	plugins: [
		new SmartCoercionPlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()]
		}),
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
			specGenerateOptions: {
				info: {
					title: 'TanStack ORPC Playground',
					version: '1.0.0'
				},
				commonSchemas: {
					Todo: { schema: TodoSchema },
					UndefinedError: { error: 'UndefinedError' }
				},
				security: [{ bearerAuth: [] }],
				components: {
					securitySchemes: {
						bearerAuth: {
							type: 'http',
							scheme: 'bearer'
						}
					}
				}
			},
			docsConfig: {
				authentication: {
					securitySchemes: {
						bearerAuth: {
							token: 'default-token'
						}
					}
				}
			}
		})
	]
})

async function handle({ request }: { request: Request }) {
	// Extract the bearer token and forward it as typed ORPC context.
	// Procedure handlers receive `context.token` and can use it to make
	// authenticated Convex calls. Requests without a token are not rejected
	// here — individual procedures enforce their own auth requirements so that
	// public / optional-auth endpoints remain callable without a token.
	//
	// TODO: Once Better Auth exposes a token-introspection helper, resolve the
	// token to a full user object here and add `context.user` so procedures
	// don't need to validate independently.
	const context: ORPCContext = {
		token: extractBearerToken(request)
	}

	const { response } = await handler.handle(request, {
		prefix: '/api',
		context
	})

	return response ?? new Response('Not Found', { status: 404 })
}

export const Route = createFileRoute('/api/$')({
	server: {
		handlers: {
			HEAD: handle,
			GET: handle,
			POST: handle,
			PUT: handle,
			PATCH: handle,
			DELETE: handle
		}
	}
})
