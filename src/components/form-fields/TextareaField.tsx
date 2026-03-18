import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { useFieldContext } from '@/hooks/form-context'

interface TextareaFieldProps {
	label: string
	description?: string
	placeholder?: string
	disabled?: boolean
	rows?: number
	className?: string
}

export function TextareaField({
	label,
	description,
	placeholder,
	disabled,
	rows = 3,
	className,
}: TextareaFieldProps) {
	const field = useFieldContext<string>()
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Textarea
				id={field.name}
				name={field.name}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				aria-invalid={isInvalid}
				placeholder={placeholder}
				disabled={disabled}
				rows={rows}
				className={className}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	)
}
