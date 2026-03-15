import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Check, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/demo/auth")({
	ssr: false,
	component: AuthProtectedTodos,
});

function AuthProtectedTodos() {
	const session = authClient.useSession();
	const navigate = useNavigate();
	const isAuthenticated = !!session.data?.user;
	const isPending = session.isPending;

	// Redirect unauthenticated users to login page
	useEffect(() => {
		if (!isPending && !isAuthenticated) {
			navigate({ to: "/demo/login" });
		}
	}, [isAuthenticated, isPending, navigate]);

	if (isPending) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
			</div>
		);
	}

	// Don't render content if not authenticated (will redirect)
	if (!isAuthenticated) {
		return null;
	}

	return (
		<div className="min-h-screen bg-linear-to-br from-green-50 to-emerald-100 p-4">
			<div className="max-w-3xl mx-auto pt-8">
				<Card className="mb-6">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<h1 className="text-3xl font-bold text-gray-900">
									My Todo List
								</h1>
								<p className="text-sm text-muted-foreground mt-1">
									Welcome, {session.data?.user.email}
								</p>
							</div>
							<Button variant="outline" onClick={() => authClient.signOut()}>
								Sign Out
							</Button>
						</div>
					</CardHeader>
				</Card>

				<TodoList />
			</div>
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
		<div className="space-y-4">
			{/* Add Todo Card */}
			<Card>
				<CardContent className="pt-6">
					<div className="flex gap-3">
						<Input
							type="text"
							value={newTodo}
							onChange={(e) => setNewTodo(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") handleAddTodo();
							}}
							placeholder="What needs to be done?"
							className="flex-1"
						/>
						<Button
							onClick={handleAddTodo}
							disabled={!newTodo.trim()}
							className="gap-2"
						>
							<Plus size={20} />
							Add
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Todo List Card */}
			<Card>
				<CardContent className="p-0">
					{!todos ? (
						<div className="p-8 text-center">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
						</div>
					) : todos.length === 0 ? (
						<div className="p-12 text-center text-muted-foreground">
							<p>No todos yet. Add one to get started!</p>
						</div>
					) : (
						<div className="divide-y">
							{todos.map((todo) => (
								<div
									key={todo._id}
									className="p-4 flex items-center gap-4 hover:bg-accent/50 transition-colors"
								>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => toggleTodo({ id: todo._id })}
										className={`h-6 w-6 rounded-full border-2 p-0 ${
											todo.completed
												? "bg-primary border-primary text-primary-foreground hover:bg-primary/90"
												: "border-muted-foreground/30 hover:border-primary"
										}`}
									>
										{todo.completed && <Check size={14} />}
									</Button>
									<span
										className={`flex-1 ${
											todo.completed
												? "line-through text-muted-foreground"
												: "text-foreground"
										}`}
									>
										{todo.text}
									</span>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => removeTodo({ id: todo._id })}
										className="text-destructive hover:text-destructive hover:bg-destructive/10"
									>
										<Trash2 size={18} />
									</Button>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
