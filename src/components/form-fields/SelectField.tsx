import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { useFieldContext } from '@/hooks/form-context'

interface SelectFieldProps {
	label: string
	description?: string
	placeholder?: string
	disabled?: boolean
	options: Array<{ label: string; value: string }>
	orientation?: 'horizontal' | 'vertical' | 'responsive'
}

export function SelectField({
	label,
	description,
	placeholder = 'Select',
	disabled,
	options,
	orientation = 'vertical',
}: SelectFieldProps) {
	const field = useFieldContext<string>()
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

	return (
		<Field orientation={orientation} data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Select
				name={field.name}
				value={field.state.value}
				onValueChange={field.handleChange}
				disabled={disabled}
			>
				<SelectTrigger id={field.name} aria-invalid={isInvalid}>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<FieldContent>
				{description && <FieldDescription>{description}</FieldDescription>}
				{isInvalid && <FieldError errors={field.state.meta.errors} />}
			</FieldContent>
		</Field>
	)
}
