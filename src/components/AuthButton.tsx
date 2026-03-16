import { Link } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export default function AuthButton() {
	const session = authClient.useSession();
	const isPending = session.isPending;
	const handleSignOut = async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: async () => {
					// for now, recommend reloading on sign out as Convex client
					// expectAuth only works on initial load
					location.reload();
				},
			},
		});
	};

	if (isPending) {
		return (
			<div className="flex items-center gap-2 rounded-lg bg-(--chip-bg) px-3 py-1.5 text-sm text-(--sea-ink-soft)">
				<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
				Loading...
			</div>
		);
	}

	if (session.data?.user) {
		return (
			<div className="flex items-center gap-2">
				<span className="text-sm text-(--sea-ink-soft)">
					{
						session.data.user.email
						// user.data?.email
					}
				</span>
				<button
					type="button"
					onClick={() => handleSignOut()}
					className="rounded-lg border border-(--line) bg-(--chip-bg) px-3 py-1.5 text-sm font-medium text-(--sea-ink) transition hover:bg-(--link-bg-hover)"
				>
					Sign Out
				</button>
			</div>
		);
	}

	return (
		<div className="flex items-center gap-2">
			<Link
				to="/login"
				search={{ mode: "signup" }}
				className="rounded-lg border border-(--line) bg-(--chip-bg) px-3 py-1.5 text-sm font-medium text-(--sea-ink) no-underline transition hover:bg-(--link-bg-hover)"
			>
				Sign Up
			</Link>
			<Link
				to="/login"
				search={{ mode: "signin" }}
				className="rounded-lg border border-(--sea-ink) bg-(--sea-ink) px-3 py-1.5 text-sm font-medium text-white no-underline transition hover:opacity-90"
			>
				Sign In
			</Link>
		</div>
	);
}
