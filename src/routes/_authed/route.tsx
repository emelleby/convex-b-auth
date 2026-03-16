import { convexQuery } from "@convex-dev/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/_authed")({
	beforeLoad: ({ context }) => {
		if (!context.isAuthenticated) {
			console.log("redirecting to /sign-in");
			throw redirect({ to: "/login" });
		}
	},
	component: RouteComponent,
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				convexQuery(api.auth.getCurrentUser, {}),
			),
			// context.queryClient.ensureQueryData(convexQuery(api.todos.get, {})),
		]);
	},
});

function RouteComponent() {
	return (
		<main className="flex flex-col">
			<div className="max-w-4xl mx-auto w-full">
				<Outlet />
			</div>
		</main>
	);
}
