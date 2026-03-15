import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import LoginSignupForm from "@/components/mvpblocks/login-signup";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../convex/_generated/api";

const loginSearchSchema = z.object({
	mode: z.enum(["signup", "signin"]).optional(),
});

export const Route = createFileRoute("/demo/login")({
	ssr: false,
	validateSearch: loginSearchSchema,
	component: LoginPage,
});

function LoginPage() {
	const session = authClient.useSession();
	const navigate = useNavigate();
	const search = Route.useSearch();
	const isAuthenticated = !!session.data?.user;
	const isPending = session.isPending;

	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isSignUp, setIsSignUp] = useState(search.mode === "signup");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [name, setName] = useState("");

	const syncUser = useMutation(api.users.syncUser);

	// Sync isSignUp state with URL search parameter
	useEffect(() => {
		if (search.mode === "signup") {
			setIsSignUp(true);
		} else if (search.mode === "signin") {
			setIsSignUp(false);
		}
	}, [search.mode]);

	// Redirect authenticated users away from login page
	useEffect(() => {
		if (isAuthenticated && !isPending) {
			navigate({ to: "/demo/auth" });
		}
	}, [isAuthenticated, isPending, navigate]);

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		try {
			if (isSignUp) {
				const result = await authClient.signUp.email({
					email,
					password,
					name: name || email.split("@")[0],
				});
				if (result.error) {
					setError(result.error.message || "Sign up failed");
				} else if (result.data?.user) {
					await syncUser({
						email: result.data.user.email,
						name: result.data.user.name ?? (name || email.split("@")[0]),
						betterAuthId: result.data.user.id,
						isSignUp: true,
					});
					// Navigation will happen via useEffect
				}
			} else {
				const result = await authClient.signIn.email({ email, password });
				if (result.error) {
					setError(result.error.message || "Sign in failed");
				} else if (result.data?.user) {
					await syncUser({
						email: result.data.user.email,
						name: result.data.user.name ?? email.split("@")[0],
						betterAuthId: result.data.user.id,
						isSignUp: false,
					});
					// Navigation will happen via useEffect
				}
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Authentication failed");
		} finally {
			setIsLoading(false);
		}
	};

	// Show loading state while checking authentication
	if (isPending) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
			</div>
		);
	}

	// Don't render the form if already authenticated (will redirect)
	if (isAuthenticated) {
		return null;
	}

	return (
		<LoginSignupForm
			email={email}
			onEmailChange={setEmail}
			password={password}
			onPasswordChange={setPassword}
			name={name}
			onNameChange={setName}
			isSignUp={isSignUp}
			onToggleMode={() => setIsSignUp(!isSignUp)}
			onSubmit={handleAuth}
			isLoading={isLoading}
			error={error}
		/>
	);
}
