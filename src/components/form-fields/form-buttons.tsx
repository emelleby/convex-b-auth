import type { VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import * as React from 'react'
import { Button, type buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useFormContext } from '@/hooks/form-context'

export function SubmitButton({
	label,
	className,
	size,
	...props
}: React.ComponentProps<'button'> &
	VariantProps<typeof buttonVariants> & {
		label: string
	}) {
	const form = useFormContext()
	return (
		<form.Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Button
					className={className}
					size={size}
					type="submit"
					disabled={isSubmitting}
					{...props}
				>
					{isSubmitting && <Spinner />}
					{label}
				</Button>
			)}
		</form.Subscribe>
	)
}

export function StepButton({
	label,
	handleMovement,
	...props
}: React.ComponentProps<'button'> &
	VariantProps<typeof buttonVariants> & {
		label: React.ReactNode | string
		handleMovement: () => void
	}) {
	return (
		<Button
			size="sm"
			variant="ghost"
			type="button"
			onClick={handleMovement}
			{...props}
		>
			{label}
		</Button>
	)
}

interface FormButtonsProps {
	status: 'draft' | 'submitted'
	isSaving: boolean
	onSaveDraft: () => void
	onSubmit: () => void
	onReopen: () => void
}

export function FormButtons({
	status,
	isSaving,
	onSaveDraft,
	onSubmit,
	onReopen,
}: FormButtonsProps) {
	if (status === 'submitted') {
		return (
			<div className="flex justify-end pt-6">
				<Button
					type="button"
					variant="outline"
					onClick={onReopen}
					disabled={isSaving}
				>
					{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
					Reopen Form
				</Button>
			</div>
		)
	}

	return (
		<div className="flex justify-end gap-4 pt-6">
			<Button
				type="button"
				variant="outline"
				onClick={onSaveDraft}
				disabled={isSaving}
			>
				{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
				Save Draft
			</Button>
			<Button type="button" onClick={onSubmit} disabled={isSaving}>
				{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
				Submit
			</Button>
		</div>
	)
}
