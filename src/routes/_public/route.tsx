import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export const Route = createFileRoute("/_public")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<>
			<Header />
			<Outlet />
			<Footer />
		</>
	);
}
