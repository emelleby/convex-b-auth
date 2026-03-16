import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { z } from "zod";
import LoginSignupForm from "@/components/mvpblocks/login-signup";
import { authClient } from "@/lib/auth-client";
import { api } from "../../convex/_generated/api";

const loginSearchSchema = z.object({
	mode: z.enum(["signup", "signin"]).optional(),
});

export const Route = createFileRoute("/login")({
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

	// Handle successful authentication - sync user and navigate
	const handleAuthSuccess = async (userData: {
		email: string;
		name: string | null;
		id: string;
	}) => {
		try {
			await syncUser({
				email: userData.email,
				name: userData.name ?? (name || email.split("@")[0]),
				betterAuthId: userData.id,
				isSignUp,
			});
			// Use TanStack Router's navigate for declarative navigation
			await navigate({ to: "/app" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to sync user data");
			setIsLoading(false);
		}
	};

	// Handle authentication errors
	const handleAuthError = (errorMessage: string) => {
		setError(errorMessage);
		setIsLoading(false);
	};

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
					handleAuthError(result.error.message || "Sign up failed");
				} else if (result.data?.user) {
					await handleAuthSuccess(result.data.user);
				}
			} else {
				const result = await authClient.signIn.email({
					email,
					password,
				});

				if (result.error) {
					handleAuthError(result.error.message || "Sign in failed");
				} else if (result.data?.user) {
					await handleAuthSuccess(result.data.user);
				}
			}
		} catch (err) {
			handleAuthError(
				err instanceof Error ? err.message : "Authentication failed",
			);
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
