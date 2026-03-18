# Form System Conventions

## TL;DR

**Primary repository conventions.**

- Use this for new and updated app forms.
- Default to `useAppForm` for product-facing forms, including small dialogs, drawers, and other 2–3 field forms.
- Use raw `useForm` only for low-level primitives, upstream example translation, or deliberate escape hatches.
- Submit through async `onSubmit`; prefer direct Convex mutations or actions for normal writes.
- Use TanStack Query mutations only when cache invalidation, optimistic updates, or richer mutation callbacks matter.
- Use `createServerFn` only for true server-side orchestration.
- `shadcn-tanstack-form.md` is a secondary raw `useForm` reference.
- If the docs conflict, this file wins.

## Core Imports

```typescript
import { revalidateLogic, useStore } from '@tanstack/react-form';
import { useAppForm } from '@/hooks/tanstack-form';
import { focusFirstError } from '@/hooks/use-form';
// Optional: If using FieldGroup directly from UI
import { FieldGroup } from '@/components/ui/field';
```

## Canonical Form Pattern

Default starting point for repository forms, including small product forms such as dialogs.

```typescript
'use client';

import { revalidateLogic, useStore } from '@tanstack/react-form';
import { useAppForm } from '@/hooks/tanstack-form';
import { focusFirstError } from '@/hooks/use-form';
import { FieldGroup } from '@/components/ui/field';
import { entitySchema, type EntityValues } from '@/lib/forms/schemas/entity-schema';

export function EntityForm() {
  const form = useAppForm({
    defaultValues: {
      name: '',
      description: '',
      isPublic: true,
      tags: [],
    } as EntityValues,
    validationLogic: revalidateLogic(),
    validators: {
      onDynamic: entitySchema, // or onSubmit: entitySchema
    },
    onSubmitInvalid: ({ formApi }) => {
      focusFirstError(formApi);
    },
    onSubmit: async ({ value }) => {
      console.log('Submitted:', value);
    },
  });

  return (
    <form.AppForm>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form.AppField name="name">
            {(field) => <field.TextField label="Entity Name" placeholder="Enter name" />}
          </form.AppField>

          <form.AppField name="description">
            {(field) => <field.TextField label="Short Description" />}
          </form.AppField>
        </div>

        <FieldGroup>
          <form.AppField name="isPublic">
            {(field) => (
              <field.SwitchField
                label="Public Access"
                description="Make this visible to everyone"
              />
            )}
          </form.AppField>
        </FieldGroup>

        <div className="flex justify-end">
          <form.SubmitButton label="Save Entity" />
        </div>
      </form>
    </form.AppForm>
  );
}
```

## useAppForm Configuration

This is the preferred form API for large and small product forms in this repository.

### Common Options

```typescript
const form = useAppForm({
  defaultValues: {
    fieldName: 'default value',
  } as FormValues,
  
  onSubmit: async ({ value }) => {
    // Submit to Convex or a server function
  },

  onSubmitInvalid: ({ formApi }) => {
    focusFirstError(formApi); // Focus first error for UX
  },

  validationLogic: revalidateLogic(), // Default revalidation logic

  validators: {
    onDynamic: zodSchema, // Validate as you type/change
    onSubmit: zodSchema,  // Validate on submit
  },
});
```

## Form Components

### AppForm Wrapper

Every form must be wrapped in `form.AppForm` to provide context for sub-components like `SubmitButton`.

```typescript
<form.AppForm>
  <form>...</form>
</form.AppForm>
```

### SubmitButton

The `form.SubmitButton` automatically handles the `isSubmitting` state (showing a spinner and disabling the button) while the async `onSubmit` handler is running.

```typescript
<div className="flex justify-end pt-6">
  <form.SubmitButton label="Submit Changes" />
</div>
```

## Field Components

Field components are accessed via the `field` object provided by `form.AppField`'s render prop. Prefer these bound components before dropping to raw shadcn/ui primitives.

### Common Field Props

All provided field components support:
- `label`: String, required.
- `description`: String, optional help text.
- `hidden`: Boolean, hides the field (useful for internal IDs).
- `type`: String, input type for `TextField` (text, number, email, etc.).
- `focusRef`: Optional custom ref for focus management.
- `isRequired`: Optional required indicator on the label.
- `testId`: Optional override for generated test identifiers.

### TextField
```typescript
<form.AppField name="email">
  {(field) => <field.TextField label="Email Address" type="email" />}
</form.AppField>
```

