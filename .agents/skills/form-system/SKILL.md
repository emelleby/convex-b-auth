---
name: form-system
description: Fast decision guide for the repository's primary useAppForm conventions and the secondary raw useForm reference.
---

# Form System Skill

## Purpose

This repo documents two form approaches:

- **Primary:** `useAppForm` for normal app forms, including small dialogs and drawers
- **Secondary:** raw `useForm` for low-level or reference-only work

Default to `useAppForm`.

## Reference Map

- `references/Form-System-Conventions.md` — **primary / authoritative**
- `references/shadcn-tanstack-form.md` — **secondary / generic reference**

If the two docs conflict, `references/Form-System-Conventions.md` wins.

## Approach Selection

- Use **`useAppForm`** for new forms, existing app forms, and repository consistency.
- Size alone is **not** a reason to switch away from `useAppForm`; small product forms should still use it.
- Use **raw `useForm`** only for low-level primitives, upstream example translation, or deliberate escape hatches.

## Activation

This skill activates when:

- Creating or modifying app forms
- Touching `@/hooks/tanstack-form`, `useAppForm`, `form.AppField`, `form.AppForm`, or `form.SubmitButton`
- Touching raw `useForm` code or TanStack/shadcn form examples
- Implementing validation, focus management, dynamic fields, arrays, or submit behavior

## Workflow

1. Start with `references/Form-System-Conventions.md`.
2. Switch to `references/shadcn-tanstack-form.md` only if the task intentionally uses raw `useForm`.
3. Apply one approach consistently.
4. Report which approach you used.

## Key Patterns

### `useAppForm` default

- Use `useAppForm` hook from `@/hooks/tanstack-form`
- Use `form.AppForm`, `form.AppField`, and `form.SubmitButton`
- Validate with `validators` and `revalidateLogic()`
- Handle invalid submit with `onSubmitInvalid: ({ formApi }) => focusFirstError(formApi)`
- Wrap form in `form.AppForm`
- Use an explicit `form.handleSubmit()` wrapper on `<form onSubmit>`
- Use async `onSubmit` as the submission boundary
- Prefer direct Convex mutations or actions for normal writes
- Use `form.SubmitButton` for automatic loading state via `isSubmitting`
- Use TanStack Query mutations only when cache invalidation or optimistic updates are needed
- Use `createServerFn` only for true server-side orchestration

### raw `useForm` secondary

- Use `useForm` from `@tanstack/react-form`
- Compose inputs with `form.Field` and low-level shadcn/ui primitives
- Treat this as reference material or an intentional escape hatch

## Guardrails

- Do not introduce `useServerAction` as a repository convention.
- Do not choose raw `useForm` just because a form is small.
- Do not mix `useAppForm` and raw `useForm` patterns in the same form unless explicitly justified.
- When in doubt, choose the primary `useAppForm` conventions doc.
