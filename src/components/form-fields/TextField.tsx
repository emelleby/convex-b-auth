import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useFieldContext } from '@/hooks/form-context'

interface TextFieldProps {
	hidden?: boolean
	label: string
	description?: string
	placeholder?: string
	disabled?: boolean
	type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'number'
	autoComplete?: string
}

export function TextField({
	hidden,
	label,
	description,
	placeholder,
	disabled,
	type = 'text',
	autoComplete,
}: TextFieldProps) {
	const field = useFieldContext<string>()
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

	return (
		<Field data-invalid={isInvalid} hidden={hidden}>
			<FieldLabel htmlFor={field.name}>{label}</FieldLabel>
			<Input
				id={field.name}
				name={field.name}
				type={type}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(e) => {
					const rawValue = e.target.value
					const value =
						type === 'number' && rawValue !== '' ? Number(rawValue) : rawValue
					field.handleChange(value as any)
				}}
				aria-invalid={isInvalid}
				placeholder={placeholder}
				disabled={disabled}
				autoComplete={autoComplete}
			/>
			{description && <FieldDescription>{description}</FieldDescription>}
			{isInvalid && <FieldError errors={field.state.meta.errors} />}
		</Field>
	)
}