### SelectField
```typescript
<form.AppField name="category">
  {(field) => (
    <field.SelectField
      label="Category"
      options={[
        { label: 'Option A', value: 'a' },
        { label: 'Option B', value: 'b' },
      ]}
    />
  )}
</form.AppField>
```

### SwitchField
```typescript
<form.AppField name="isActive">
  {(field) => <field.SwitchField label="Is Active?" />}
</form.AppField>
```

### RadioGroupField
```typescript
<form.AppField name="preference">
  {(field) => (
    <field.RadioGroupField
      label="Your Preference"
      options={[
        { label: 'Option 1', value: '1' },
        { label: 'Option 2', value: '2' },
      ]}
    />
  )}
</form.AppField>
```

### ImageField
Used for image selection/upload.
```typescript
<form.AppField name="avatar">
  {(field) => <field.ImageField label="Avatar Image" />}
</form.AppField>
```

### TextareaField
```typescript
<form.AppField name="bio">
  {(field) => <field.TextareaField label="Biography" />}
</form.AppField>
```

### CountryField
Used for country selection, typically using ISO Alpha-3 codes.
```typescript
<form.AppField name="countryCode">
  {(field) => <field.CountryField label="Country" />}
</form.AppField>
```

## Dynamic Rendering & Subscriptions

### form.Subscribe

Use `form.Subscribe` to reactively render parts of the form based on field values.

```typescript
<form.Subscribe selector={(state) => state.values.showDetails}>
  {(showDetails) => showDetails && (
    <FieldGroup>
      {/* Additional fields here */}
    </FieldGroup>
  )}
</form.Subscribe>
```

### Array Fields (Field Arrays)

Handle lists of items using `field.pushValue` and `field.removeValue`.

```typescript
<form.AppField name="items">
  {(field) => (
    <div className="space-y-4">
      {field.state.value.map((item, index) => (
        <div key={item.id} className="flex items-end gap-4">
          <form.AppField name={`items[${index}].name`}>
            {(f) => <f.TextField label="Item Name" />}
          </form.AppField>
          <Button onClick={() => field.removeValue(index)}>Delete</Button>
        </div>
      ))}
      <Button onClick={() => field.pushValue({ id: crypto.randomUUID(), name: '' })}>
        Add Item
      </Button>
    </div>
  )}
</form.AppField>
```

## Extracting Reusable Form Options

For complex forms, extract default values and options to a separate file:

```typescript
// entity-form-options.ts
import type { z } from 'zod';
import { formOptions } from '@tanstack/form-core';
import type { insertEntitySchema } from '@/lib/validations/entity.validation';
import { DEFAULTS } from '@/lib/constants';

export const entityFormOptions = formOptions({
  defaultValues: {
    name: '',
    description: '',
    priority: DEFAULTS.ENTITY.PRIORITY.toString(),
    isActive: DEFAULTS.ENTITY.IS_ACTIVE,
  } as z.input<typeof insertEntitySchema>,
});

// entity-form.tsx
import { entityFormOptions } from './entity-form-options';

const form = useAppForm({
  ...entityFormOptions,
  onSubmit: async ({ value }) => {
    /* ... */
  },
  onSubmitInvalid: ({ formApi }) => {
    /* ... */
  },
  validators: { onSubmit: insertEntitySchema },
});
```

## Field Listeners

Use `listeners` prop on `form.AppField` for field-level side effects:

```typescript
<form.AppField
  listeners={{
    onChange: ({ value }) => {
      // Reset dependent field when this field changes
      form.setFieldValue('dependentField', '');
    },
    onBlur: ({ value }) => {
      // Trigger validation or API call on blur
    },
  }}
  name={'contentType'}
>
  {(field) => (
    <field.SelectField
      label={'Content Type'}
      options={options}
    />
  )}
</form.AppField>
```

## Programmatic Field Operations

```typescript
// Set field value programmatically
form.setFieldValue('fieldName', newValue);

// Validate a specific field
await form.validateField('fieldName', 'change');

// Example: Update multiple fields after API response
const handleContentSelect = async (contentId: string, contentName: string, imageUrl?: string) => {
  form.setFieldValue('contentId', contentId);
  await form.validateField('contentId', 'change');

  if (!currentTitle) {
    form.setFieldValue('title', `Featured: ${contentName}`);
    await form.validateField('title', 'change');
  }

  form.setFieldValue('imageUrl', imageUrl || '/placeholder.jpg');
  await form.validateField('imageUrl', 'change');
};
```

