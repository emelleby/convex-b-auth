import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function AuthButton() {
	const session = authClient.useSession();
	const isPending = session.isPending;
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSignUp = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await authClient.signUp.email({
				email: "test@example.com",
				password: "password123",
				name: "Test User",
			});
			if (result.error) {
				setError(result.error.message || "Sign up failed");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Sign up failed");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSignIn = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await authClient.signIn.email({
				email: "test@example.com",
				password: "password123",
			});
			if (result.error) {
				setError(result.error.message || "Sign in failed");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Sign in failed");
		} finally {
			setIsLoading(false);
		}
	};

	if (isPending || isLoading) {
		return (
			<div className="flex items-center gap-2 rounded-lg bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink-soft)]">
				<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
				Loading...
			</div>
		);
	}

	if (session.data?.user) {
		return (
			<div className="flex items-center gap-2">
				<span className="text-sm text-[var(--sea-ink-soft)]">
					{session.data.user.email}
				</span>
				<button
					type="button"
					onClick={() => authClient.signOut()}
					className="rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-medium text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)]"
				>
					Sign Out
				</button>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			{error && <span className="text-xs text-red-500">{error}</span>}
			<button
				type="button"
				onClick={handleSignUp}
				className="rounded-lg border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm font-medium text-[var(--sea-ink)] transition hover:bg-[var(--link-bg-hover)]"
			>
				Sign Up
			</button>
			<button
				type="button"
				onClick={handleSignIn}
				className="rounded-lg border border-[var(--sea-ink)] bg-[var(--sea-ink)] px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
			>
				Sign In
			</button>
		</div>
	);
}
