import { Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export default function SettingsPage() {
	const navigate = useNavigate();

	const handleDeleteAccount = async () => {
		if (
			window.confirm(
				"Are you sure you want to delete your account? This action cannot be undone.",
			)
		) {
			try {
				await authClient.deleteUser();
				void navigate({ to: "/" });
			} catch {
				alert("Failed to delete account. Please try again.");
			}
		}
	};

	return (
		<div className="min-h-screen w-full flex items-center justify-center p-4">
			<div className="w-full max-w-md space-y-4">
				<Button
					variant="ghost"
					size="sm"
					className="flex items-center gap-2"
					asChild
				>
					<Link to="/">
						<ArrowLeft size={16} />
						Back to Dashboard
					</Link>
				</Button>
				<Card className="w-full">
					<CardHeader>
						<CardTitle className="text-lg md:text-xl">Settings</CardTitle>
						<CardDescription className="text-xs md:text-sm">
							Manage your account settings and security
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-6">
						<div className="grid gap-4">
							<div>
								<h3 className="text-sm font-medium mb-1 flex items-center gap-2">
									Delete Account
									<AlertTriangle size={14} className="text-destructive" />
								</h3>
								<p className="text-sm text-muted-foreground">
									Permanently delete your account and all associated data. This
									action cannot be undone.
								</p>
							</div>
							<div>
								<Button variant="destructive" onClick={handleDeleteAccount}>
									Delete Account
								</Button>
							</div>
						</div>
					</CardContent>
					<CardFooter>
						<div className="flex justify-center w-full border-t py-4">
							<p className="text-center text-xs text-neutral-500">
								Powered by{" "}
								<a
									href="https://better-auth.com"
									className="underline"
									target="_blank"
									rel="noopener noreferrer"
								>
									<span className="dark:text-orange-200/90">better-auth.</span>
								</a>
							</p>
						</div>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}
