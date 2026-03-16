import { api } from "¤/_generated/api";
import { os } from "@orpc/server";
import * as z from "zod";
import { fetchAuthMutation, fetchAuthQuery } from "#/lib/auth-server";

export const listTodos = os.input(z.object({})).handler(async () => {
	const todos = await fetchAuthQuery(api.todos.list);
	return todos.map((t) => ({ id: t._id as string, name: t.text }));
});

export const addTodo = os
	.input(z.object({ name: z.string() }))
	.handler(async ({ input }) => {
		const newId = await fetchAuthMutation(api.todos.add, { text: input.name });
		return { id: newId as string, name: input.name };
	});
