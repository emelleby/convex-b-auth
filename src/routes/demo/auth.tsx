import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	Check,
	Circle,
	LogIn,
	LogOut,
	Plus,
	Shield,
	Trash2,
	User,
} from "lucide-react";
import { useCallback, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/demo/auth")({
	ssr: false,
	component: AuthProtectedTodos,
});

function AuthProtectedTodos() {
	const session = authClient.useSession();
	const isAuthenticated = !!session.data?.user;
	const isPending = session.isPending;

	// Auth form state
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isSignUp, setIsSignUp] = useState(false);
	const [authError, setAuthError] = useState<string | null>(null);
	const [isAuthLoading, setIsAuthLoading] = useState(false);

	const handleAuth = async (e: React.FormEvent) => {
		e.preventDefault();
		setAuthError(null);
		setIsAuthLoading(true);

		try {
			if (isSignUp) {
				const result = await authClient.signUp.email({
					email,
					password,
					name: email.split("@")[0],
				});
				if (result.error) {
					setAuthError(result.error.message || "Sign up failed");
				}
			} else {
				const result = await authClient.signIn.email({ email, password });
				if (result.error) {
					setAuthError(result.error.message || "Sign in failed");
				}
			}
		} catch (err) {
			setAuthError(
				err instanceof Error ? err.message : "Authentication failed",
			);
		} finally {
			setIsAuthLoading(false);
		}
	};

	const handleSignOut = async () => {
		await authClient.signOut();
	};

	if (isPending) {
		return (
			<div
				className="min-h-screen flex items-center justify-center"
				style={{
					background:
						"linear-gradient(135deg, #4a5568 0%, #718096 50%, #a0aec0 100%)",
				}}
			>
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
			</div>
		);
	}

	return (
		<div
			className="min-h-screen flex items-center justify-center p-4"
			style={{
				background: isAuthenticated
					? "linear-gradient(135deg, #667a56 0%, #8fbc8f 25%, #90ee90 50%, #98fb98 75%, #f0fff0 100%)"
					: "linear-gradient(135deg, #4a5568 0%, #718096 50%, #a0aec0 100%)",
			}}
		>
			<div className="w-full max-w-2xl">
				{/* Auth Status Header */}
				<div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 p-8 mb-6">
					<div className="text-center">
						<div className="flex justify-center mb-4">
							{isAuthenticated ? (
								<Shield className="h-12 w-12 text-green-500" />
							) : (
								<User className="h-12 w-12 text-gray-400" />
							)}
						</div>
						<h1
							className="text-4xl font-bold mb-2"
							style={{
								color: isAuthenticated ? "#276749" : "#4a5568",
							}}
						>
							{isAuthenticated ? "Protected Todos" : "Sign In Required"}
						</h1>
						<p
							className="text-lg"
							style={{
								color: isAuthenticated ? "#38a169" : "#718096",
							}}
						>
							{isAuthenticated
								? `Welcome, ${session.data?.user.email}`
								: "Please sign in to access your todos"}
						</p>
					</div>
				</div>

				{isAuthenticated ? (
					<>
						<div className="bg-white/95 backdrop-blur-sm rounded-xl p-4 mb-6 flex justify-end">
							<button
								onClick={handleSignOut}
								className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
							>
								<LogOut size={18} />
								Sign Out
							</button>
						</div>
						<TodoList />
					</>
				) : (
					<AuthForm
						email={email}
						password={password}
						isSignUp={isSignUp}
						authError={authError}
						isLoading={isAuthLoading}
						onEmailChange={setEmail}
						onPasswordChange={setPassword}
						onToggleMode={() => setIsSignUp(!isSignUp)}
						onSubmit={handleAuth}
					/>
				)}
			</div>
		</div>
	);
}

// Auth Form Component
function AuthForm({
	email,
	password,
	isSignUp,
	authError,
	isLoading,
	onEmailChange,
	onPasswordChange,
	onToggleMode,
	onSubmit,
}: {
	email: string;
	password: string;
	isSignUp: boolean;
	authError: string | null;
	isLoading: boolean;
	onEmailChange: (v: string) => void;
	onPasswordChange: (v: string) => void;
	onToggleMode: () => void;
	onSubmit: (e: React.FormEvent) => void;
}) {
	return (
		<div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-8">
			<form onSubmit={onSubmit} className="space-y-4">
				<input
					type="email"
					value={email}
					onChange={(e) => onEmailChange(e.target.value)}
					placeholder="Email"
					required
					className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
				/>
				<input
					type="password"
					value={password}
					onChange={(e) => onPasswordChange(e.target.value)}
					placeholder="Password"
					required
					minLength={8}
					className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-blue-400 focus:outline-none"
				/>
				{authError && <p className="text-red-500 text-sm">{authError}</p>}
				<button
					type="submit"
					disabled={isLoading}
					className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2"
				>
					{isLoading ? (
						<div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
					) : (
						<LogIn size={20} />
					)}
					{isSignUp ? "Sign Up" : "Sign In"}
				</button>
			</form>
			<button
				onClick={onToggleMode}
				className="w-full mt-4 text-blue-500 hover:underline"
			>
				{isSignUp
					? "Already have an account? Sign In"
					: "Don't have an account? Sign Up"}
			</button>
		</div>
	);
}

// Todo List Component (only rendered when authenticated)
function TodoList() {
	const todos = useQuery(api.todos.list);
	const addTodo = useMutation(api.todos.add);
	const toggleTodo = useMutation(api.todos.toggle);
	const removeTodo = useMutation(api.todos.remove);
	const [newTodo, setNewTodo] = useState("");

	const handleAddTodo = useCallback(async () => {
		if (newTodo.trim()) {
			await addTodo({ text: newTodo.trim() });
			setNewTodo("");
		}
	}, [addTodo, newTodo]);

	return (
		<>
			<div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6">
				<div className="flex gap-3">
					<input
						type="text"
						value={newTodo}
						onChange={(e) => setNewTodo(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleAddTodo();
						}}
						placeholder="What needs to be done?"
						className="flex-1 px-4 py-3 rounded-xl border-2 border-green-200 focus:border-green-400 focus:outline-none"
					/>
					<button
						onClick={handleAddTodo}
						disabled={!newTodo.trim()}
						className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2"
					>
						<Plus size={20} />
						Add
					</button>
				</div>
			</div>
			<div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
				{!todos ? (
					<div className="p-8 text-center">
						<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto" />
					</div>
				) : todos.length === 0 ? (
					<div className="p-12 text-center">
						<Circle size={48} className="text-green-300 mx-auto mb-4" />
						<p>No todos yet</p>
					</div>
				) : (
					<div className="divide-y divide-green-100">
						{todos.map((todo) => (
							<div
								key={todo._id}
								className="p-4 flex items-center gap-4 hover:bg-green-50/50"
							>
								<button
									onClick={() => toggleTodo({ id: todo._id })}
									className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${todo.completed ? "bg-green-500 border-green-500 text-white" : "border-green-300"}`}
								>
									<Check size={14} />
								</button>
								<span
									className={`flex-1 ${todo.completed ? "line-through text-gray-500" : ""}`}
								>
									{todo.text}
								</span>
								<button
									onClick={() => removeTodo({ id: todo._id })}
									className="p-2 text-red-400 hover:text-red-600"
								>
									<Trash2 size={18} />
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		</>
	);
}
