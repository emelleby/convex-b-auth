import { z } from "zod";

export const TodoSchema = z.object({
	id: z.string(),
	name: z.string(),
});
