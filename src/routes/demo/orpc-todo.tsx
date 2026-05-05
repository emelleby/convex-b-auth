import { useMutation, useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useState } from 'react'

import { client, orpc } from '#/orpc/client'

export const Route = createFileRoute('/demo/orpc-todo')({
	component: ORPCTodos,
	loader: async ({ context }) => {
		await context.queryClient.prefetchQuery(
			orpc.listTodos.queryOptions({
				input: {}
			})
		)
	}
})

function ORPCTodos() {
	const { data, refetch } = useQuery(
		orpc.listTodos.queryOptions({
			input: {}
		})
	)

	const [todo, setTodo] = useState('')
	const { mutate: addTodo } = useMutation({
		mutationFn: (variables: { name: string }) => client.addTodo(variables),
		onSuccess: () => {
			refetch()
			setTodo('')
		}
	})

	const submitTodo = useCallback(() => {
		addTodo({ name: todo })
	}, [addTodo, todo])

	return (
		<div
			className="flex flex-col items-center justify-start min-h-screen bg-linear-to-br from-purple-100 to-blue-100 p-8 text-white overflow-y-auto"
			style={{
				backgroundImage:
					'radial-gradient(50% 50% at 50% 50%, #D2149D 0%, #8E1066 50%, #2D0A1F 100%)'
			}}
		>
			<div className="w-full max-w-4xl space-y-8">
				{/* Info Section */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
					<div className="p-6 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 space-y-4">
						<h2 className="text-2xl font-bold text-blue-300">What is oRPC?</h2>
						<p className="text-white/80 leading-relaxed">
							oRPC is a modern framework for building type-safe APIs. It
							combines the simplicity of standard HTTP endpoints with the
							developer experience of tRPC, providing full type safety across
							your entire stack.
						</p>
						<p className="text-white/80 leading-relaxed font-semibold">
							Think of it as the "Universal RPC":
						</p>
						<ul className="list-disc list-inside text-white/70 space-y-2">
							<li>Zero-runtime overhead for type safety</li>
							<li>Standard HTTP/JSON endpoints (OpenAPI compatible)</li>
							<li>Isomorphic: runs on server and client with the same logic</li>
							<li>Works natively with TanStack Query</li>
						</ul>
					</div>

					<div className="p-6 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 space-y-4">
						<h2 className="text-2xl font-bold text-purple-300">This Demo</h2>
						<p className="text-white/80 leading-relaxed">
							In this demo, we've integrated oRPC with <strong>Convex</strong>.
							The frontend calls oRPC procedures, which in turn securely
							interface with our Convex database.
						</p>
						<div className="space-y-3">
							<div className="flex items-start gap-3">
								<div className="bg-blue-500/20 p-2 rounded text-blue-300 font-mono text-xs">
									src/orpc/router
								</div>
								<div className="text-sm text-white/60 pt-1">
									Defines procedures and Zod validation.
								</div>
							</div>
							<div className="flex items-start gap-3">
								<div className="bg-purple-500/20 p-2 rounded text-purple-300 font-mono text-xs">
									src/orpc/client
								</div>
								<div className="text-sm text-white/60 pt-1">
									Initializes isomorphic RPC client.
								</div>
							</div>
							<div className="flex items-start gap-3 border-t border-white/10 pt-3 mt-3">
								<p className="text-xs text-white/50 italic">
									Notice how{' '}
									<code className="text-accent-foreground px-1 rounded">
										orpc.listTodos.queryOptions()
									</code>{' '}
									is used directly in TanStack Query hooks!
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* App Section */}
				<div className="w-full max-w-2xl mx-auto p-8 rounded-xl backdrop-blur-md bg-black/50 shadow-2xl border-2 border-white/10">
					<h1 className="text-3xl font-extrabold mb-6 tracking-tight text-center bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-purple-400">
						oRPC Todo Gallery
					</h1>
					<ul className="mb-4 space-y-2">
						{data?.map((t) => (
							<li
								key={t.id}
								className="bg-white/10 border border-white/20 rounded-lg p-3 backdrop-blur-sm shadow-md"
							>
								<span className="text-lg text-white">{t.name}</span>
							</li>
						))}
					</ul>
					<div className="flex flex-col gap-2">
						<input
							type="text"
							value={todo}
							onChange={(e) => setTodo(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									submitTodo()
								}
							}}
							placeholder="Enter a new todo..."
							className="w-full px-4 py-3 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
						/>
						<button
							type="button"
							disabled={todo.trim().length === 0}
							onClick={submitTodo}
							className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-blue-500/20 active:scale-[0.98]"
						>
							Add todo via oRPC
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
