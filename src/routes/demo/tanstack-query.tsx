import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle2,
	Pencil,
	Plus,
	Trash2,
	Users,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

export const Route = createFileRoute("/demo/tanstack-query")({
	ssr: false,
	component: TanStackQueryDemo,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type Person = {
	_id: Id<"people">;
	_creationTime: number;
	name: string;
};

type Toast = { id: number; message: string; type: "success" | "error" };

// ─── Skeleton ────────────────────────────────────────────────────────────────

function PersonSkeleton() {
	return (
		<div className="flex items-center gap-3 p-4 animate-pulse">
			<div className="h-9 w-9 rounded-full bg-white/20 shrink-0" />
			<div className="flex-1 space-y-2">
				<div className="h-4 bg-white/20 rounded w-1/3" />
			</div>
			<div className="h-8 w-16 bg-white/20 rounded-lg" />
			<div className="h-8 w-16 bg-white/20 rounded-lg" />
		</div>
	);
}

// ─── Avatar initial bubble ────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
	const initials = name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
	return (
		<div className="h-9 w-9 rounded-full bg-purple-500/60 border border-purple-300/40 flex items-center justify-center shrink-0 text-sm font-semibold text-white">
			{initials}
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

function TanStackQueryDemo() {
	const queryClient = useQueryClient();

	// ── Convex mutation runners ─────────────────────────────────────────────────
	const convexAdd = useConvexMutation(api.people.add);
	const convexUpdate = useConvexMutation(api.people.update);
	const convexRemove = useConvexMutation(api.people.remove);

	// ── Query ────────────────────────────────────────────────────────────────────
	const peopleQueryOptions = convexQuery(api.people.list, {});
	const {
		data: people,
		isLoading,
		isError,
		error,
	} = useQuery(peopleQueryOptions);

	// ── Local state ──────────────────────────────────────────────────────────────
	const [newName, setNewName] = useState("");
	const [editPerson, setEditPerson] = useState<Person | null>(null);
	const [editName, setEditName] = useState("");
	const [toasts, setToasts] = useState<Toast[]>([]);
	let toastId = 0;

	function showToast(message: string, type: "success" | "error" = "success") {
		const id = ++toastId;
		setToasts((prev) => [...prev, { id, message, type }]);
		setTimeout(
			() => setToasts((prev) => prev.filter((t) => t.id !== id)),
			3000,
		);
	}

	// ── Optimistic helpers ───────────────────────────────────────────────────────
	const qKey = peopleQueryOptions.queryKey;

	// ── Add mutation ─────────────────────────────────────────────────────────────
	const addMutation = useMutation({
		mutationFn: (name: string) => convexAdd({ name }),
		onMutate: async (name) => {
			await queryClient.cancelQueries({ queryKey: qKey });
			const prev = queryClient.getQueryData<Person[]>(qKey);
			queryClient.setQueryData<Person[]>(qKey, (old) => [
				...(old ?? []),
				{
					_id: `optimistic-${Date.now()}` as Id<"people">,
					_creationTime: Date.now(),
					name,
				},
			]);
			return { prev };
		},
		onError: (_err, _name, ctx) => {
			queryClient.setQueryData(qKey, ctx?.prev);
			showToast("Failed to add person", "error");
		},
		onSuccess: () => showToast("Person added!"),
		onSettled: () => queryClient.invalidateQueries({ queryKey: qKey }),
	});

	// ── Update mutation ───────────────────────────────────────────────────────────
	const updateMutation = useMutation({
		mutationFn: ({ id, name }: { id: Id<"people">; name: string }) =>
			convexUpdate({ id, name }),
		onMutate: async ({ id, name }) => {
			await queryClient.cancelQueries({ queryKey: qKey });
			const prev = queryClient.getQueryData<Person[]>(qKey);
			queryClient.setQueryData<Person[]>(qKey, (old) =>
				(old ?? []).map((p) => (p._id === id ? { ...p, name } : p)),
			);
			return { prev };
		},
		onError: (_err, _vars, ctx) => {
			queryClient.setQueryData(qKey, ctx?.prev);
			showToast("Failed to update person", "error");
		},
		onSuccess: () => showToast("Person updated!"),
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: qKey });
			setEditPerson(null);
		},
	});

	// ── Remove mutation ───────────────────────────────────────────────────────────
	const removeMutation = useMutation({
		mutationFn: (id: Id<"people">) => convexRemove({ id }),
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: qKey });
			const prev = queryClient.getQueryData<Person[]>(qKey);
			queryClient.setQueryData<Person[]>(qKey, (old) =>
				(old ?? []).filter((p) => p._id !== id),
			);
			return { prev };
		},
		onError: (_err, _id, ctx) => {
			queryClient.setQueryData(qKey, ctx?.prev);
			showToast("Failed to delete person", "error");
		},
		onSuccess: () => showToast("Person removed!"),
		onSettled: () => queryClient.invalidateQueries({ queryKey: qKey }),
	});

	// ── Handlers ──────────────────────────────────────────────────────────────────
	function handleAdd() {
		const name = newName.trim();
		if (!name) return;
		addMutation.mutate(name);
		setNewName("");
	}

	function openEdit(person: Person) {
		setEditPerson(person);
		setEditName(person.name);
	}

	function handleUpdate() {
		if (!editPerson || !editName.trim()) return;
		updateMutation.mutate({ id: editPerson._id, name: editName.trim() });
	}

	// ── Render ────────────────────────────────────────────────────────────────────
	return (
		<div
			className="min-h-screen flex items-center justify-center p-4 text-white"
			style={{
				backgroundImage:
					"radial-gradient(50% 50% at 95% 5%, #f4a460 0%, #8b4513 70%, #1a0f0a 100%)",
			}}
		>
			{/* Toast stack */}
			<div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
				{toasts.map((t) => (
					<div
						key={t.id}
						className={`flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium backdrop-blur-md border transition-all duration-300 ${
							t.type === "success"
								? "bg-green-900/80 border-green-500/40 text-green-100"
								: "bg-red-900/80 border-red-500/40 text-red-100"
						}`}
					>
						{t.type === "success" ? (
							<CheckCircle2 size={15} />
						) : (
							<AlertCircle size={15} />
						)}
						{t.message}
					</div>
				))}
			</div>

			<div className="w-full max-w-2xl space-y-5">
				{/* Header */}
				<div className="rounded-2xl backdrop-blur-md bg-black/40 border border-white/10 shadow-2xl p-8 text-center">
					<div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-500/30 border border-purple-400/30 mb-4">
						<Users size={26} className="text-purple-200" />
					</div>
					<h1 className="text-3xl font-bold tracking-tight">
						People Directory
					</h1>
					<p className="text-white/60 mt-1 text-sm">
						TanStack Query · Convex · Optimistic Updates
					</p>
					{people && people.length > 0 && (
						<div className="mt-3 inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1 text-xs text-white/70">
							<span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
							{people.length} {people.length === 1 ? "person" : "people"}
						</div>
					)}
				</div>

				{/* Add person */}
				<div className="rounded-2xl backdrop-blur-md bg-black/40 border border-white/10 shadow-xl p-5">
					<div className="flex gap-2">
						<Input
							value={newName}
							onChange={(e) => setNewName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleAdd()}
							placeholder="Enter a name…"
							className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/30"
						/>
						<Button
							onClick={handleAdd}
							disabled={!newName.trim() || addMutation.isPending}
							className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 disabled:opacity-50"
						>
							<Plus size={16} />
							{addMutation.isPending ? "Adding…" : "Add"}
						</Button>
					</div>
				</div>

				{/* Error state */}
				{isError && (
					<div className="rounded-2xl backdrop-blur-md bg-red-900/40 border border-red-500/30 shadow-xl p-5 flex items-center gap-3 text-red-200">
						<AlertCircle size={20} className="shrink-0" />
						<div>
							<p className="font-semibold text-sm">Failed to load people</p>
							<p className="text-xs text-red-300/80 mt-0.5">
								{(error as Error)?.message ?? "Unknown error"}
							</p>
						</div>
					</div>
				)}

				{/* People list */}
				<div className="rounded-2xl backdrop-blur-md bg-black/40 border border-white/10 shadow-xl overflow-hidden">
					{isLoading ? (
						<div className="divide-y divide-white/10">
							{(["sk-a", "sk-b", "sk-c"] as const).map((k) => (
								<PersonSkeleton key={k} />
							))}
						</div>
					) : !people || people.length === 0 ? (
						<div className="p-12 text-center">
							<Users size={40} className="text-white/20 mx-auto mb-3" />
							<p className="text-white/50 font-medium">No people yet</p>
							<p className="text-white/30 text-sm mt-1">
								Add someone above to get started
							</p>
						</div>
					) : (
						<div className="divide-y divide-white/10">
							{people.map((person) => (
								<div
									key={person._id}
									className="flex items-center gap-3 p-4 hover:bg-white/5 transition-colors group"
								>
									<Avatar name={person.name} />
									<span className="flex-1 font-medium text-white/90">
										{person.name}
									</span>
									<div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
										<Button
											size="sm"
											variant="ghost"
											onClick={() => openEdit(person)}
											className="text-white/60 hover:text-white hover:bg-white/10 h-8 px-2.5"
										>
											<Pencil size={14} />
											Edit
										</Button>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => removeMutation.mutate(person._id)}
											disabled={removeMutation.isPending}
											className="text-red-400/70 hover:text-red-300 hover:bg-red-500/10 h-8 px-2.5"
										>
											<Trash2 size={14} />
											Delete
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Footer */}
				<p className="text-center text-white/30 text-xs">
					Live subscription via Convex WebSocket · Real-time across all clients
				</p>
			</div>

			{/* Edit dialog */}
			<Dialog
				open={!!editPerson}
				onOpenChange={(open) => !open && setEditPerson(null)}
			>
				<DialogContent className="bg-zinc-900 border-white/10 text-white max-w-sm">
					<DialogHeader>
						<DialogTitle className="text-white">Edit person</DialogTitle>
					</DialogHeader>
					<Input
						value={editName}
						onChange={(e) => setEditName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
						placeholder="Name…"
						autoFocus
						className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus-visible:border-purple-400 focus-visible:ring-purple-400/30"
					/>
					<DialogFooter>
						<Button
							variant="ghost"
							onClick={() => setEditPerson(null)}
							className="text-white/60 hover:text-white hover:bg-white/10"
						>
							Cancel
						</Button>
						<Button
							onClick={handleUpdate}
							disabled={!editName.trim() || updateMutation.isPending}
							className="bg-purple-600 hover:bg-purple-500 text-white"
						>
							{updateMutation.isPending ? "Saving…" : "Save changes"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
