import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import LoginSignupForm from "@/components/mvpblocks/login-signup";
import { authClient } from "@/lib/auth-client";

// Helper function to check if a URL is same-origin
function isSameOrigin(url: string): boolean {
	try {
		const parsedUrl = new URL(url);
		// For relative URLs, new URL() will use the current origin
		return parsedUrl.origin === window.location.origin;
	} catch {
		// If URL is invalid, treat as different origin (will redirect to default)
		console.warn("Invalid redirect URL:", url);
		return false;
	}
}

const loginSearchSchema = z.object({
	mode: z.enum(["signup", "signin"]).optional(),
	redirect: z.string().optional(),
});

export const Route = createFileRoute("/_public/login")({
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

	// Sync isSignUp state with URL search parameter
	useEffect(() => {
		if (search.mode === "signup") {
			setIsSignUp(true);
		} else if (search.mode === "signin") {
			setIsSignUp(false);
		}
	}, [search.mode]);

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError(null);

		const options = {
			onSuccess: () => {
				const redirectTo =
					search.redirect && isSameOrigin(search.redirect)
						? search.redirect
						: "/app"
				navigate({ to: redirectTo });
			},
			onError: (ctx: { error: { message: string } }) => {
				setError(ctx.error.message || "Authentication failed");
				setIsLoading(false);
			},
		}

		if (isSignUp) {
			await authClient.signUp.email(
				{
					email,
					password,
					name: name || email.split("@")[0],
				},
				options,
			)
		} else {
			await authClient.signIn.email(
				{
					email,
					password,
				},
				options,
			)
		}
	}

	// Show loading state while checking authentication
	if (isPending) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
			</div>
		)
	}

	// Don't render the form if already authenticated (will redirect via router)
	if (isAuthenticated) {
		const redirectTo =
			search.redirect && isSameOrigin(search.redirect)
				? search.redirect
				: "/app"
		navigate({ to: redirectTo });
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
	)
}
