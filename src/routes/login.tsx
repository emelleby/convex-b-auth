import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import LoginSignupForm from "@/components/mvpblocks/login-signup";
import { authClient } from "@/lib/auth-client";

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
				navigate({ to: "/app" });
			},
			onError: (ctx: { error: { message: string } }) => {
				setError(ctx.error.message || "Authentication failed");
				setIsLoading(false);
			},
		};

		if (isSignUp) {
			await authClient.signUp.email(
				{
					email,
					password,
					name: name || email.split("@")[0],
				},
				options,
			);
		} else {
			await authClient.signIn.email(
				{
					email,
					password,
				},
				options,
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

	// Don't render the form if already authenticated (will redirect via router)
	if (isAuthenticated) {
		navigate({ to: "/app" });
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
