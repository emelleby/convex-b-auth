# Engineering Principles

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative. Brevity is KING**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code or comments unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

Do not overtest. Only run tests that you have written yourself for this specific TDD cycle.

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
---

## Better Auth with Convex Adapter

### Identifying and Querying Database Records
- **ID Field Names:** The internal Better-Auth API uses `id` conceptually, but because we are using the **Convex Adapter**, the database documents refer to their primary key as `_id` (Convex's native ID field).
- **Queries:** When performing raw adapter queries or mutations via `ctx.runQuery` or `ctx.runMutation` with the generated `components.betterAuth.adapter`, make sure to use `_id` when targeting the ID field directly. 
  - *Example:* `where: [{ field: "_id", value: team.id as any }]`

### Type System Notes
- Be careful with typecasting context in Better Auth hooks (`afterCreateOrganization`, `beforeDeleteOrganization`). Often, you'll need to use assertions like `const actionCtx = ctx as unknown as GenericActionCtx<DataModel>` to interact with the Convex database.

### Caveats
1. "When using findMany from components.betterAuth.adapter, it returns PaginatedResult (use .page) and requires paginationOpts."
2. "When chaining queries inside hooks, remember the result is a Convex document _id, not an abstract Better Auth id."
3. "Double-check the adapter's .d.ts types via terminal to see if the adapter function requires an input: {} wrapper or flat arguments."



---
