import {
	createStartHandler,
	defaultStreamHandler
} from '@tanstack/react-start/server'
import { paraglideMiddleware } from './paraglide/server.js'

const handler = createStartHandler(defaultStreamHandler)

export default {
	async fetch(req: Request): Promise<Response> {
		return paraglideMiddleware(req, ({ locale }) => {
			// TanStack Router handles URL rewriting via deLocalizeUrl/localizeUrl,
			// so we pass the original `req` to the handler instead of the
			// delocalized `request` from the middleware callback.
			return handler(req)
		})
	}
}
