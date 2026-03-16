import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { DefaultCatchBoundary } from "./components/DefaultCatchBoundary";
import { NotFound } from "./components/NotFound";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,
		defaultErrorComponent: DefaultCatchBoundary,
		defaultNotFoundComponent: () => <NotFound />,
		context: getContext(),

		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