## Submission Integration

Use async `onSubmit` in `useAppForm` as the submission boundary. This is the default for full-page forms and small product forms alike.

TanStack Form already handles the submission lifecycle for you:

- `onSubmit` can be async.
- The form enters `isSubmitting` while the request is in flight.
- `form.SubmitButton` reflects that pending state automatically.
- Success and error toasts should be handled around the async call.

### Default: Submit directly to Convex

Call a Convex mutation or action from `onSubmit` when the form writes application data.

```typescript
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const createEntity = useMutation(api.entities.create);

const form = useAppForm({
  onSubmit: async ({ value }) => {
    await createEntity(value);
    toast.success('Saved!');
  },
});
```

This is the preferred approach because:

- Convex is the primary backend write layer.
- The form stays explicit and easy to follow.
- Loading state comes from TanStack Form rather than an extra abstraction.
- It works equally well for large forms and small dialogs.

### Error handling

Handle submission failures inside `onSubmit` so the UI can show useful feedback.

```typescript
const form = useAppForm({
  onSubmit: async ({ value }) => {
    try {
      await saveMutation(value);
      toast.success('Saved!');
    } catch (error) {
      toast.error('Failed to save');
    }
  },
});
```

Prefer user-friendly toast messages and keep field-level validation in the form schema or validators.

### Optional: Use TanStack Query for richer mutation workflows

If the form needs cache invalidation, optimistic UI, or centralized mutation lifecycle callbacks, wrap the Convex call in a TanStack Query mutation and call `mutateAsync` from `onSubmit`.

```typescript
import { useMutation } from '@tanstack/react-query';

const save = useMutation({
  mutationFn: (input: FormValues) => convexMutation(input),
  onSuccess: () => toast.success('Saved!'),
  onError: () => toast.error('Failed to save'),
});

const form = useAppForm({
  onSubmit: async ({ value }) => {
    await save.mutateAsync(value);
  },
});
```

Use this pattern when the submission needs to coordinate with other cached data on the page.

### When to use a TanStack Start server function

Use `createServerFn` only when the submission must go through the app server first, for example:

- Access to request headers or cookies.
- Server-only secrets.
- Orchestration across multiple backends.
- Server-side preprocessing that does not belong in the client.

Even in those cases, keep `useAppForm` as the form entry point and call the server function from `onSubmit`.

```typescript
import { createServerFn } from '@tanstack/react-start';

export const submitOnServer = createServerFn({ method: 'POST' }).handler(
  async ({ data }) => {
    return await doServerOnlyWork(data);
  }
);

const form = useAppForm({
  onSubmit: async ({ value }) => {
    await submitOnServer({ data: value });
  },
});
```

## Form Layout & Spacing

Consistent spacing is key to the form system's "good design":

- **Grid**: Use `grid grid-cols-1 md:grid-cols-2 gap-6` for two-column layouts.
- **Grouping**: Use `FieldGroup` to wrap related fields with a top/bottom border if they form a logical section.
- **Alignment**: Align the `SubmitButton` to the right using `flex justify-end pt-6`.

## Focus Management

Focus management is handled by `focusFirstError` utility.

1.  Each field component uses `id={name}`.
2.  `onSubmitInvalid` calls `focusFirstError(formApi)`.
3.  `focusFirstError` finds the field name, finds the element by ID, and scrolls/focuses.

**Note**: You no longer need `withFocusManagement` HOC if you use the `focusFirstError` from `@/hooks/use-form`.

## Anti-Patterns

1.  **Direct DOM Manipulation**: Don't try to focus elements manually; use `focusFirstError`.
2.  **Hardcoded Options**: Move reusable field options to `schemas` or `constants`.
3.  **Complex Inline Logic**: Use `form.Subscribe` for complex conditional field logic rather than nested ternaries in the main render.
4.  **Implicit Submission**: Always wrap `form.handleSubmit()` in an explicit handler that prevents default events.
5.  **Missing Field Names**: Ensure `name` on `AppField` matches the Zod schema exactly.
6.  **Neglecting Mobile**: Always test forms with `grid-cols-1` for mobile responsiveness.
7.  **Choosing raw `useForm` just because the form is small**: Small product forms should still use `useAppForm` unless they are intentionally low-level or outside repository conventions.
8.  **Assuming Next.js-style Server Actions**: Do not default to `useServerAction` patterns in this TanStack Start + Convex app.
