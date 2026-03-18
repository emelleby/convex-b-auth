import { createFormHook, revalidateLogic, useStore } from '@tanstack/react-form'
import type { VariantProps } from 'class-variance-authority'
import * as React from 'react'
import {
	ComboboxField,
	CountryField,
	NumberField,
	SelectField,
	SwitchField,
	TextareaField,
	TextField
} from '@/components/form-fields'
import {
	FormButtons,
	StepButton,
	SubmitButton
} from '@/components/form-fields/form-buttons'
import {
	Field as DefaultField,
	FieldError as DefaultFieldError,
	FieldSet as DefaultFieldSet,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSeparator,
	FieldTitle,
	type fieldVariants
} from '@/components/ui/field'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput
} from '@/components/ui/input-group'
import {
	useFieldContext as _useFieldContext,
	fieldContext,
	formContext,
	useFormContext
} from '@/hooks/form-context'
import { cn } from '@/lib/utils'

const { useAppForm, withForm, withFieldGroup } = createFormHook({
	fieldContext,
	formContext,
	fieldComponents: {
		Field,
		FieldError,
		FieldSet,
		FieldContent,
		FieldDescription,
		FieldGroup,
		FieldLabel,
		FieldLegend,
		FieldSeparator,
		FieldTitle,
		InputGroup,
		InputGroupAddon,
		InputGroupInput,
		TextField,
		SelectField,
		TextareaField,
		CountryField,
		SwitchField,
		ComboboxField,
		NumberField
	},
	formComponents: {
		SubmitButton,
		StepButton,
		FieldLegend,
		FieldDescription,
		FieldSeparator,
		Form
	}
})

type FormItemContextValue = {
	id: string
}

const FormItemContext = React.createContext<FormItemContextValue>(
	{} as FormItemContextValue
)

function FieldSet({
	className,
	children,
	...props
}: React.ComponentProps<'fieldset'>) {
	const id = React.useId()

	return (
		<FormItemContext.Provider value={{ id }}>
			<DefaultFieldSet className={cn('grid gap-1', className)} {...props}>
				{children}
			</DefaultFieldSet>
		</FormItemContext.Provider>
	)
}

const useFieldContext = () => {
	const { id } = React.useContext(FormItemContext)
	const { name, store, ...fieldContext } = _useFieldContext()

	const errors = useStore(store, (state: any) => state.meta.errors)
	if (!fieldContext) {
		throw new Error('useFieldContext should be used within <FormItem>')
	}

	return {
		id,
		name,
		formItemId: `${id}-form-item`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		errors,
		store,
		...fieldContext
	}
}

function Field({
	children,
	...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
	const {
		errors,
		formItemId,
		formDescriptionId,
		formMessageId,
		handleBlur,
		store
	} = useFieldContext()
	const isTouched = useStore(store, (state: any) => state.meta.isTouched)
	const hasVisibleErrors = !!errors.length && isTouched

	return (
		<DefaultField
			data-invalid={hasVisibleErrors}
			id={formItemId}
			onBlur={handleBlur}
			aria-describedby={
				!hasVisibleErrors
					? `${formDescriptionId}`
					: `${formDescriptionId} ${formMessageId}`
			}
			aria-invalid={hasVisibleErrors}
			{...props}
		>
			{children}
		</DefaultField>
	)
}

function FieldError({ className, ...props }: React.ComponentProps<'p'>) {
	const { errors, formMessageId, store } = useFieldContext()
	const isTouched = useStore(store, (state: any) => state.meta.isTouched)
	const body = errors.length ? String(errors.at(0)?.message ?? '') : ''
	if (!body || !isTouched) return null
	return (
		<DefaultFieldError
			data-slot="form-message"
			id={formMessageId}
			className={cn('text-destructive text-sm', className)}
			{...props}
			errors={body ? [{ message: body }] : []}
		/>
	)
}

function Form({
	children,
	...props
}: Omit<React.ComponentPropsWithoutRef<'form'>, 'onSubmit' & 'noValidate'> & {
	children?: React.ReactNode
}) {
	const form = useFormContext()
	const handleSubmit = React.useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault()
			e.stopPropagation()
			form.handleSubmit()
		},
		[form]
	)
	return (
		<form
			onSubmit={handleSubmit}
			className={cn(
				'flex flex-col p-2 md:p-5 w-full mx-auto gap-2',
				props.className
			)}
			noValidate
			{...props}
		>
			{children}
		</form>
	)
}

export { FormButtons, StepButton, SubmitButton }

export {
	revalidateLogic,
	useAppForm,
	useFieldContext,
	useFormContext,
	withFieldGroup,
	withForm
}
