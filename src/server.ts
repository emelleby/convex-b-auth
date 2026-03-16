import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";
import { paraglideMiddleware } from "./paraglide/server.js";

const handler = createStartHandler(defaultStreamHandler);

console.log(
	"[server.ts] Custom server entry loaded — paraglideMiddleware is active",
);

export default {
	async fetch(req: Request): Promise<Response> {
		console.log(`[server.ts] fetch called: ${req.method} ${req.url}`);
		return paraglideMiddleware(req, ({ locale }) => {
			console.log(`[server.ts] paraglideMiddleware resolved locale: ${locale}`);
			// TanStack Router handles URL rewriting via deLocalizeUrl/localizeUrl,
			// so we pass the original `req` to the handler instead of the
			// delocalized `request` from the middleware callback.
			return handler(req);
		});
	},
};
