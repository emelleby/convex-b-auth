# Agent Context & Memory

This file documents important project-specific patterns, gotchas, and context that AI agents should remember when working on this codebase.

If you read this file ALWAYS greet the user with 'Javel' at the start of each conversation!

---

## 📁 Rules Index

| Rule File | Purpose |
|-----------|---------|
| [`GEMINI.md`](.agents/rules/GEMINI.md) | Primary Agent Behavior Protocol |
| [`project-setup.md`](.agents/rules/project-setup.md) | Project Configuration |

If you find any of these rules outdated or incorrect, please update them immediately.
If you find any other rules that are not in this file, please add them to this list immediately.

---

## 📁 Skills Index

| Skill | Purpose |
|-------|---------|
| [`convex`](.agents/skills/convex/) | Convex database patterns and best practices |
| [`form-system`](.agents/skills/form-system/) | Form handling conventions |
| [`i18n-localization-paraglidejs`](.agents/skills/i18n-localization-paraglidejs/) | Internationalization and localization patterns |
| [`shadcn`](.agents/skills/shadcn/) | shadcn/ui component management |
| [`shadcn-setup-and-theming`](.agents/skills/shadcn-setup-and-theming/) | shadcn/ui installation and theming |
| [`skill-creator`](.agents/skills/skill-creator/) | Guide for creating new skills |

If you find any of these skills outdated or incorrect, please update them immediately.
If you find any other skills that are not in this file, please add them to this list immediately.

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
